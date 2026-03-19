// plugin_sdk/src/lib.rs
#[allow(unused_imports)]
use serde::Serialize;
#[allow(unused_imports)]
use serde_json::{Value, json};

/// Trait that all plugins must implement.
/// Returns an integer result code. All outputs go via mutable context.
pub trait NynoPlugin {
    fn run(&self, args: Vec<Value>, context: &mut Value) -> i32;
}

/// Macro to export a plugin as a WASM-compatible function.
#[macro_export]
macro_rules! export_plugin {
    ($plugin:ty) => {
	#[unsafe(no_mangle)]
        pub extern "C" fn run(ptr: u32, len: u32, out_ptr: u32) {
            // Convert pointer/length to Rust slice
            let input_bytes = unsafe { std::slice::from_raw_parts(ptr as *const u8, len as usize) };

            // Parse JSON input
            let input: Value = match serde_json::from_slice(input_bytes) {
                Ok(v) => v,
                Err(_) => return $crate::write_output(out_ptr as usize, json!({"error":"invalid JSON"})),
            };

let args = input
    .get(0)
    .and_then(|v| v.as_array())
    .cloned()
    .unwrap_or_default();

let mut context = input
    .get(1)
    .cloned()
    .unwrap_or(json!({}));

            // Instantiate plugin
            let plugin = <$plugin>::default();

            // Call plugin -> returns i32 result code
            let result_code = plugin.run(args, &mut context);

            // Write output back to WASM memory
	    $crate::write_output(out_ptr as usize, json!([result_code, context]));



        }
    };
}

/// Safe write_output function
pub fn write_output(out_ptr: usize, value: impl Serialize) {
    let bytes = match serde_json::to_vec(&value) {
        Ok(b) => b,
        Err(_) => return,
    };
    let offset = out_ptr + 16;
    let len = bytes.len();

    unsafe {
        let mem = std::slice::from_raw_parts_mut(offset as *mut u8, len);
        mem.copy_from_slice(&bytes);

        let out_mem = std::slice::from_raw_parts_mut(out_ptr as *mut u8, 8);
        out_mem[0..4].copy_from_slice(&(offset as u32).to_le_bytes());
        out_mem[4..8].copy_from_slice(&(len as u32).to_le_bytes());
    }
}
