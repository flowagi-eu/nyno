// scripts/copy-private-extensions.ts
import fs from "fs";
import path from "path";

const repoRoot = process.cwd();
const privateExtSrc = path.join(repoRoot, "..", "nyno-private-extensions");
const privateDistSrc = path.join(repoRoot, "dist-ts", "..", "nyno-private-extensions"); // compiled .js
const distExtDest = path.join(repoRoot, "dist-ts", "extensions");

// Recursive copy function
function copyDir(src: string, dest: string) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Only proceed if the compiled private-extensions exist
if (!fs.existsSync(privateDistSrc)) {
  console.log("[copy-private-extensions] No compiled private extensions found, skipping copy.");
  process.exit(0);
}

// Ensure destination folder exists
if (!fs.existsSync(distExtDest)) fs.mkdirSync(distExtDest, { recursive: true });

// Scan compiled private extensions and copy only folders that have command.js
for (const entry of fs.readdirSync(privateDistSrc, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const folderPath = path.join(privateDistSrc, entry.name);
  const commandFile = path.join(folderPath, "command.js");

  if (fs.existsSync(commandFile)) {
    const destFolder = path.join(distExtDest, entry.name);
    console.log(`[copy-private-extensions] Copying compiled ${entry.name}`);
    copyDir(folderPath, destFolder);
  } else {
    console.log(`[copy-private-extensions] Skipping ${entry.name}, no command.js`);
  }
}

console.log("[copy-private-extensions] Done.");

