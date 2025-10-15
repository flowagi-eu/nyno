import fs from 'fs';
import App from '../App.js';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function debugLog(...args) {
  console.log('[DEBUG]', ...args);
}

/**
 * Run a single YAML node
 */
export async function runYamlTool(nodeName, yamlContent, context = {}) {
  debugLog(`Running YAML node: ${nodeName}`);
  debugLog('Context before execution:', context);

  try {
    const doc = yaml.load(yamlContent);
    debugLog('Parsed YAML:', doc);

    if (!doc || typeof doc !== 'object' || Object.keys(doc).length !== 1) {
      return { error: 'YAML must contain exactly one top-level command.' };
    }

    const cmdName = Object.keys(doc)[0];
    const cmdSpec = doc[cmdName];
    const args = [];

	  console.log('context JSON = ',context['JSON']);

    const replaceEnv = (value) =>
  value.replace(/\$\{(\w+)\}/g, (_, key) => {
    const val = context[key];
    if (val === undefined) return '';
    // If it's an object (including arrays), stringify it
    if (typeof val === 'object' && val !== null) {
      return JSON.stringify(val);
    }
    return String(val); // convert everything else to string
  });


    if (cmdSpec.flags) {
      for (const key in cmdSpec.flags) {
        const val = cmdSpec.flags[key];
	      console.log('cmd flag key',key);
	      console.log('cmd flag val',val);
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
	      console.log('cmd args item',item);
        args.push(replaceEnv(String(item)));
      }
    }

    debugLog(`Executing command: ${cmdName} ${args.join(' ')}`);

    // Extensions are checked first for custom command, else default to Linux
    const extensions = App.get('extensions');
    if(cmdName in extensions) {

	console.log("Executing extension command", {cmdName, args,context});
	const output =  await extensions[cmdName].command(args,context);
	  return {
          command: [cmdName, ...args],
          extension:true,
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
        resolve({ error: err.message });
      });

      child.on('close', (exitCode) => {
        const output = stdout.trim();
        context[`${cmdName.toUpperCase()}_OUTPUT`] = output;
        debugLog(`Command finished: ${cmdName} exitCode=${exitCode}`);
        debugLog('stdout:', stdout.trim());
        debugLog('stderr:', stderr.trim());
        debugLog('Context after execution:', context);

        resolve({
          command: [cmdName, ...args],
          context,
          output,
          error: stderr.trim(),
          exitCode,
        });
      });
    });
  } catch (err) {
    debugLog(`Error parsing YAML for node ${nodeName}:`, err.message);
    return { error: err.message };
  }
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

    const yamlOutput = await runYamlTool(node.func, node.info ?? '', context);
    const outputValue =
      typeof yamlOutput.output === 'string' ? yamlOutput.output : JSON.stringify(yamlOutput.output);

    context[`${node.func.toUpperCase()}_OUTPUT`] = outputValue;

    log.push({
      node: node.id,
      func: node.func,
      yaml_output: yamlOutput,
      raw_output: outputValue,
    });

    debugLog(`Node output: ${outputValue}`);

    if (node.type === 'multiIf' && node.nextMap) {
      current = node.nextMap[outputValue] ?? node.nextMap['0'] ?? null;
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

  const routesDir = path.join(__dirname, 'routes');

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
          context: result.context,
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

