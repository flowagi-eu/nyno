import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_FILE = path.join(__dirname, "requests.jsonl");
const LOCK_FILE = path.join(__dirname, "requests.jsonl.lock");

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

export async function logRequest(req, ctx, route) {
  const entry = {
    ts: Date.now(),
    m: 'http_log',
    d: {
      tenant: ctx?.tenant_id ?? null,
      method: route?.method ?? '?',
      path: route?.path ?? '?',
      params: req.params ?? '?',
      query: req.query ?? '?',
      body: req.body ?? '?',
      headers: req.headers ?? '?',
      ip:
        req.headers["x-forwarded-for"] ??
        req.headers["cf-connecting-ip"] ??
        req.headers["x-real-ip"] ??
        null,
      ua: req.headers["user-agent"] ?? null,
    }
  };

  const fd = await acquireLock();

  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n", "utf8");
  } finally {
    releaseLock(fd);
  }
}
