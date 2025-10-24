import fs from 'fs';
import { runFunction } from '../lib-manual/runners.js';
import App from '../App.js';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { spawn,spawnSync } from 'child_process';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function debugLog(...args) {
	if(process.env.NODE_ENV!=='production') {
  		console.log('[DEBUG]', ...args);
	}
}

/**
 * Run a single YAML node
 */
export async function runYamlTool(node, context = {}) {

  let nodeName = node.func;
  let yamlContent = node.info ?? '';
  let node_id = node.id ?? '';

  // if its empty return early
	if(yamlContent.trim().length==0) return {"output":{"r":"","c":context}};

  debugLog(`Running YAML node: ${nodeName}`);
  debugLog('Context before execution:', context);

  let cmdName, cmdSpec, args;
  if(!yamlContent.includes(':')){
	// assume its command without args
	cmdName = yamlContent.trim();
	args = [];
	cmdSpec = {};
  } else {
  try {
    const doc = yaml.load(yamlContent);
    debugLog('Parsed YAML:', doc);

    if (!doc || typeof doc !== 'object' || Object.keys(doc).length !== 1) {
      return { error: 'YAML must contain exactly one top-level command.' };
    }

    cmdName = Object.keys(doc)[0];
    cmdSpec = doc[cmdName];
    args = [];

  }
	catch (err) {
    debugLog(`Error parsing YAML for node ${nodeName}:`, err.message);
    return { error: err.message };
    //return { error: err.message,nodeName,context };
  }
  }


const unreplaced = [];

const replaceEnv = (value) => {
  // Match exactly one variable like "${VAR}"
  const onlyVarMatch = value.match(/^\$\{(\w+)\}$/);
  if (onlyVarMatch) {
    const key = onlyVarMatch[1];
    if (!(key in context)) {
      unreplaced.push(key);
      return '';
    }
    const val = context[key];

    // If val is an object/array, return it directly
    if (typeof val === 'object' && val !== null) {
      return val;
    }

    // Otherwise, return the value as-is
    return val;
  }

  // Otherwise, replace variables inside a string
  return value.replace(/\$\{(\w+)\}/g, (_, key) => {
    if (!(key in context)) {
      unreplaced.push(key);
      return '';
    }

    const val = context[key];

    // If object/array, convert to JSON string for safe embedding
    if (typeof val === 'object' && val !== null) {
      return JSON.stringify(val);
    }

    return String(val);
  });
};



if (cmdSpec.flags) {
  for (const key in cmdSpec.flags) {
    const val = cmdSpec.flags[key];
    if (Array.isArray(val)) {
      for (const item of val) {
        args.push(key.length === 1 ? `-${key}` : `--${key}`);
        args.push(replaceEnv(String(item)));
      }
    } else {
      args.push(key.length === 1 ? `-${key}` : `--${key}`);
      if (val != null) args.push(replaceEnv(String(val)));
    }
  }
}

if (cmdSpec.args) {
  for (const item of cmdSpec.args) {
    args.push(replaceEnv(String(item)));
  }
}

if (unreplaced.length > 0) {
  return { error: true,output:{r:'',c:context}, missing: [...new Set(unreplaced)] };
}

    debugLog(`Executing command: ${cmdName} with args:`, args);


    // First check extensions/py/php/js.. 
	const output = await runFunction(cmdName, args,context);
	 debugLog('runFunction',{output});

	if(!output.fnError) {
	  return {
          command: [cmdName, ...args],
          context,
          output,
	  };
	}

    return await new Promise((resolve) => {
      const child = spawn(cmdName, args);
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => (stdout += chunk));
      child.stderr.on('data', (chunk) => (stderr += chunk));

      child.on('error', (err) => {
        debugLog(`Failed to start command ${cmdName}:`, err.message);
        //resolve({ error: err.message });
    	resolve({ error: stderr, errMsg: err.message,cmdName,args,output:{r:'',c:context},bash:true, });
      });

      child.on('close', (exitCode) => {
        const output = stdout.trim();
        context[`O_${node_id}`] = output;
        debugLog(`Command finished: ${cmdName} exitCode=${exitCode}`);
        debugLog('stdout:', stdout.trim());
        debugLog('stderr:', stderr.trim());
        debugLog('Context after execution:', context);

        resolve({
          command: [cmdName, ...args],
          bash:true,
          stderr:stderr.trim(),
          output:{r:output,c:context},
          exitCode,
        });
      });
    });
   
}

/**
 * Run a workflow from start node
 */
