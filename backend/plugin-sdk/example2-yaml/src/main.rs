
use plugin_sdk::{Plugin, PluginResult, j};
use serde_json::Value;

struct MyPlugin;

impl Plugin for MyPlugin {
    fn execute(args: Value, _context: Value) -> PluginResult {
        let action = args[0].as_str().unwrap_or("load");

        let result: Result<Value, String> = match action {
            "load" => {
                let input = args[1].as_str().unwrap_or("");

                noyalib::from_str::<Value>(input)
                    .map_err(|e| e.to_string())
            }

            "dump" => {
                noyalib::to_string(&args[1])
                    .map(Value::String)
                    .map_err(|e| e.to_string())
            }

            _ => Err("Unknown action".to_string()),
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

