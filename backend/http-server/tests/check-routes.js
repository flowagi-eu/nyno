import http from "node:http";
import { app } from "../server.js";
import registry from "../registry.js";

const PORT = 32982;
const HOST = "127.0.0.1";

/*
 * Turn a registry route into something we can actually request.
 *
 * Examples:
 *
 * /api/v1/polling/:taskId
 *   -> /api/v1/polling/test
 *
 * /api/v1/files/:filepath{.+}
 *   -> /api/v1/files/test
 *
 * /:publicId/api/v1/health
 *   -> /test/api/v1/health
 *
 * /:publicId/api/v1/async/:name{...}
 *   -> /test/api/v1/async/test
 */
function makeTestPath(routePath) {
  return routePath.replace(
    /:([A-Za-z0-9_]+)(?:\{[^}]*\})?/g,
    "test"
  );
}

/*
 * Minimal Node -> Fetch Request adapter for Hono.
 */
function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const host = req.headers.host || `localhost:${PORT}`;
      const url = `http://${host}${req.url}`;

      const headers = new Headers();

      for (const [key, value] of Object.entries(req.headers)) {
        if (Array.isArray(value)) {
          for (const v of value) {
            headers.append(key, v);
          }
        } else if (value !== undefined) {
          headers.set(key, value);
        }
      }

      let body;

      if (req.method !== "GET" && req.method !== "HEAD") {
        const chunks = [];

        for await (const chunk of req) {
          chunks.push(chunk);
        }

        body = Buffer.concat(chunks);
      }

      const request = new Request(url, {
        method: req.method,
        headers,
        body,
        duplex: "half",
      });

      const response = await app.fetch(request);

      res.statusCode = response.status;

      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      const responseBody = Buffer.from(
        await response.arrayBuffer()
      );

      res.end(responseBody);
    } catch (err) {
      console.error("SERVER ERROR:", err);

      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("content-type", "application/json");
      }

      res.end(
        JSON.stringify({
          error: err?.message || String(err),
        })
      );
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);

    server.listen(PORT, HOST, () => {
      resolve(server);
    });
  });
}

async function requestRoute(route) {
  const method = route.method.toUpperCase();
  const path = makeTestPath(route.path);
  const url = `http://${HOST}:${PORT}${path}`;

  const options = {
    method,
    headers: {},
  };

  if (method !== "GET" && method !== "HEAD") {
    options.headers["content-type"] = "application/json";
    options.body = JSON.stringify({});
  }

  const response = await fetch(url, options);
  const text = await response.text();

  return {
    method,
    url,
    status: response.status,
    body: text,
  };
}

const server = await startServer();

console.log(`Server started on http://${HOST}:${PORT}`);
console.log(`Testing ${registry.length} routes...\n`);

let failed = false;

try {
  for (const route of registry) {
    const result = await requestRoute(route);

    console.log(
      `${result.status} ${result.method.padEnd(6)} ${result.url}`
    );

    console.log(`     ${result.body}`);

    if (result.status === 404) {
      console.error("     ^^^ FAIL: route returned 404\n");
      failed = true;
    } else {
      console.log();
    }
  }
} finally {
  await new Promise((resolve) => {
    server.close(resolve);
  });
}

if (failed) {
  console.error("Route test FAILED.");
  process.exit(1);
}

console.log("All routes exist.");
process.exit(0);
