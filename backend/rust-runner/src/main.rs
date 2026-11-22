
use anyhow::{anyhow, bail, Context, Result};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::env;
use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};

use wasmtime::component::{Component, Instance, Linker, ResourceTable, Val};
use wasmtime::{Engine, Store};

use wasmtime_wasi::p2::pipe::MemoryOutputPipe;
use wasmtime_wasi::{WasiCtx, WasiCtxBuilder, WasiCtxView, WasiView};

// ---------------------------------------------------------------------------
// WASI state
// ---------------------------------------------------------------------------

struct MyWasiCtx {
    wasi: WasiCtx,
    table: ResourceTable,
}

impl WasiView for MyWasiCtx {
    fn ctx(&mut self) -> WasiCtxView<'_> {
        WasiCtxView {
            ctx: &mut self.wasi,
            table: &mut self.table,
        }
    }
}

// ---------------------------------------------------------------------------
// Application state
// ---------------------------------------------------------------------------

struct AppState {
    extensions: HashMap<String, Arc<Component>>,
    engine: Engine,
    in_flight: AtomicUsize,
}

// ---------------------------------------------------------------------------
// Load precompiled WASI P2 components
// ---------------------------------------------------------------------------

fn load_extensions(
    engine: &Engine,
    dirs: &[PathBuf],
) -> Result<HashMap<String, Arc<Component>>> {
    let mut extensions = HashMap::new();

    for dir in dirs {
        let entries = match std::fs::read_dir(dir) {
            Ok(entries) => entries,
            Err(error) => {
                eprintln!(
                    "[Runner] Cannot read extension directory {}: {}",
                    dir.display(),
                    error
                );
                continue;
            }
        };

        for entry in entries.flatten() {
            let ext_dir = entry.path();

            if !ext_dir.is_dir() {
                continue;
            }

            let wasmc_path = ext_dir.join("command.wasmc");

            if !wasmc_path.is_file() {
                continue;
            }

            let Some(name) = ext_dir
                .file_name()
                .and_then(|s| s.to_str())
            else {
                continue;
            };

            println!("[Runner] Loading precompiled: {}", name);

            // SAFETY:
            // Only deserialize trusted artifacts produced for a compatible
            // Wasmtime version and Engine configuration.
            let component = unsafe {
                Component::deserialize_file(engine, &wasmc_path)
            }
            .map_err(|e| {
                anyhow!(
                    "Failed to deserialize component {}: {}",
                    wasmc_path.display(),
                    e
                )
            })?;

            extensions.insert(
                name.to_string(),
                Arc::new(component),
            );

            println!("[Runner] Loaded: {}", name);
        }
    }

    Ok(extensions)
}

// ---------------------------------------------------------------------------
// Run cached WASI P2 component
// ---------------------------------------------------------------------------

