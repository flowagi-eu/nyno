
use anyhow::{ Context, Result};
use std::{env, path::PathBuf};
use wasmtime::{component::Component, Engine};

fn main() -> Result<()> {
    let _ = dotenvy::dotenv();

    // Read plugin directories from the environment.
    let dirs_json = env::var("NYNO_CORE_PLUGINS_DIRS")
        .context("NYNO_CORE_PLUGINS_DIRS is missing")?;

    let dirs: Vec<String> = serde_json::from_str(&dirs_json)
        .context("NYNO_CORE_PLUGINS_DIRS must be a JSON array of directory paths")?;

    // Use the same engine configuration as the runner.
    let engine = Engine::default();

    let mut compiled = 0usize;
    let mut skipped = 0usize;
    let mut failed = 0usize;

    for dir in dirs {
        let dir = PathBuf::from(dir);

        println!("\n[Precompile] Scanning: {}", dir.display());

        let entries = match std::fs::read_dir(&dir) {
            Ok(entries) => entries,
            Err(e) => {
                eprintln!(
                    "[Precompile] Cannot read directory {}: {}",
                    dir.display(),
                    e
                );
                failed += 1;
                continue;
            }
        };

        for entry in entries.flatten() {
            let ext_dir = entry.path();

            if !ext_dir.is_dir() {
                continue;
            }

            let wasm = ext_dir.join("command.wasm");
            let wasmc = ext_dir.join("command.wasmc");

            // Only process extensions containing command.wasm.
            if !wasm.is_file() {
                continue;
            }

            let name = ext_dir
                .file_name()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown");

            // Skip if the compiled component already exists.
            if wasmc.is_file() {
                println!(
                    "[Precompile] Skipping {} (command.wasmc already exists)",
                    name
                );
                skipped += 1;
                continue;
            }

            println!("[Precompile] Compiling: {}", name);

            // Compile the WASI component.
            let component = match Component::from_file(&engine, &wasm) {
                Ok(component) => component,
                Err(e) => {
                    eprintln!(
                        "[Precompile] Failed to compile {}: {}",
                        wasm.display(),
                        e
                    );
                    failed += 1;
                    continue;
                }
            };

            // Serialize it into a Wasmtime compiled artifact.
            let artifact = match component.serialize() {
                Ok(artifact) => artifact,
                Err(e) => {
                    eprintln!(
                        "[Precompile] Failed to serialize {}: {}",
                        wasm.display(),
                        e
                    );
                    failed += 1;
                    continue;
                }
            };

            // Write command.wasmc.
            if let Err(e) = std::fs::write(&wasmc, artifact) {
                eprintln!(
                    "[Precompile] Failed to write {}: {}",
                    wasmc.display(),
                    e
                );
                failed += 1;
                continue;
            }

            println!("[Precompile] Created: {}", wasmc.display());
            compiled += 1;
        }
    }

    println!("\n========== Precompile Summary ==========");
    println!("Compiled: {}", compiled);
    println!("Skipped:  {}", skipped);
    println!("Failed:   {}", failed);
    println!("========================================");

    Ok(())
}

