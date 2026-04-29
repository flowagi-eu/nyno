use serde::{Serialize, Deserialize};
use std::alloc::{alloc as std_alloc, dealloc as std_dealloc, Layout};
use rmpv::Value;
use rmp_serde as rmps;

#[derive(Serialize, Deserialize)]
pub struct Input {
    pub args: Value,
    pub context: Value,
}

#[derive(Serialize, Deserialize)]
pub struct Output {
    pub result_code: i32,
    pub context: Value,
}

pub trait NynoPlugin {
    fn run(&self, args: Value, context: &mut Value) -> i32;
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

pub fn pack_ptr_len(ptr: u32, len: u32) -> u64 {
    ((len as u64) << 32) | (ptr as u64)
}

#[macro_export]
macro_rules! export_plugin {
    ($plugin:ty) => {
        #[unsafe(no_mangle)]
        pub extern "C" fn run(ptr: u32, len: u32) -> u64 {
            let input_bytes =
                unsafe { std::slice::from_raw_parts(ptr as *const u8, len as usize) };

            let input: $crate::Input = match rmp_serde::from_slice(input_bytes) {
                Ok(v) => v,
                Err(_) => return $crate::pack_ptr_len(0, 0),
            };

            let mut context = input.context;
            let args = input.args;

            let plugin = <$plugin>::default();

            let result_code = plugin.run(args, &mut context);

            let output = $crate::Output {
                result_code,
                context,
            };

            let bytes = match rmp_serde::to_vec(&output) {
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
