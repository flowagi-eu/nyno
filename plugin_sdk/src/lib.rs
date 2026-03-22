#[warn(unused_imports)]
use serde::Serialize;

#[warn(unused_imports)]
use serde_json::{Value, json};

use std::alloc::{alloc as std_alloc, dealloc as std_dealloc, Layout};

pub trait NynoPlugin {
    fn run(&self, args: Vec<Value>, context: &mut Value) -> i32;
}

#[unsafe(no_mangle)]
pub extern "C" fn alloc(len: usize) -> *mut u8 {
    let layout = Layout::from_size_align(len, 8).unwrap();
    unsafe { std_alloc(layout) }
}

#[unsafe(no_mangle)]
pub extern "C" fn dealloc(ptr: *mut u8, len: usize) {
    let layout = Layout::from_size_align(len, 8).unwrap();
    unsafe { std_dealloc(ptr, layout) }
}

#[macro_export]
macro_rules! export_plugin {
    ($plugin:ty) => {
        #[unsafe(no_mangle)]
        pub extern "C" fn run(ptr: u32, len: u32) -> u64 {
            let input_bytes =
                unsafe { std::slice::from_raw_parts(ptr as *const u8, len as usize) };

            let input: Value = match serde_json::from_slice(input_bytes) {
                Ok(v) => v,
                Err(_) => return $crate::pack_ptr_len(0, 0),
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

            let plugin = <$plugin>::default();

            let result_code = plugin.run(args, &mut context);

            let output = json!([result_code, context]);

            let bytes = match serde_json::to_vec(&output) {
                Ok(b) => b,
                Err(_) => return $crate::pack_ptr_len(0, 0),
            };

            unsafe {
                let out_ptr = $crate::alloc(bytes.len());
                if out_ptr.is_null() {
                    return $crate::pack_ptr_len(0, 0);
                }

                std::ptr::copy_nonoverlapping(
                    bytes.as_ptr(),
                    out_ptr,
                    bytes.len(),
                );

                $crate::pack_ptr_len(out_ptr as u32, bytes.len() as u32)
            }
        }
    };
}

/// Pack pointer + length into u64 (low 32 bits = ptr, high 32 bits = len)
pub fn pack_ptr_len(ptr: u32, len: u32) -> u64 {
    ((len as u64) << 32) | (ptr as u64)
}
