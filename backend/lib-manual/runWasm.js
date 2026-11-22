import fs from "fs";
import { encode, decode } from "@msgpack/msgpack";

export async function loadWasm(path) {
  const wasmBytes = fs.readFileSync(path);
  const instance = await WebAssembly.instantiate(wasmBytes, {});
  return instance.instance;
}

// Decode u64 -> {ptr, len}
function unpackPtrLen(value) {
  const ptr = Number(value & 0xffffffffn);
  const len = Number(value >> 32n);
  return { ptr, len };
}

export async function runWasm(instance, args, context) {
  const memory = instance.exports.memory;

  // ✅ MessagePack encode input
  const inputBytes = encode({
    args,
    context
  });

  const inPtr = instance.exports.alloc(inputBytes.length);



    console.log('inputBytes.length',inputBytes.length);

        
    
    
        console.log('inPtr',inPtr);
        
        
        
  // Write into WASM memory
  let memBuffer = new Uint8Array(memory.buffer);
  memBuffer.set(inputBytes, inPtr);

  // Call WASM
  const result = instance.exports.run(inPtr, inputBytes.length);

  const { ptr: outPtr, len: outLen } = unpackPtrLen(result);

  if (outPtr === 0 || outLen === 0) {
    throw new Error("WASM returned null output");
  }

  // Refresh memory view
  memBuffer = new Uint8Array(memory.buffer);

  if (outPtr + outLen > memBuffer.length) {
    throw new Error("Out-of-bounds WASM memory access");
  }

  const outputBytes = memBuffer.slice(outPtr, outPtr + outLen);

  // ✅ MessagePack decode output
  const output = decode(outputBytes);

  //console.log('WASM OUTPUT',output);

  // Free memory
  instance.exports.dealloc(outPtr, outLen);
  instance.exports.dealloc(inPtr, inputBytes.length);

  return output;
}
