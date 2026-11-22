use plugin_sdk::{Plugin, PluginResult, j};
use serde_json::Value;

struct MyPlugin;

impl Plugin for MyPlugin {
    fn execute(args: Value, _context: Value) -> PluginResult {
        let name = args["data"].as_str().unwrap_or("world");

        (0, j! {
            prev: format!("Hello, {name}!")
        })
    }
}

fn main() {
    plugin_sdk::run::<MyPlugin>();
}
