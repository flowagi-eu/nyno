
use serde_json::{Map, Value};

#[macro_export]
macro_rules! j {
    ($($key:ident : $value:expr),* $(,)?) => {{
        let mut map = $crate::__private::serde_json::Map::new();

        $(
            map.insert(
                stringify!($key).to_string(),
                $crate::__private::serde_json::json!($value),
            );
        )*

        map
    }};
}

#[doc(hidden)]
pub mod __private {
    pub use serde_json;
}

pub type PluginResult = (i32, Map<String, Value>);

pub trait Plugin {
    fn execute(args: Value, context: Value) -> PluginResult;
}

pub fn run<P: Plugin>() {
    let input = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "{}".to_string());

    let input: Value = serde_json::from_str(&input)
        .unwrap_or_else(|_| Value::Object(Map::new()));

    // Pass the entire plugin invocation argument array.
    let args = input
        .get("args")
        .cloned()
        .unwrap_or(Value::Null);

    let context = input
        .get("context")
        .cloned()
        .unwrap_or(Value::Null);

    let (status, data) = P::execute(args, context);

    println!("{}", serde_json::json!([status, data]));
}

