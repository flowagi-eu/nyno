import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const context = {};
await nyno_date([],context);
const ymd = context['prev'];

const LOG_FILE = path.join(__dirname, ymd +"-requests.jsonl");
const LOCK_FILE = path.join(__dirname, ymd + "-requests.jsonl.lock");

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function acquireLock(timeout = 5000) {
  const start = Date.now();

  while (true) {
    try {
      const fd = fs.openSync(LOCK_FILE, "wx");
      return fd;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;

      if (Date.now() - start > timeout) {
        throw new Error("Timed out waiting for log lock");
      }

      await sleep(5);
    }
  }
}

function releaseLock(fd) {
  try {
    fs.closeSync(fd);
  } finally {
    try {
      fs.unlinkSync(LOCK_FILE);
    } catch {}
  }
}

export async function logGeneric(entry={}) {
  if(!("ts" in entry)) {
     entry.ts = Date.now();
  }

  const fd = await acquireLock();

  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n", "utf8");
  } finally {
    releaseLock(fd);
  }
}

export function nyno_date(args = [], context = {}) {
  const format = args[0] || 'Y-m-d';
  const setName = context.set_context ?? 'prev';

  let value;

  if (format === 'time' || format === 'timestamp') {
    value = Date.now();
  } else {
    const date = new Date();

    const values = {
      Y: date.getFullYear(),
      m: String(date.getMonth() + 1).padStart(2, '0'),
      d: String(date.getDate()).padStart(2, '0'),
      H: String(date.getHours()).padStart(2, '0'),
      i: String(date.getMinutes()).padStart(2, '0'),
      s: String(date.getSeconds()).padStart(2, '0'),
    };

    value = format.replace(/[YmdHis]/g, token => values[token]);
  }

  context[setName] = value;

  return 0;
}


