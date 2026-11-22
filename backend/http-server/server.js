import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { load, dump } from "js-yaml";

import { app } from "../hono.config.js";
import { createCtx } from "../ctxfactory.config.js"; // for auth/checking






// only for http server
import registry from "./registry.js";


/**
 * =========================
 * REGISTRY → ROUTES COMPILER
 * =========================
 *
 * THIS IS THE ENTIRE ROUTING SYSTEM
 */
for (const route of registry) {
  const method = route.method.toLowerCase();

  app[method](route.path, async (c) => {
    /*
     * Build the request object directly from Hono.
     *
     * No buildReq() helper is needed.
     */
    let body = null;

    try {
      body = await c.req.json();
    } catch {}

    const req = {
      params: c.req.param(),
      query: Object.fromEntries(new URL(c.req.url).searchParams),
      body,
      headers: c.req.header(),
    };

    const ctx = await createCtx(
      req,
      route.auth ?? false,
      route.authType ?? null
    );

    if ((route.auth ?? false) && !ctx) {
      return c.json(
        {
          error: "unauthorized",
        },
        401
      );
    }

    try {
      /*
       * =========================
       * REQUEST VALIDATION
       * =========================
       */

      if (route.params) {
        req.params = route.params.create(req.params);
      }

      if (route.query) {
        req.query = route.query.create(req.query);
      }

      if (route.body) {
        req.body = route.body.create(req.body);
      }

      /*
       * Dynamic object body validation.
       */
      if (route.bodyIsDynamicObject) {
        if (
          typeof req.body !== "object" ||
          req.body === null ||
          Array.isArray(req.body)
        ) {
          return c.json(
            {
              error: "validation_failed",
              fields: [
                {
                  field: "body",
                  message: "Body must be an object",
                },
              ],
            },
            400
          );
        }
      }

      /*
       * =========================
       * REQUEST LOGGING
       * =========================
       */


      /*
       * =========================
       * HANDLER
       * =========================
       */

      const result = await route.handler(ctx, req);

      const [status, payload] = result;

      return c.json(payload, status);
    } catch (err) {
      /*
       * Validation errors.
       */
      if (err instanceof TypeError) {
        return c.json(
          {
            error: "validation_failed",
            message: err.message,
          },
          400
        );
      }

      throw err;
    } finally {
      /*
       * Every authenticated tenant connection gets closed.
       */
      if (ctx?.tdb) {
        try {
          await ctx.tdb.end();
        } catch (err) {
          console.error(
            "Failed to close tenant PostgreSQL connection:",
            err
          );
        }
      }
    }
  });
}

/**
 * =========================
 * FALLBACK
 * =========================
 */
app.use("*", async (c, next) => {

  await next();
});

app.notFound(async (c) => {
  /*
   * Construct the request directly.
   * No buildReq() helper is needed.
   */
  let body = null;

  try {
    body = await c.req.json();
  } catch {}

  const req = {
    params: c.req.param(),
    query: Object.fromEntries(new URL(c.req.url).searchParams),
    body,
    headers: c.req.header(),
  };

  logRequest(req, {}, null);

  return c.json(
    {
      error: "not found",
    },
    404
  );
});

/**
 * =========================
 * NO SERVER START
 * =========================
 *
 * The app is exported so the server can be started
 * externally and remain extendable.
 */
export { app };
