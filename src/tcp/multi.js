import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { runFunction } from '../lib-manual/runners.js';
import { runYamlToolParser,getOriginalKeys }  from '../lib-manual/runYamlToolParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function debugLog(...args) {
  if (process.env.NODE_ENV !== 'production') console.log('[DEBUG]', ...args);
}


/**
 * Run a workflow from a YAML string content.
 * @param {string} yamlContent - The full YAML workflow as string
 * @param {object} context - Optional initial context
 */
export async function runYamlString(yamlContent) {
  let workflowData;
  try {
    workflowData = yaml.load(yamlContent);
  } catch (err) {
    return { error: true, message: 'Invalid YAML', details: err.message };
  }

  return runWorkflow(workflowData, null, workflowData.context ?? {});
}

/**
 * Run a single NYNO/YAML node
 */
export async function runYamlTool(node, globalContext = {},options={}) {

  let parsed = runYamlToolParser(node,globalContext,options);
  if(parsed.error) return parsed;

	  const nodeName = node.step || node.func;
	const { step, args, context } = parsed;

  debugLog(`Executing step: ${nodeName} with args:`, args);

  const output = await runFunction(nodeName, args, context);
  console.log('output runFunction',output);
  if (!output.fnError) {
    return { output, command: [nodeName, ...args] };
  }

  return await new Promise((resolve) => {
    const child = spawn(nodeName, args);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));

    child.on('error', (err) => {
      debugLog(`Failed to start command ${nodeName}:`, err.message);
      resolve({ error: stderr, errMsg: err.message, command: [nodeName, ...args], output: { r: '', c: context }, bash: true });
    });

    child.on('close', (exitCode) => {
      const outputStr = stdout.trim();
      context[`O_${node.id}`] = outputStr;
      resolve({
        command: [nodeName, ...args],
        bash: true,
        stderr: stderr.trim(),
        output: { r: outputStr, c: context },
        exitCode,
      });
    });
  });
}

/**
 * Run a NYNO workflow
 */
export async function runWorkflow(workflowData, startNodeId, context = {}) {
  const log = [];

  const originalKeys = getOriginalKeys(workflowData);
  console.log('originalKeys in runWorkflow',originalKeys);


  // Convert workflow array into nodeMap keyed by id
  const nodes = {};
  let lastNode = 0;
  for (const step of workflowData.workflow) {
    if(!("id" in step)) {
	lastNode++;
	step.id = lastNode;
    } else {
	lastNode = step.id;
    }
    nodes[lastNode] = { ...step };
  }

  // Build nextMap for multiple branches
  for (const node of Object.values(nodes)) {
    if (node.next && Array.isArray(node.next)) {
      node.nextMap = {};
      node.next.forEach((n, i) => (node.nextMap[i.toString()] = n));
      delete node.next;

      console.log('new node with nextMap',JSON.stringify(node));
    }
  }

  let current = startNodeId || workflowData.workflow[0]?.id;
  debugLog(`Starting workflow with node: ${current}`);

  while (current && nodes[current]) {
    const node = nodes[current];

    const input = JSON.parse(JSON.stringify(context));

    console.log('node before ruNYamlTool',node);
    const result = await runYamlTool(node, context,{originalKeys});

    console.log('result',JSON.stringify(result));
    const output = result.output.r;
    context = JSON.parse(JSON.stringify(result.output.c ?? {}));

    console.log('context in the loop',context);
    context[`O_${node.id}`] = output;

    const details = JSON.parse(JSON.stringify(result));
    details.node_id = node.id;
    details.node_title = node.step || node.func;
    details.new_context = details.output.c;
    delete details.output;
        console.log('details in the loop',details);


    log.push({ input, output, details });

    if("error" in details) break; // early access

    console.log('nextMapKey output', output);
    const nextMapKey = output || '0';
    console.log('nextMapKey value',nextMapKey);
    if (node.nextMap) {
      current = node.nextMap[nextMapKey] ?? node.nextMap['0'] ?? null;
    } else if (node.next && node.next.length > 0) {
      current = node.next[0];
    } else {
      current = null;
    }
  }

  debugLog('Workflow finished');
  if ('NYNO_ONE_VAR' in context) {
    return context[context.NYNO_ONE_VAR];
  }
  return { log, context };
}

/**
 * Multi-tenant NYNO route registration
 */
export default function register(router) {


  router.on('/run-nyno', async (socket, data) => {
    if (!socket.authenticated) return { error: 'Not authenticated' };

    const { yamlContent } = data;
    if (!yamlContent) return { error: 'No YAML content provided' };

 
	 console.log('got data',data);
    const startTime = Date.now();
    const result = await runYamlString(yamlContent);
	 console.log('got result',result);
    const endTime = Date.now();

    return {
      route: '/run-nyno',
      status: result.error ? 'error' : 'ok',
      execution_time_seconds: (endTime - startTime) / 1000,
      execution: result.log ?? [],
      context: result.context ?? {},
      error: result.error,
      errorMessage: result.message,
    };
  });


  // load dynamic routes
  const routesDir = path.join(__dirname, '../../workflows-enabled');

  const loadWorkflowsFromDir = (systemPath, systemName) => {
    const workflows = {};
    for (const file of fs.readdirSync(systemPath)) {
      if (!file.endsWith('.nyno')) continue;

      const workflowData = yaml.load(fs.readFileSync(path.join(systemPath, file), 'utf-8'));
      workflows[file] = workflowData;

      const routePath = workflowData.route || '/' + path.basename(file, '.nyno');
      router.on(routePath, async (socket, data) => {
        if (!socket.authenticated) return { error: 'Not authenticated' };
        const context = { ...data };
        delete context['path'];
        if (systemName) socket.system = systemName;

        const startTime = Date.now();
        const result = await runWorkflow(workflowData, null, context);
        const endTime = Date.now();

        return {
          route: routePath,
          system: systemName || socket.system || 'default',
          status: 'ok',
          execution_time_seconds: (endTime - startTime) / 1000,
          execution: result.log,
          context: result.context,
        };
      }, systemName);
    }
    return workflows;
  };

  // Load tenant workflows
  for (const system of fs.readdirSync(routesDir)) {
    const systemPath = path.join(routesDir, system);
    if (!fs.statSync(systemPath).isDirectory()) continue;
    loadWorkflowsFromDir(systemPath, system);
  }

  // Load default workflows
  loadWorkflowsFromDir(routesDir, 'default');
}
