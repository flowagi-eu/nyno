// ../lib/runExtension.js
import net from "net";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RUNNERS = {
  php: { host: "localhost", port: 6000, cmd: "php", file: path.resolve(__dirname, "runners/runner.php") },
  js: { host: "localhost", port: 4001, cmd: "node", file: path.resolve(__dirname, "runners/runner.js") },
  py: { host: "localhost", port: 5000, cmd: "python3", file: path.resolve(__dirname, "runners/runner.py") },
};

const API_KEY = "changeme";
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
  for (const type of Object.keys(RUNNERS)) startRunner(type);
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
  for (const type of Object.keys(RUNNERS)) connectRunner(type);
}

// --- Run function on a single runner ---
function runFunctionSingle(language, functionName, args = [],context={}) {
  const client = connections[language];
  if (!client || client.destroyed) throw new Error(`${language} runner not connected`);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`runFunction timeout for ${language}:${functionName}`)), 5000);

    pending[language].push((msg) => {
      clearTimeout(timeout);
      if (!msg) return reject(new Error("No response from runner"));
      resolve(msg);
    });

    console.log('client.write', {functionName,args});
    client.write('r'+JSON.stringify({functionName,args,context}) + '\n');
	  //":"${functionName}","args":${JSON.stringify(args)}}\n`);
  });
}

// --- Run function across all runners, first success ---
export async function runFunction(functionName, args = [],context={}) {
  for (const type of Object.keys(RUNNERS)) {
    try {
	    console.log({functionName,type,args});
      const result = await runFunctionSingle(type, functionName, args,context);
	    console.log('runFunction result',result,{type,functionName});
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

