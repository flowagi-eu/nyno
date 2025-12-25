// scripts/init-private-extension.ts
import fs from "fs";
import path from "path";

const privateExtDir = path.join(process.cwd(), "..", "nyno-private-extensions");
const placeholderFile = path.join(privateExtDir, ".placeholder.ts");
const packageJsonFile = path.join(privateExtDir, "package.json");

// Ensure folder exists
if (!fs.existsSync(privateExtDir)) {
  fs.mkdirSync(privateExtDir, { recursive: true });
  console.log(`[init-private-extension] Created folder: ${privateExtDir}`);
}

// Ensure placeholder file exists
if (!fs.existsSync(placeholderFile)) {
  fs.writeFileSync(placeholderFile, "export {}; // placeholder\n");
  console.log(`[init-private-extension] Created placeholder file: ${placeholderFile}`);
} else {
  console.log(`[init-private-extension] Placeholder file already exists`);
}

// Ensure minimal package.json exists
if (!fs.existsSync(packageJsonFile)) {
  const pkgContent = {
    name: "nyno-private-extensions",
    type: "module"
  };
  fs.writeFileSync(packageJsonFile, JSON.stringify(pkgContent, null, 2));
  console.log(`[init-private-extension] Created package.json with ESM type`);
} else {
  console.log(`[init-private-extension] package.json already exists`);
}

