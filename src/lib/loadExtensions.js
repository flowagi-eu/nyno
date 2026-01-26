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
