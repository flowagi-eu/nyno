// loadCommands.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { Client } from 'pg';
import App from '../App.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const extensionsDir = './extensions';
if (!fs.existsSync(extensionsDir)){
    fs.mkdirSync(extensionsDir);
}
const envsDir = './envs';
if (!fs.existsSync(envsDir)){
    fs.mkdirSync(envsDir);
}
const outputDir = './output';
if (!fs.existsSync(outputDir)){
    fs.mkdirSync(outputDir);
}
const routesDir = './src/tcp/routes';
if (!fs.existsSync(routesDir)){
    fs.mkdirSync(routesDir);
}


// --- Load extensions ---
async function loadExtensions() {
  const extensionsDir = path.join(__dirname, '../../extensions');
  const extensions = {};

  if (!fs.existsSync(extensionsDir)) return extensions;

  const folders = fs.readdirSync(extensionsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const folder of folders) {
    const commandFile = path.join(extensionsDir, folder, 'command.js');
    const yamlFile = path.join(extensionsDir, folder, 'template.yml');

    let command = null;
    let yamlData = null;

    if (fs.existsSync(commandFile)) {
      const module = await import(pathToFileURL(commandFile).href);
      console.log('Loaded extension command: ' + folder);
      command = module.default;
    }

    if (fs.existsSync(yamlFile)) {
      const fileContent = fs.readFileSync(yamlFile, 'utf8');
      console.log('Loaded extension YAML: ' + folder);
      yamlData = fileContent;
    }

    if (command || yamlData) {
      extensions[folder] = { command, yaml: yamlData };
    }
  }

  App.set('extensions', extensions);
  return extensions;
}

// --- Execute both immediately ---
const extensions = await loadExtensions();

const extensionFile = path.resolve("./src/extension-data.json");
await fs.writeFileSync(extensionFile, JSON.stringify(extensions, null, 2), "utf-8");
console.log('Extension file:', extensionFile);
console.log('Extensions loaded:', Object.keys(extensions));

