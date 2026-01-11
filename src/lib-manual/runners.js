import net from "net";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import crypto from "crypto";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


import "./watchers.js";

// Load main Nyno ports/config

function load_nyno_ports(path = "envs/ports.env") {
  const env = {};
  const lines = fs.readFileSync(path, "utf-8").split("\n");

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.includes("#")) line = line.split("#")[0].trim();
    if (line.includes("=")) {
      let [key, value] = line.split("=", 2);
      key = key.trim();
      value = value.trim();

      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Convert numeric values
      if (!isNaN(value) && value !== "") value = Number(value);

      env[key] = value;
    }
  }
  return env;
}

const portsFile = path.resolve(__dirname, '../../envs/ports.env');
const ports = load_nyno_ports(portsFile);
//console.log('[MAIN RUNNER PORTS]',ports);


const host = ports['host'] ?? 'localhost';

// List of directories to scan for extensions
const extensionDirs = [
  path.resolve(__dirname, '../../extensions'),
  path.resolve(__dirname, '../../../nyno-private-extensions'), // example of another dir
  // add more directories as needed
];

// Factory function for checkFunction
const makeCheckFunction = (files) => () => {
  return extensionDirs.some(dir => {
    if (!fs.existsSync(dir)) return false;

    return fs.readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .some(subDir => files.some(file => fs.existsSync(path.join(dir, subDir.name, file))));
  });
};


const RUNNERS = {
  php: {
    host,
    port: ports['PE'] ?? 9003,
    cmd: "php",
    file: path.resolve(__dirname, "runners/runner.php"),
    checkFunction: makeCheckFunction(['command.php'])
  },
  js: {
    host,
    port: ports["JS"] ?? 9072,
    cmd: "node",
    file: path.resolve(__dirname, "../../dist-ts/nyno/src/lib-manual/runners/runner.js"),
    checkFunction: makeCheckFunction(['command.js','command.ts'])
  },
  py: {
    host,
    port: ports['PY'] ?? 9006,
    cmd: "python3",
    file: path.resolve(__dirname, "runners/runner.py"),
    checkFunction: makeCheckFunction(['command.py'])
  },
  rb: {
    host,
    port: ports['RB'] ?? 9045,
    cmd: "ruby",
    file: path.resolve(__dirname, "runners/runner.rb"),
    checkFunction: makeCheckFunction(['command.rb'])
  },
};


const RUNNERS_DISABLED = {};

const API_KEY = ports['SECRET'] ?? 'changeme';
const connections = {};
const pending = {};

// --- Spawn a single runner ---
function startRunner(type) {
  const cfg = RUNNERS[type];
  console.log(`[RUNEXT] Starting ${type} runner: ${cfg.cmd} ${cfg.file}`);
  const proc = spawn(cfg.cmd, [cfg.file], { stdio: ["ignore", "inherit", "inherit"] });

  proc.on("exit", (code) => {
    console.log(`[RUNEXT] ${type} runner exited with code ${code}, restarting in 2s...`);
    setTimeout(() => startRunner(type), 2000);
  });

  cfg.proc = proc;
}

// --- Start all runners ---
function startRunners() {
  for (const type of Object.keys(RUNNERS)) {
    const data = RUNNERS[type];
    if(data.checkFunction){
      const check = data.checkFunction();
      if(!check) { 
        RUNNERS_DISABLED[type] = 1;
        continue; // skip if no extensions are found
      }
    }
    startRunner(type);
  }
}

// --- Persistent TCP connection ---
function connectRunner(type) {
  const cfg = RUNNERS[type];
  const client = new net.Socket();

  client.connect(cfg.port, cfg.host, () => {
    console.log(`[RUNEXT] Connected to ${type.toUpperCase()} runner`);
    client.write(`c{"apiKey":"${API_KEY}"}\n`);
    connections[type] = client;
  });

  let buffer = "";

  client.on("data", (data) => {
    buffer += data.toString();
    let idx;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const msg = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!msg) continue;

      const resolvedData = JSON.parse(msg); // .c & .r in object, needs c.n_id for parralel

      if(resolvedData && resolvedData.c) { 
      const n_id = resolvedData['c']['n_id'];
      const resolver = pending[n_id];
      if (resolver) {
        try {
          resolver(JSON.parse(msg));
        } catch (e) {
          console.error(`[RUNEXT] JSON parse error from ${type}:`, e, msg);
          resolver(null);
        }
      } 

      }
	    else {
        console.warn(`[RUNEXT] No pending resolver for message from ${type}: ${msg}`);
      }
    }
  });

  client.on("error", (err) => console.error(`[RUNEXT] ${type} runner error:`, err.message));
  client.on("close", () => {
    console.log(`[RUNEXT] ${type} runner disconnected. Reconnecting in 2s...`);
    setTimeout(() => connectRunner(type), 2000);
  });
}

// --- Connect all runners ---
function connectAllRunners() {
  for (const type of Object.keys(RUNNERS)) {
    if(!(type in RUNNERS_DISABLED)){
    connectRunner(type);
    }
  }
}

// ---------------------------
// UUIDv7 generator
// ---------------------------
function generateUUIDv7() {
  const timestamp = BigInt(Date.now());
  const rand = crypto.randomBytes(10); // 80 bits
  const tsHex = timestamp.toString(16).padStart(12, "0"); // 48 bits
  const randHex = rand.toString("hex"); // 80 bits
  return tsHex + randHex;
}

// --- Run function on a single runner ---
export function runFunctionSingle(language, functionName, args = [],context={}) {

console.log('runFunctionSingle',language, functionName, args,context);

let n_id = generateUUIDv7(); // nyno task id for parallel support
context['n_id'] = n_id;
	console.log('language',language);
  const client = connections[language];
  if (!client || client.destroyed) throw new Error(`${language} runner not connected`);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`runFunction timeout for ${language}:${functionName}`)), 9999999);

    pending[n_id] = (msg) => {
      clearTimeout(timeout);
      if (!msg) return reject(new Error("No response from runner"));
      resolve(msg);
    };

    client.write('r'+JSON.stringify({functionName,args,context}) + '\n');
  });
}

export async function initRunners() {
// --- Initialize runners & connections immediately ---
startRunners();
setTimeout(connectAllRunners, 1000);
}

