import { runYamlString } from './../lib-manual/runYamlString.js';
import fs from 'fs';
const envs = load_nyno_ports();

import YAML from 'js-yaml';

import { createTaskManager } from "./tasks-util/index.js";

import { flows } from './handlers/flows.js';
import { flowsSync } from './handlers/flowsSync.js';
import { polling } from './handlers/polling.js';

const taskManager = createTaskManager({
  runTaskFn: async (taskId, input, ctx) => {

    console.log({ t: 'runTaskFn inputs', d: { taskId, input, ctx }, ts: Date.now() });

    let yamlString;
    if (input.json ?? false) {
      yamlString = YAML.dump(input.json);
    } else if (input.text ?? false) {
      yamlString = input.text;
    }

    const result = await runYamlString(yamlString);
    return result;
  }
});

export default function register(app) {

// for "Run Workflow" via HTTP(s) GUI 
  app.get('/api/v1/health', async (req, res) => {
    res.json({status:"OK"});
  });

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
  return {
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