fn run_wasm_sync(
    engine: &Engine,
    component: &Component,
    args: &Value,
    ctx: &Value,
) -> Result<Value> {
    const OUTPUT_CAPACITY: usize = 64 * 1024 * 1024;

    let input = json!({
        "args": args,
        "context": ctx
    });

    let input_json = serde_json::to_string(&input)?;

    let stdout = MemoryOutputPipe::new(OUTPUT_CAPACITY);
    let stderr = MemoryOutputPipe::new(OUTPUT_CAPACITY);

    let mut wasi_builder = WasiCtxBuilder::new();

    wasi_builder
        .stdout(stdout.clone())
        .stderr(stderr.clone())
        .arg("command")
        .arg(&input_json);

    let wasi = wasi_builder.build();

    let state = MyWasiCtx {
        wasi,
        table: ResourceTable::new(),
    };

    let mut linker = Linker::<MyWasiCtx>::new(engine);

    wasmtime_wasi::p2::add_to_linker_sync(&mut linker)
        .map_err(|e| anyhow!("failed to configure WASI linker: {e}"))?;

    let mut store = Store::new(engine, state);

    let instance: Instance = linker
        .instantiate(&mut store, component)
        .map_err(|e| anyhow!("failed to instantiate component: {e}"))?;

    let run_interface_index = instance
        .get_export_index(
            &mut store,
            None,
            "wasi:cli/run@0.2.0",
        )
        .context("component does not export wasi:cli/run@0.2.0")?;

    let run_function_index = instance
        .get_export_index(
            &mut store,
            Some(&run_interface_index),
            "run",
        )
        .context("no run() function in wasi:cli/run@0.2.0")?;

    let run_func = instance
        .get_func(&mut store, &run_function_index)
        .context("could not get wasi:cli/run@0.2.0 run() function")?;

    let mut results = vec![Val::Result(Ok(None))];

    run_func
        .call(&mut store, &[], &mut results)
        .map_err(|e| anyhow!("WASM run() trapped: {e}"))?;

    if let Some(Val::Result(Err(_))) = results.first() {
        bail!("WASM run() returned an error");
    }

    // Plugin stdout format: [status, data]
    let output_bytes = stdout.contents();

    let result: Value = serde_json::from_slice(&output_bytes)
        .context("WASM stdout was not valid JSON")?;

    let arr = result
        .as_array()
        .context("Expected [status, data] from WASM")?;

    if arr.len() != 2 {
        bail!("Invalid WASM output: expected [status, data]");
    }

    Ok(json!({
        "r": arr[0],
        "c": arr[1]
    }))
}

// ---------------------------------------------------------------------------
// TCP framing: 4-byte big-endian length + MessagePack
// ---------------------------------------------------------------------------

async fn read_frame(
    rd: &mut tokio::net::tcp::OwnedReadHalf,
) -> Result<Option<(Value, (String, Value))>> {
    let mut len_buf = [0u8; 4];

    match rd.read_exact(&mut len_buf).await {
        Ok(_) => {}
        Err(e) if e.kind() == std::io::ErrorKind::UnexpectedEof => {
            return Ok(None);
        }
        Err(e) => return Err(e.into()),
    }

    let len = u32::from_be_bytes(len_buf) as usize;

    let mut buf = vec![0u8; len];

    rd.read_exact(&mut buf).await?;

    let frame: (Value, (String, Value)) =
        rmp_serde::from_slice(&buf)?;

    Ok(Some(frame))
}

