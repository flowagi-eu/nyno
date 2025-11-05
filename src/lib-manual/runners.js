// ../lib/runExtension.js
import net from "net";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


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
console.log('[MAIN RUNNER PORTS]',ports);


const host = ports['host'] ?? 'localhost';

const RUNNERS = {
  php: { host, port: ports['PE'] ?? 9003, cmd: "php", file: path.resolve(__dirname, "runners/runner.php"), checkFunction:() => {
    const extensionsDir = path.resolve(__dirname, '../../extensions');
    if (!fs.existsSync(extensionsDir)) return false;

    return fs.readdirSync(extensionsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .some(dir => fs.existsSync(path.join(extensionsDir, dir.name, 'command.php')));
  } },
  js: { host, port: ports["JS"] ?? 9072, cmd: "node", file: path.resolve(__dirname, "runners/runner.js"), checkFunction:() => {
    const extensionsDir = path.resolve(__dirname, '../../extensions');
    if (!fs.existsSync(extensionsDir)) return false;

    return fs.readdirSync(extensionsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .some(dir => fs.existsSync(path.join(extensionsDir, dir.name, 'command.js')));
  } },
  py: { host, port: ports['PY'] ?? 9006, cmd: "python3", file: path.resolve(__dirname, "runners/runner.py"), checkFunction:() => {
    const extensionsDir = path.resolve(__dirname, '../../extensions');
    if (!fs.existsSync(extensionsDir)) return false;

    return fs.readdirSync(extensionsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .some(dir => fs.existsSync(path.join(extensionsDir, dir.name, 'command.py')));
  } },
};
const RUNNERS_DISABLED = {};

const API_KEY = ports['SECRET'] ?? 'changeme';
const connections = {};
const pending = { php: [], js: [], py: [], bash:[] };

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

      const resolver = pending[type].shift();
      if (resolver) {
        try {
          resolver(JSON.parse(msg));
        } catch (e) {
          console.error(`[RUNEXT] JSON parse error from ${type}:`, e, msg);
          resolver(null);
        }
      } else {
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

// --- Run function on a single runner ---
function runFunctionSingle(language, functionName, args = [],context={}) {
  const client = connections[language];
  if (!client || client.destroyed) throw new Error(`${language} runner not connected`);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`runFunction timeout for ${language}:${functionName}`)), 9999999);

    pending[language].push((msg) => {
      clearTimeout(timeout);
      if (!msg) return reject(new Error("No response from runner"));
      resolve(msg);
    });

    client.write('r'+JSON.stringify({functionName,args,context}) + '\n');
  });
}

// --- Run function across all runners, first success ---
export async function runFunction(functionName, args = [],context={}) {
  for (const type of Object.keys(RUNNERS)) {
    try {
      const result = await runFunctionSingle(type, functionName, args,context);
      if (result.fnError === "not exist") continue;
      return result;
    } catch (err) {
      console.warn(`[RUNEXT] Error contacting ${type}:`, err.message);
    }
  }

  return {"fnError":`Function "${functionName}" not found on any runner`};
}

// --- Initialize runners & connections immediately ---
startRunners();
setTimeout(connectAllRunners, 1000);

