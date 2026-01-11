import fs from "fs";
import path from "path";

// Resolve the private extensions folder relative to cwd
const privateExtDir = path.resolve(process.cwd(), "..", "nyno-private-extensions");
const placeholderDir = path.join(privateExtDir, "placeholder");
const indexFile = path.join(placeholderDir, "index.ts");
const packageJsonFile = path.join(privateExtDir, "package.json");

// Ensure the private extensions folder exists
if (!fs.existsSync(privateExtDir)) {
  fs.mkdirSync(privateExtDir, { recursive: true });
  console.log(`[init-private-extension] Created folder: ${privateExtDir}`);
}

// Ensure the placeholder subfolder exists
if (!fs.existsSync(placeholderDir)) {
  fs.mkdirSync(placeholderDir, { recursive: true });
  console.log(`[init-private-extension] Created placeholder folder: ${placeholderDir}`);
}

// Ensure index.ts exists inside placeholder
if (!fs.existsSync(indexFile)) {
  fs.writeFileSync(indexFile, "// placeholder index.ts\nexport {};\n");
  console.log(`[init-private-extension] Created placeholder index.ts: ${indexFile}`);
} else {
  console.log(`[init-private-extension] Placeholder index.ts already exists`);
}

// Ensure minimal package.json exists at root of private extensions
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

