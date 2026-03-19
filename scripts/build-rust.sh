#!/bin/bash
set -e

# Build plugin_sdk (rlib)
cd plugin_sdk
cargo build --release
mkdir -p ../build

cd ..

cd example-plugin3
cargo build --release --target wasm32-unknown-unknown
cp target/wasm32-unknown-unknown/release/plugin3.wasm ../extensions/nyno-py/command.wasm

cd ..


cd example-plugin2
cargo build --release --target wasm32-unknown-unknown
cp target/wasm32-unknown-unknown/release/plugin2.wasm ../extensions/nyno-ml-train-predict2/command.wasm

cd ..

