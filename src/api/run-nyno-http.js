import { runYamlString } from './../lib-manual/runYamlString.js';
import App from '../App.js';
import fs from 'fs';
import path from 'path';
const envs = load_nyno_ports();

import YAML from 'js-yaml';

import { createTaskManager } from "./tasks-util/index.js";

import { flows } from './handlers/flows.js';
import { flowsSync } from './handlers/flowsSync.js';
import { polling } from './handlers/polling.js';
import { users } from "./handlers/users.js";

// handlers for subusers
import { subuserFlows } from "./handlers/subuserFlows.js";
import { subuserFlowsSync } from "./handlers/subuserFlowsSync.js";

import { login } from './utils/user-login.js';
import { ctxToYaml } from './utils/ctxToYaml.js';

const taskManager = createTaskManager({
  runTaskFn: async (taskId, input, ctx) => {
    //console.log({ t: 'runTaskFn inputs', d: { taskId, input }, ts: Date.now() });
    const yamlString = await ctxToYaml(input);
    const result = await runYamlString(yamlString);
    return result;
  }
});


// db config
import { Client } from 'pg';

// Assume setup.sh has been run, directly connect using generated .env file
let pgClient = App.get('db_nyno_log');
if (!pgClient) {
	const envFilePath = path.resolve('./envs/.nyno_log_db.env'); // from setup.sh
	const {
	  NYNO_DB_NAME: dbName,
	  NYNO_DB_USER: dbUser,
	  NYNO_DB_PASS: dbPass,
	  NYNO_DB_HOST: dbHost = 'localhost',
	  NYNO_DB_PORT: dbPort = '5432'
	} = App.loadEnvVars(envFilePath);

	const dbClient = new Client({
	  user: dbUser,
	  host: dbHost,
	  password: dbPass,
	  port: parseInt(dbPort),
	  database: dbName
	});

	await dbClient.connect();
	App.set('db_nyno_log', dbClient);
    pgClient = App.get('db_nyno_log');
	console.log('[+TCP] Postgres client db_nyno_log connected');
  }

if(!pgClient) throw new Error('Postgres client failed to initialize');


import crypto from "node:crypto";

const authCache = new Map();
const HMAC_KEY = crypto.randomBytes(32); // random on each restart

async function loginCached(ctx, email, password) {
  const auth = email + ':' + password; // this will be hashed and only in memory
  const key = crypto
        .createHmac("sha512", HMAC_KEY)
        .update(auth)
        .digest("hex");

    const cached = authCache.get(key);
    if (cached && cached.expires > Date.now()) {
        return cached.user;
    }

    const user = await login(ctx, email, password);

    if (user) {
        authCache.set(key, {
            user,
            expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        });
    }

    return user;
}



export default function register(app) {

// for "Run Workflow" via HTTP(s) GUI 
  app.get('/api/v1/health', async (req, res) => {
    res.json({status:"OK"});
  });

  // For new subusers
  app.post('/api/v1/users', async (req, res) => {
    if (!envs.SECRET) {
      return res.status(401).json({ error: 'Security secret must be set in envs/ports.env' });
    }
    if (req.headers.authorization !== envs.SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ctx = createCtx(req);
    //console.log('req.body',req.body);
    const result = await users(ctx, req);
    res.json(result[1]);
  });

  // user flows
  // For flows (synchronous) from workflows-enabled
  app.post('/api/v1/:name', async (req, res) => {

    const ctx = createCtx(req);
    const b64 = (req.headers.authorization ?? '').split('Basic ')[1] ?? '';
    if(b64.length == 0) {
      return res.status(401).json({ error: 'Basic auth not set ("Basic Base64Email:Password")' });
    }

    let email, password;
    try {
      const decoded = Buffer.from(b64, "base64").toString("utf8");
      [email, password] = decoded.split(/:(.+)/); // split only on the first ':'
    } catch {
      return res.status(401).json({ error: "Invalid Basic auth encoding" });
    }


    const user = await loginCached(ctx, email,password);
    if(!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    ctx.user_id = user.ID;

    const result = await subuserFlowsSync(ctx, req);
    res.status(result[0]).json(result[1]);
  });

  // For flows (async) from workflows-enabled
  app.post('/api/v1/async/:name', async (req, res) => {
    
    const ctx = createCtx(req);
    const b64 = (req.headers.authorization ?? '').split('Basic ')[1] ?? '';
    if(b64.length == 0) {
      return res.status(401).json({ error: 'Basic auth not set ("Basic Base64Email:Password")' });
    }

    let email, password;
    try {
      const decoded = Buffer.from(b64, "base64").toString("utf8");
      [email, password] = decoded.split(/:(.+)/); // split only on the first ':'
    } catch {
      return res.status(401).json({ error: "Invalid Basic auth encoding" });
    }


    const user = await loginCached(ctx, email,password);
    
    if(!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    ctx.user_id = user.ID;

    const result = await subuserFlows(ctx, req);
    res.status(result[0]).json(result[1]);
  });

  // for HTTP GUI part
  // Returns {taskId} for "Run Workflow" via HTTP(s) GUI 
  app.post('/api/v1/flows/async', async (req, res) => {
    if (!envs.SECRET) {
      return res.status(401).json({ error: 'Security secret must be set in envs/ports.env' });
    }
    if (req.headers.authorization !== envs.SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ctx = createCtx(req);
    const result = await flows(ctx, req);
    res.json(result[1]);
  });

  // Waits and returns full workflow result
  app.post('/api/v1/flows', async (req, res) => {
    if (!envs.SECRET) {
      return res.status(401).json({ error: 'Security secret must be set in envs/ports.env' });
    }
    if (req.headers.authorization !== envs.SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ctx = createCtx(req);
    const result = await flowsSync(ctx, req);
    res.json(result[1]);
  });

  // for "Run Workflow" via HTTP(s) GUI 
  app.get('/api/v1/polling/:taskId', async (req, res) => {
    if (!envs.SECRET) {
      return res.status(401).json({ error: 'Security secret must be set in envs/ports.env' });
    }
    if (req.headers.authorization !== envs.SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ctx = createCtx(req);
    const result = await polling(ctx, req);
    res.json(result[1]);
  });

}



function createCtx(req) {

    let pgClient = App.get('db_nyno_log');

  return {
    db: pgClient,
    tdb: pgClient,
    getTask: (id) => taskManager.getTask(id),
    createTask: (input, ctx) => taskManager.createTask(input, ctx),
  };
}


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
