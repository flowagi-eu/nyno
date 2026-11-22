import http from "node:http";
import fs from "node:fs";
import path from "node:path";

import { app } from "./backend/http-server/server.js";

const ROOT = process.cwd();
const PORT = process.NYNO_HTTP_PORT ?? 9099;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
};

const clients = new Set();

const reloadScript = `
<script>
(() => {
  const es = new EventSource("/__reload");
  es.onmessage = () => location.reload();
})();
</script>
`;

/*
 * Create ONE native Node server.
 *
 * Hono handles requests first.
 * Static files are the fallback.
 */
const server = http.createServer(async (req, res) => {
  try {
    /*
     * --------------------------------------------------------
     * Hono
     * --------------------------------------------------------
     */

    const url = new URL(
      req.url || "/",
      `http://${req.headers.host || "localhost"}`,
    );

    const request = new Request(
      url,
      {
        method: req.method,
        headers: req.headers,
        body:
          req.method === "GET" ||
          req.method === "HEAD"
            ? undefined
            : req,
        duplex: "half",
      },
    );

    const response = await app.fetch(request);

    /*
     * Hono's notFound() returns a 404.
     *
     * If Hono handled the request with anything other
     * than a 404, return that response immediately.
     */
    if (response.status !== 404) {
      res.statusCode = response.status;

      for (const [key, value] of response.headers) {
        res.setHeader(key, value);
      }

      if (response.body) {
        const reader = response.body.getReader();

        try {
          while (true) {
            const { done, value } =
              await reader.read();

            if (done) break;

            res.write(value);
          }
        } finally {
          reader.releaseLock();
        }
      }

      res.end();
      return;
    }

    /*
     * --------------------------------------------------------
     * Hono didn't handle it.
     *
     * Fall through to static development server.
     * --------------------------------------------------------
     */

    await serveStatic(req, res);
  } catch (error) {
    console.error(error);

    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader(
        "Content-Type",
        "application/json; charset=utf-8",
      );
    }

    res.end(
      JSON.stringify({
        error: "Internal server error",
        message:
          process.env.NODE_ENV === "development"
            ? error.message
            : undefined,
      }),
    );
  }
});

/*
 * ------------------------------------------------------------
 * Static server
 * ------------------------------------------------------------
 */

async function serveStatic(req, res) {
  const url = new URL(
    req.url || "/",
    `http://${req.headers.host || "localhost"}`,
  );

  /*
   * Live reload SSE endpoint.
   */
  if (url.pathname === "/__reload") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    clients.add(res);

    req.on("close", () => {
      clients.delete(res);
    });

    return;
  }

  let pathname;

  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }

  if (pathname === "/") {
    pathname = "/index.html";
  }

  const filePath = path.resolve(
    ROOT,
    "." + pathname,
  );

  /*
   * Prevent ../ escaping.
   */
  if (
    !filePath.startsWith(
      ROOT + path.sep,
    )
  ) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(
    filePath,
    (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const ext =
        path.extname(filePath).toLowerCase();

      /*
       * HTML gets live reload injection.
       */
      if (ext === ".html") {
        fs.readFile(
          filePath,
          "utf8",
          (err, html) => {
            if (err) {
              res.writeHead(500);
              res.end(
                "Internal server error",
              );
              return;
            }

            html = html.replace(
              /<\/body\s*>/i,
              `${reloadScript}</body>`,
            );

            res.writeHead(200, {
              "Content-Type":
                MIME[".html"],
              "Cache-Control":
                "no-cache",
            });

            res.end(html);
          },
        );

        return;
      }

      res.writeHead(200, {
        "Content-Type":
          MIME[ext] ||
          "application/octet-stream",
        "Cache-Control":
          "no-cache",
      });

      fs.createReadStream(
        filePath,
      ).pipe(res);
    },
  );
}

/*
 * ------------------------------------------------------------
 * Live reload
 * ------------------------------------------------------------
 */

fs.watch(
  ROOT,
  { recursive: true },
  (event, filename) => {
    if (
      !filename ||
      !filename.endsWith(".js")
    ) {
      return;
    }

    console.log(
      `JS changed: ${filename}`,
    );

    for (const res of clients) {
      if (!res.writableEnded) {
        res.write(
          "data: reload\n\n",
        );
      }
    }
  },
);

/*
 * ------------------------------------------------------------
 * Start ONE server
 * ------------------------------------------------------------
 */

server.listen(PORT, () => {
  console.log("Nyno HTTP Server running on port " + PORT);
});
