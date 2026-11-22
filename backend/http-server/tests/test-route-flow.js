import registry from "../registry.js";
import { createCtx } from "../ctxfactory.config.js";

const route = registry.find(
  (r) => r.method === "POST" && r.path === "/api/v1/flows"
);

if (!route) {
  throw new Error("Route not found");
}

// Simulate the actual HTTP request.
const req = {
  params: {},
  query: {},
  body: {
    nyno: "5.3",

    workflow: [
      {
        id: 0,
        step: "gui-input-textarea",
        label: "Send Message",
        next: [1],
      },
      {
        id: 1,
        step: "nyno-echo",
        args: ["${prev}"],
        label: "nyno-echo",
        position: {
          x: 683,
          y: 187.421875,
        },
        next: [2],
      },
      {
        id: 2,
        step: "gui-output-markdown",
        label: "Show Markdown",
        next: [],
      },
    ],
  },
  headers: {},
};

let ctx;

try {
  console.log(`POST ${route.path}`);

  /*
   * Same validation flow as server.js
   */

  if (route.params) {
    console.log("\nparams before .create():");
    console.dir(req.params, { depth: null });

    req.params = route.params.create(req.params);

    console.log("\nparams after .create():");
    console.dir(req.params, { depth: null });
  }

  if (route.query) {
    req.query = route.query.create(req.query);
  }

  if (route.body) {
    console.log("\nbody before .create():");
    console.dir(req.body, { depth: null });

    req.body = route.body.create(req.body);

    console.log("\nbody after .create():");
    console.dir(req.body, { depth: null });
  }

  console.log("\nType validation: OK");

  /*
   * Same authentication/context creation as server.js
   */

  ctx = await createCtx(
    req,
    route.auth ?? false,
    route.authType ?? null
  );

  if ((route.auth ?? false) && !ctx) {
    console.log("\nAuthentication: 401");
    process.exit(0);
  }

  /*
   * Call the real handler.
   */

  console.log("\nCalling handler...");

  const result = await route.handler(ctx, req);

  const [status, payload] = result;

  console.log("\nSTATUS:", status);
  console.log("RESPONSE:");
  console.dir(payload, { depth: null });
} catch (err) {
  if (err instanceof TypeError) {
    console.error("\nTYPE VALIDATION FAILED:");
    console.error(err.message);
    process.exit(1);
  }

  console.error("\nHANDLER FAILED:");
  console.error(err);
  process.exit(1);
} finally {
  if (ctx?.tdb) {
    try {
      await ctx.tdb.end();
    } catch {}
  }
}
