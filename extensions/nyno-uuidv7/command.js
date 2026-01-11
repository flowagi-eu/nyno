// extensions/uuidv7-js/command.js

import crypto from "crypto";

export function nyno_uuidv7(args, context) {
  try {
    const setName = context?.set_context ?? "prev";

    // Unix timestamp in milliseconds (48 bits)
    const timestamp = BigInt(Date.now());

    // Random bytes
    const randomBytes = crypto.randomBytes(10);

    // Build UUIDv7 buffer (16 bytes)
    const buffer = Buffer.alloc(16);

    // Timestamp (48 bits)
    buffer.writeUIntBE(Number(timestamp >> 16n), 0, 4);
    buffer.writeUInt16BE(Number(timestamp & 0xffffn), 4);

    // Version (7)
    buffer[6] = (0x70 | (randomBytes[0] & 0x0f));

    // Random data
    buffer[7] = randomBytes[1];

    // Variant (RFC 4122)
    buffer[8] = (randomBytes[2] & 0x3f) | 0x80;

    randomBytes.copy(buffer, 9, 3);

    // Format UUID string
    const uuid = [
      buffer.slice(0, 4).toString("hex"),
      buffer.slice(4, 6).toString("hex"),
      buffer.slice(6, 8).toString("hex"),
      buffer.slice(8, 10).toString("hex"),
      buffer.slice(10, 16).toString("hex")
    ].join("-");

    context[setName] = uuid;

    return 0;
  } catch (error) {
    const setName = context?.set_context ?? "prev";
    context[setName + ".error"] = {
      errorMessage: error.message
    };
    return 1;
  }
}

