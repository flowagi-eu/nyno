// logger.js
import process from 'node:process';

const zdr = process.env.ZDR === 'true' || process.env.ZDR === '1';

const loggers = {
  JSONL(msg, meta = {}) {
    console.log(JSON.stringify({ ts: new Date().toISOString(), log: msg, meta, zdr }));
  }
};

export function extend(name, fn) {
  loggers[name] = fn;
}

export function log(msg, meta = {}) {
  const impl = loggers[process.env.LOGGER || 'JSONL'] || loggers.JSONL;
  impl(msg, meta);
}
