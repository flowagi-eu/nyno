Place custom extensions in this folder.

Extensions need their own directory (eg. my-new-extension) and a command.js file or any other supported command file such as command.wasm (WASI P2) or command.py (Python3) or command.jt (type safe).

# Rust/WASM
See `nyno/backend/plugin-sdk/example/` and example2 + example3.

For the building:

1. Add your project to the workspace:
```
vim backend/plugin-sdk/Cargo.toml 
```

2. Run Build WASM
```
cd backend/plugin-sdk
bash buildwasm.sh`
```

# JS
See `backend/extensions` for examples.

## Python
See `backend/python-sdk/examples`

For more information see [https://nyno.dev/](https://nyno.dev)