export async function runWorkflow(workflow, startNodeId, context = {}) {
  const nodes = Object.fromEntries(workflow.nodes.map((n) => [n.id, n]));
  const log = [];
  let current = startNodeId;

  debugLog(`Starting workflow at node: ${startNodeId}`);

  while (current && nodes[current]) {
    const node = nodes[current];
    debugLog(`Processing node: ${node.id} (${node.func})`);

    const input = JSON.parse(JSON.stringify(context));
    
    const yamlOutput = await runYamlTool(node, context);

     const outputValue =
      typeof yamlOutput.output === 'string' ? yamlOutput.output : JSON.stringify(yamlOutput.output);
 


      debugLog('yamlOutput',yamlOutput);

      const output = yamlOutput.output.r;

    context = JSON.parse(JSON.stringify(yamlOutput.output.c ?? {})); // sync next context changes
    context[`O_${node.id}`] = output;

    const details = JSON.parse(JSON.stringify(yamlOutput)); // clone

    details['node_id'] = node.id;
    details['node_title'] = node.func;

    details['new_context'] = details.output.c;
    // remove double info
    delete details['output'];

    //delete yamlOutput['output'];
    log.push({
      input,
      output,
      details, 
    });

       debugLog(`Node output: ${outputValue}`);

	  const nextMap = JSON.parse(outputValue).r ?? '';
    if (node.type === 'multiIf' && node.nextMap) {
      current = node.nextMap[nextMap] ?? node.nextMap['0'] ?? null;
      debugLog(`Next node determined by multiIf: ${current}`);
    } else {
      current = node.next ?? null;
      debugLog(`Next node: ${current}`);
    }
  }

  debugLog('Workflow finished');
  return { log, context };
}

/**
 * Multi-tenant route registration (pre-register all routes)
 */
export default function register(router) {
  const tenantRoutes = {}; // { system: Map<route, handler> }
  const defaultRoutes = {};

  const routesDir = path.join(__dirname, '../../workflows-enabled');

  // --- Load tenant directories ---
  for (const system of fs.readdirSync(routesDir)) {
    const systemPath = path.join(routesDir, system);
    //debugLog(`Trying Loading workflows for tenant path: ${systemPath}`);
    if (!fs.statSync(systemPath).isDirectory()) continue;
    //debugLog(`is dir: ${systemPath}`);

    tenantRoutes[system] = {};

    for (const file of fs.readdirSync(systemPath)) {
      //debugLog(`is file: ${file}`);
      if (!file.endsWith('.json')) continue;

      const workflow = JSON.parse(fs.readFileSync(path.join(systemPath, file), 'utf-8'));
      generateNextMaps(workflow);
      registerWorkflow(tenantRoutes[system], workflow, system);
      debugLog(`Loaded workflow for tenant ${system}: ${file}`);
    }
  }

  // --- Load default routes ---
  for (const file of fs.readdirSync(routesDir)) {
    const fullPath = path.join(routesDir, file);
    if (fs.statSync(fullPath).isFile() && file.endsWith('.json')) {
      const workflow = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
      generateNextMaps(workflow);
      registerWorkflow(defaultRoutes, workflow);
      debugLog(`Loaded default workflow: ${file}`);
    }
  }

  function registerWorkflow(map, workflow, system = 'default') {
    for (const node of workflow.nodes) {
      if (!node.func.startsWith('route_')) continue;
      const route = '/' + node.func.slice('route_'.length).replace(/^\/+/, '');
      router.on(route, async (socket, data) => {
        if (!socket.authenticated) return { error: 'Not authenticated' };

        const context = { ...data };
        delete context['path']; // not needed for workflows themselves
        if (system) socket.system = system;

        const startTime = Date.now();
        const result = await runWorkflow(workflow, node.id, context);
        const endTime = Date.now();

        return {
          route,
          system: system || socket.system || 'default',
          status: 'ok',
          execution_time_seconds: (endTime - startTime) / 1000,
          execution: result.log,
          context: result.c,
        };
      },system);
    }
  }

  function generateNextMaps(workflow) {
    const nodesById = Object.fromEntries(workflow.nodes.map((n) => [n.id, n]));
    const childrenMap = {};
    for (const edge of workflow.edges || []) {
      if (!childrenMap[edge.source]) childrenMap[edge.source] = [];
      childrenMap[edge.source].push(edge.target);
    }

    for (const node of workflow.nodes) {
      const targets = childrenMap[node.id] || [];
      if (targets.length > 1) {
        targets.sort((a, b) => (nodesById[a].position?.x || 0) - (nodesById[b].position?.x || 0));
        node.nextMap = {};
        targets.forEach((t, i) => (node.nextMap[i.toString()] = t));
        delete node.next;
        node.type = 'multiIf';
        debugLog(`Node ${node.id} converted to multiIf with nextMap`, node.nextMap);
      }
    }
  }
}

