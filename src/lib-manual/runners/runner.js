import cluster from "cluster";
import os from "os";
import net from "net";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const PORT = 4001;
const VALID_API_KEY = "changeme";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

globalThis.state = {

};

async function loadExtensions() {
  const extBase = path.resolve(__dirname, "../../../extensions");
  const dirs = fs.readdirSync(extBase, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => path.join(extBase, d.name));

  for (const dir of dirs) {
    const cmdFile = path.join(dir, "command.js");
    if (fs.existsSync(cmdFile)) {
      try {

        const module = await import(cmdFile);

        // derive function name from folder: lowercase, - → _
        const folder = path.basename(dir);
        const funcName = folder.toLowerCase().replaceAll('-','_');
        
        if (module[funcName]) {
          globalThis.state[folder] = module[funcName]; // directly assign function
          console.log(`[JS Runner] Loaded extension ${funcName}`);
        } else {
          console.warn(`[JS Runner] Failed to load extension ${dir} does not export a function called ${funcName}`);
        }
      } catch (err) {
        console.error("[JS Runner] Failed to load extension", cmdFile, err);
      }
    }
  }
}

async function startWorker() {
  await loadExtensions();
  console.log('globalThis.state', Object.keys(globalThis.state));

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
		    console.log('received payload r',payload);
          const fn = globalThis.state[payload.functionName];
          console.log('global state',globalThis.state);
          console.log({fn,functionName:payload.functionName});
          if (typeof fn !== "function") {
            socket.write(JSON.stringify({ fnError: "not exist" }) + "\n");
          } else {
            try {
              let context = payload.context ?? {};
              const result = await fn(payload.args,context); //...(payload.args || []));
              socket.write(JSON.stringify({ r:result, c:context}) + "\n");
            } catch (err) {
              socket.write(JSON.stringify({ error: err.message }) + "\n");
            }
          }
        }
      }
    });
  });

  server.listen(PORT, "localhost", () => {
    console.log(`[JS Worker ${process.pid}] Listening on port ${PORT}`);
  });
}

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length * 3;
  console.log(`[JS Runner Master] Forking ${numCPUs} workers...`);
  for (let i = 0; i < numCPUs; i++) cluster.fork();

  cluster.on("exit", (worker) => {
    console.log(`[JS Runner Master] Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
} else {
  startWorker();
}