async fn write_frame(
    wr: &mut tokio::net::tcp::OwnedWriteHalf,
    msg_id: &Value,
    result: &Value,
) -> Result<()> {
    let frame = (msg_id, result);

    let body = rmp_serde::to_vec(&frame)?;

    wr.write_all(&(body.len() as u32).to_be_bytes())
        .await?;

    wr.write_all(&body).await?;

    Ok(())
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

async fn handle_message(
    state: &Arc<AppState>,
    msg_type: &str,
    data: &Value,
) -> Value {
    match msg_type {
        "ping" => {
            json!({
                "pong": true,
                "echo": data
            })
        }

        "echo" => {
            json!({
                "result": data
            })
        }

        "info" => {
            json!({
                "status": "ok",
                "extensions": state.extensions.keys().collect::<Vec<_>>(),
                "in_flight": state.in_flight.load(Ordering::Relaxed)
            })
        }

        "q" => {
            json!({
                "status": "OK",
                "count": state.in_flight.load(Ordering::Relaxed)
            })
        }

        "r" => {
            let fn_name = data
                .get("functionName")
                .and_then(Value::as_str)
                .unwrap_or("");

            let args = data
                .get("args")
                .cloned()
                .unwrap_or(Value::Null);

            let context = data
                .get("context")
                .cloned()
                .unwrap_or_else(|| json!({}));

            let component = match state.extensions.get(fn_name) {
                Some(component) => component.clone(),
                None => {
                    return json!({
                        "fnError": "not exist",
                        "c": context
                    });
                }
            };

            let engine = state.engine.clone();

            // Keep the original context available for error responses.
            let execution_context = context.clone();

            state.in_flight.fetch_add(1, Ordering::Relaxed);

            let join = tokio::task::spawn_blocking(move || {
                run_wasm_sync(
                    &engine,
                    &component,
                    &args,
                    &execution_context,
                )
            })
            .await;

            state.in_flight.fetch_sub(1, Ordering::Relaxed);

            match join {
                Ok(Ok(value)) => {
                    json!({
                        "status": "OK",
                        "r": value["r"],
                        "c": value["c"]
                    })
                }

                Ok(Err(error)) => {
                    json!({
                        "status": "ERR",
                        "error": format!("{:#}", error),
                        "c": context
                    })
                }

                Err(error) => {
                    json!({
                        "status": "ERR",
                        "error": format!("join: {}", error),
                        "c": context
                    })
                }
            }
        }

        _ => {
            json!({
                "error": format!("unknown type: {}", msg_type)
            })
        }
    }
}

// ---------------------------------------------------------------------------
// Client connection loop
// ---------------------------------------------------------------------------

async fn handle_client(
    stream: TcpStream,
    state: Arc<AppState>,
    secret: String,
) {
    let (mut rd, mut wr) = stream.into_split();

    let mut authenticated = false;

    loop {
        let frame = match read_frame(&mut rd).await {
            Ok(Some(frame)) => frame,
            Ok(None) => break,
            Err(error) => {
                eprintln!("[Runner] Read error: {:#}", error);
                break;
            }
        };

        let (msg_id, (msg_type, data)) = frame;

        // Authentication
        if msg_type == "c" {
            let ok = data
                .get("secret")
                .and_then(Value::as_str)
                == Some(secret.as_str());

            if ok {
                authenticated = true;

                let _ = write_frame(
                    &mut wr,
                    &msg_id,
                    &json!({ "ok": true }),
                )
                .await;

                println!("[Runner] AUTH OK");
            } else {
                let _ = write_frame(
                    &mut wr,
                    &msg_id,
                    &json!({
                        "ok": false,
                        "error": "auth failed"
                    }),
                )
                .await;

                break;
            }

            continue;
        }

        if !authenticated {
            let _ = write_frame(
                &mut wr,
                &msg_id,
                &json!({
                    "error": "not authenticated"
                }),
            )
            .await;

            continue;
        }

        let result = handle_message(
            &state,
            &msg_type,
            &data,
        )
        .await;

        if write_frame(&mut wr, &msg_id, &result)
            .await
            .is_err()
        {
            break;
        }
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

#[tokio::main]
async fn main() -> Result<()> {
    let _ = dotenvy::dotenv();

    let host = env::var("HOST")
        .unwrap_or_else(|_| "0.0.0.0".into());

    let port: u16 = env::var("PY")
        .or_else(|_| env::var("NYNO_WASM_PORT"))
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(9097);

    let secret = env::var("SECRET_NYNO_API_KEY")
        .unwrap_or_else(|_| "changeme".into());


let cwd = env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
let default_ext_dirs = vec![
    cwd.join("backend").join("extensions"),
    cwd.join("my-extensions"),
];

let ext_dirs: Vec<PathBuf> = match env::var("NYNO_CORE_PLUGINS_DIRS") {
    Ok(value) => serde_json::from_str::<Vec<String>>(&value)
        .unwrap_or_default()
        .into_iter()
        .map(PathBuf::from)
        .collect(),
    Err(_) => default_ext_dirs,
};


    println!("[Runner] Extension directories: {:?}", ext_dirs);

    // Create engine once.
    let engine = Engine::default();

    // Load precompiled components once.
    let extensions = load_extensions(&engine, &ext_dirs)?;

    println!(
        "[Runner] Loaded {} precompiled extensions: {:?}",
        extensions.len(),
        extensions.keys().collect::<Vec<_>>()
    );

    let state = Arc::new(AppState {
        extensions,
        engine,
        in_flight: AtomicUsize::new(0),
    });

    let addr = format!("{}:{}", host, port);

    let listener = TcpListener::bind(&addr).await?;

    println!(
        "[Runner] WASI P2 runner listening at tcp://{}",
        addr
    );

    loop {
        let (stream, _) = listener.accept().await?;

        let state = state.clone();
        let secret = secret.clone();

        tokio::spawn(async move {
            handle_client(stream, state, secret).await;
        });
    }
}

