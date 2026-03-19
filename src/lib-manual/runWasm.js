import fs from "fs";

export async function loadWasm(path) {
  const wasmBytes = fs.readFileSync(path);
  const { instance } = await WebAssembly.instantiate(wasmBytes, {});
  return instance;
}

export async function runWasm(instance, args,context) {
  const memory = instance.exports.memory;
  const memBuffer = new Uint8Array(memory.buffer);
  const encoder = new TextEncoder();
  const inputBytes = encoder.encode(JSON.stringify([args,context]));

  // Start writing input at 0
  const inPtr = 0;
  memBuffer.set(inputBytes, inPtr);

  // Rust will write output metadata and bytes internally
  const outPtr = inputBytes.length; // just after input

  console.log("Debug: input JSON bytes length =", inputBytes.length, "outPtr =", outPtr);

  // Call WASM plugin
  instance.exports.run(inPtr, inputBytes.length, outPtr);

  // Read offset and length from first 8 bytes at outPtr
  const view = new DataView(memory.buffer, outPtr, 8);
  const offset = view.getUint32(0, true);
  const len = view.getUint32(4, true);

  console.log("Debug: output offset =", offset, "length =", len);

  // Extract output bytes
  const outputBytes = new Uint8Array(memory.buffer, offset, len);
  const outputStr = new TextDecoder().decode(outputBytes);

  console.log("Debug: raw output string =", outputStr);

  try {
    return JSON.parse(outputStr);
  } catch (err) {
    console.error("Failed to parse plugin output:", err);
    return { error: "invalid plugin output" };
  }
}

/*
// Example usage
(async () => {
  const instance = await loadWasm("extensions/nyno-if/command.wasm");

  {
  const args = [10, "lower than", 5];
  const context = { set_context: "prev" };
  const out1 = await runWasm(instance, args,context);
  console.log("NynoIf Plugin eval 1:", out1);
  }
  {
  const args = [7, "higher than", 3];
  const context = { set_context: "prev" };
  const out1 = await runWasm(instance, args,context);
  console.log("NynoIf Plugin eval 2:", out1);
  }



})();
//*/
