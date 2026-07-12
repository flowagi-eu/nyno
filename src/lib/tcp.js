// pubic modules
import yaml from 'js-yaml';
import { spawn } from "child_process";


// private modules
import { createTCPServer } from "./tcp/server.js";
import { createTaskManager } from './tasks-util/index.js';

// this should be rewrite for multi-tcp legacy way
import { runYamlString } from '../lib-manual/runYamlString.js';

const dirs = [process.env.NYNO_CORE_PLUGINS_DIR, process.env.NYNO_TENANT1_DIR];

const taskManager = createTaskManager({
  runTaskFn: async (taskId, input, ctx) => {
    const { text, json } = input;
    if (!text && !json) throw new Error('No .text (YAML) / .json (JSON) data provided');

    let isJson, workflowObj;
    if (json) {
      isJson = true;
      workflowObj = yaml.dump(json);
    } else {
      isJson = false;
      workflowObj = (text);
    }
   
    return await runYamlString(workflowObj);
  }
});

const port = process.env.NYNO_TCP_MAIN_PORT ?? 9024;
console.log('creating TCPserver on',port);
await createTCPServer({
  secret: process.env.SECRET ?? "change_me",
  host: process.env.NYNO_TCP_MAIN_HOST ?? '0.0.0.0',
  port,

  handler: async ({ type, data }) => {
    if (type === "q") {
      return { "status": "OK" };
    }
    if (type === "t") {
      const taskId = taskManager.createTask(data, {});
      return { taskId };
    }
    if (type === "p") {
      const { taskId } = data;
      const task = taskManager.getTask(taskId);
      if (!task) return { error: "Task not found" };
      return task;
    }
    if (type === "n") {
      const { text, json } = data;
	console.log(JSON.stringify({t: 'n_rec', d:{text,json}}));
      if (!text && !json) return { error: 'No .text (YAML) / .json (JSON) data provided' };

      let isJson, workflowObj;
      if (json) {
        isJson = true;
        workflowObj = yaml.dump(json);
      } else {
        isJson = false;
        workflowObj = (text);
      }


      
      const wfRes1 = await runYamlString(workflowObj);
      return wfRes1;
    }

    return { error: "unknown opcode" };
  }
});
console.log('created TCPserver on port ',port);
