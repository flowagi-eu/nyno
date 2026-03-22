import fs from "fs";

export async function loadWasm(path) {
  const wasmBytes = fs.readFileSync(path);

  const instance = await WebAssembly.instantiate(wasmBytes, {});
  return instance.instance;
}

// ✅ BigInt-safe decode u64 -> {ptr, len}
function unpackPtrLen(value) {
  const ptr = Number(value & 0xffffffffn);
  const len = Number(value >> 32n);
  return { ptr, len };
}

export async function runWasm(instance, args, context) {
  const memory = instance.exports.memory;

  const encoder = new TextEncoder();
  const inputBytes = encoder.encode(JSON.stringify([args, context]));

  // ✅ Allocate input buffer inside WASM
  const inPtr = instance.exports.alloc(inputBytes.length);

  // Write input into WASM memory
  let memBuffer = new Uint8Array(memory.buffer);
  memBuffer.set(inputBytes, inPtr);

  // ✅ Call plugin (returns BigInt u64)
  const result = instance.exports.run(inPtr, inputBytes.length);

  // ✅ Handle BigInt return value
  const { ptr: outPtr, len: outLen } = unpackPtrLen(result);

  if (outPtr === 0 || outLen === 0) {
    throw new Error("WASM returned null output");
  }

  // IMPORTANT: refresh memory view after WASM execution
  memBuffer = new Uint8Array(memory.buffer);

  if (outPtr + outLen > memBuffer.length) {
    throw new Error("Out-of-bounds WASM memory access");
  }

  const outputBytes = memBuffer.slice(outPtr, outPtr + outLen);
  const outputStr = new TextDecoder().decode(outputBytes);

  // Optional: free memory
  instance.exports.dealloc(outPtr, outLen);
  instance.exports.dealloc(inPtr, inputBytes.length);

  return JSON.parse(outputStr);
}
