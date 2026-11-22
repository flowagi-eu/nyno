import crypto from "crypto";

export function generateUUIDv7() {
  const timestamp = BigInt(Date.now());
  const rand = crypto.randomBytes(10); // 80 bits
  const tsHex = timestamp.toString(16).padStart(12, "0"); // 48 bits
  const randHex = rand.toString("hex"); // 80 bits
  return tsHex + randHex;
}