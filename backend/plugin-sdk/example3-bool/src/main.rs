
use plugin_sdk::{Plugin, PluginResult, j};
use serde_json::Value;

struct MyPlugin;

fn unpack(input: &Value) -> Result<Value, String> {
    let values = input
        .as_array()
        .ok_or("Expected an array of bytes")?;

    let bytes: Vec<u8> = values
        .iter()
        .map(|v| {
            v.as_u64()
                .and_then(|n| u8::try_from(n).ok())
                .ok_or("Byte must be between 0 and 255".to_string())
        })
        .collect::<Result<_, _>>()?;

    let bits: Vec<Value> = bytes
        .iter()
        .flat_map(|byte| {
            (0..8).map(move |i| {
                Value::Bool((byte & (1 << i)) != 0)
            })
        })
        .collect();

    Ok(Value::Array(bits))
}

fn pack(input: &Value) -> Result<Value, String> {
    let values = input
        .as_array()
        .ok_or("Expected an array of booleans")?;

    if values.len() % 8 != 0 {
        return Err("Boolean count must be divisible by 8".into());
    }

    let bits: Vec<bool> = values
        .iter()
        .map(|v| {
            v.as_bool()
                .ok_or("Expected boolean values".to_string())
        })
        .collect::<Result<_, _>>()?;

    let bytes: Vec<Value> = bits
        .chunks(8)
        .map(|chunk| {
            let byte = chunk.iter().enumerate().fold(
                0u8,
                |acc, (i, bit)| acc | ((*bit as u8) << i)
            );

            Value::from(byte)
        })
        .collect();

    Ok(Value::Array(bytes))
}

impl Plugin for MyPlugin {
    fn execute(args: Value, _context: Value) -> PluginResult {
        let action = args[0].as_str().unwrap_or("pack");
        let input = &args[1];

        let result = match action {
            "pack" => pack(input),
            "unpack" => unpack(input),
            _ => Err("Unknown action. Use pack or unpack.".into()),
        };

        match result {
            Ok(value) => (0, j! {
                prev: value
            }),
            Err(error) => (1, j! {
                error: error
            }),
        }
    }
}

fn main() {
    plugin_sdk::run::<MyPlugin>();
}

