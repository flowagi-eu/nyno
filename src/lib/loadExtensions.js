import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import App from '../App.js';
import { dbDelta } from '../../sdk/model/dbDelta.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===========================================================
   Ensure required directories exist
=========================================================== */

for (const dir of [
  './extensions',
  './envs',
  './output',
  './workflows-enabled',
  './workflows-available',
]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

/* ===========================================================
   Env loader (shared semantics)
=========================================================== */

function load_nyno_ports(envPath = 'envs/ports.env') {
  const env = {};
  if (!fs.existsSync(envPath)) return env;

  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.includes('#')) line = line.split('#', 1)[0].trim();
    if (!line.includes('=')) continue;

    let [key, value] = line.split('=', 2);
    key = key.trim();
    value = value.trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!isNaN(value) && value !== '') value = Number(value);
    env[key] = value;
  }

  return env;
}

/* ===========================================================
   Load whitelist from env
=========================================================== */

const portsFile = path.resolve(__dirname, '../../envs/ports.env');
const ports = load_nyno_ports(portsFile);

const EXTENSION_NAME_WHITELIST = ports.EXTENSION_NAME_WHITELIST
  ? ports.EXTENSION_NAME_WHITELIST
      .split(',')
      .map(n => n.trim().toLowerCase().replace(/\r/g, ''))
      .filter(Boolean)
  : null;

function isExtensionAllowed(name) {
  if (!EXTENSION_NAME_WHITELIST) return true;
  return EXTENSION_NAME_WHITELIST.includes(name.toLowerCase());
}

console.log('[EXTENSION WHITELIST]', EXTENSION_NAME_WHITELIST);

/* ===========================================================
   Extension base directories (authoritative)
=========================================================== */

const extensionDirs = [
  path.resolve(__dirname, '../../extensions'),
  path.resolve(__dirname, '../../../nyno-private-extensions'),
];

/* ===========================================================
   Extension loader (manifest-only)
=========================================================== */

async function loadExtensions() {
  const extensions = {};

  for (const baseDir of extensionDirs) {
    if (!fs.existsSync(baseDir)) continue;

    const folders = fs.readdirSync(baseDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const folder of folders) {
      if (!isExtensionAllowed(folder)) {
        console.log('[EXT SKIP]', folder, '(not whitelisted)');
        continue;
      }

      // first directory wins unless you reorder extensionDirs
      if (extensions[folder]) continue;

      const extDir = path.join(baseDir, folder);
      const emojiFile = path.join(extDir, 'emoji.txt');
      const yamlFile = path.join(extDir, 'template.yml');

      let yaml = null;
      let emoji = '';

      if (fs.existsSync(yamlFile)) {
        yaml = fs.readFileSync(yamlFile, 'utf8');
      }

      if (fs.existsSync(emojiFile)) {
        emoji = fs.readFileSync(emojiFile, 'utf8').trim();
      }

      extensions[folder] = {
        yaml,
        emoji,
        sourceDir: extDir, // useful for runners / debugging
      };

      console.log('[EXT LOAD]', folder, 'from', baseDir);
    }
  }

  App.set('extensions', extensions);
  await dbDelta();
  return extensions;
}

/* ===========================================================
   Execute + write manifest
=========================================================== */

const extensions = await loadExtensions();

const extensionFile = path.resolve('./src/extension-data.json');
fs.writeFileSync(extensionFile, JSON.stringify(extensions, null, 2), 'utf-8');

console.log('Extension file written:', extensionFile);
console.log('Extensions enabled:', Object.keys(extensions));
