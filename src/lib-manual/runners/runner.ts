import cluster from "cluster";
import os from "os";
import net from "net";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Load Nyno Main Ports/config

function load_nyno_ports(path = "envs/ports.env") {
  const env: any = {};
  const lines = fs.readFileSync(path, "utf-8").split("\n");

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.includes("#")) line = line.split("#")[0].trim();
    if (line.includes("=")) {
      let [key, value1] = line.split("=", 2);
      key = key.trim();
      let value: any = value1.trim();   // <- force any here

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



const repoRoot = process.cwd(); 
const portsFile = path.join(repoRoot, "envs/ports.env"); 

//const portsFile = path.resolve(__dirname, "../../../envs/ports.env");
const ports = load_nyno_ports(portsFile);
//console.log(ports);

const host = ports['HOST'] ?? 'localhost';

const PORT = ports['JS'] ?? 4001;
const VALID_API_KEY = ports['SECRET'] ?? "changeme";


globalThis.state = {

};
async function loadExtensions() {
  const manifestPath = path.join(process.cwd(), "src", "extension-data.json");

  if (!fs.existsSync(manifestPath)) {
    console.warn("[JS Runner] No extension manifest found");
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

  const extensionsLoaded: string[] = [];

  for (const [extName, meta] of Object.entries<any>(manifest)) {
    const sourceDir = meta.sourceDir;
    if (!sourceDir) {
      console.warn(`[JS Runner] No sourceDir for ${extName}`);
      continue;
    }

    const cmdFile = path.join(sourceDir, "command.js");
    if (!fs.existsSync(cmdFile)) {
      continue;
    }

    try {
      const module = await import(cmdFile);

      // derive function name from folder: lowercase, - → _
      const folder = path.basename(sourceDir);
      const funcName = folder.toLowerCase().replaceAll("-", "_");

      if (module[funcName]) {
        globalThis.state[folder] = module[funcName];
        extensionsLoaded.push(funcName);
      } else {
        console.warn(`[JS Runner] ${folder} does not export function ${funcName}`);
      }
    } catch (err) {
      console.error(`[JS Runner] Failed loading ${extName}`, err);
    }
  }

  console.log(`[JS Runner] Loaded ${extensionsLoaded.length} extensions: ${extensionsLoaded.join(", ")}`);
}



async function startWorker() {
  await loadExtensions();

  const server = net.createServer((socket) => {
    let authenticated = false;
    let buffer = "";

    socket.on("data", async (data) => {
      buffer += data.toString();
      while (buffer.indexOf("\n") >= 0) {
        const line = buffer.slice(0, buffer.indexOf("\n")).trim();
        buffer = buffer.slice(buffer.indexOf("\n") + 1);
        if (!line) continue;

        const type = line[0];
        const raw = line.slice(1);
        let payload;
        try { payload = JSON.parse(raw); } catch { continue; }

        if (type === "c") {
          if (payload.apiKey === VALID_API_KEY) {
            authenticated = true;
            socket.write(JSON.stringify({ status: "OK" }) + "\n");
          } else {
            socket.write(JSON.stringify({ status: "ERR", error: "Invalid apiKey" }) + "\n");
            socket.destroy();
          }
        } else if (!authenticated) {
          socket.write(JSON.stringify({ status: "ERR", error: "Not authenticated" }) + "\n");
          socket.destroy();
        } else if (type === "r") {
          const fn = globalThis.state[payload.functionName];
          let context = payload.context ?? {};
          if (typeof fn !== 'function') {
            socket.write(JSON.stringify({ fnError: "not exist", c:context }) + "\n");
          } else {
            try {
              const result = await fn(payload.args,context); //...(payload.args || []));
              socket.write(JSON.stringify({ r:result, c:context}) + "\n");
            } catch (err) {
              socket.write(JSON.stringify({ error: err.message,c:context }) + "\n");
            }
          }
        }
      }
    });
  });

  server.listen(PORT, host, () => {
    console.log(`[JS Worker ${process.pid}] Listening on port ${PORT}`);
  });
}

if (cluster.isPrimary) {
const isProd = process.env.NODE_ENV === 'production';
  let numCPUs = 2;
  if(isProd) {
     numCPUs = os.cpus().length * 3;
  }
  console.log(`[JS Runner Master] Forking ${numCPUs} workers...`);
  for (let i = 0; i < numCPUs; i++) cluster.fork();

  cluster.on("exit", (worker) => {
    console.log(`[JS Runner Master] Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  startWorker();
}

