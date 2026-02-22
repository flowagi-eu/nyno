import fs from "fs";
import path from "path";

// Resolve the private extensions folder relative to cwd
const privateExtDir = path.resolve(process.cwd(), "input");

// Ensure the private extensions folder exists
if (!fs.existsSync(privateExtDir)) {
  fs.mkdirSync(privateExtDir, { recursive: true });
  console.log(`[init-input-extension] Created input folder: ${privateExtDir}`);
}

