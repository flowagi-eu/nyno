import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { runFunctionSingle } from './runners.js';
import { runYamlToolParser }  from './runYamlToolParser.js';
import {loadNynoWorkflowFromText} from './functions/yaml-to-object-for-nyno1.js';
import { flattenWorkflow } from './functions/nyno-flatten-function.js';
import { traverseFullGraph } from './functions/testing_paths_idea_nyno4.js';
import { loadStepCommandLangs } from './functions/loadfunctiondatanyno.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function debugLog(...args) {
  if (process.env.NODE_ENV !== 'production') console.log('[DEBUG]', ...args);
}

 
const languageKeyValue = loadStepCommandLangs('../nyno-private-extensions','./extensions','./dist-ts/nyno/extensions','./dist-ts/nyno-private-extensions');
debugLog('languageKeyValue length',Object.keys(languageKeyValue).length);
debugLog('languageKeyValue',(languageKeyValue));
/**
 * Run a workflow from a YAML string content.
 */
export async function runYamlString(text,customContext=null) {
  


  // 1) text to object
  let obj = loadNynoWorkflowFromText(text);
  if(customContext) obj.context = customContext;
  debugLog('obj.context',obj.context);
  
  // Extra var CONTEXT (rarely used: copy the workflow global context as variable to be used in steps)
  if(obj.context && "NYNO_EXTRA_VAR_CONTEXT" in obj.context && obj.context.NYNO_EXTRA_VAR_CONTEXT){
    obj.context.CONTEXT = JSON.parse(JSON.stringify(obj.context));
    
    // except special vars that might need to be set manually
        delete obj.context.CONTEXT['NYNO_ASYNC'];
    delete obj.context.CONTEXT['NYNO_ONE_VAR'];
    delete obj.context.CONTEXT['NYNO_EXTRA_VAR_CONTEXT'];
    
  }
  
  // 2) object to flattened object
  let flattenedObj = flattenWorkflow(obj);
  debugLog('flattenedObj',flattenedObj);

  // 3) execute flatten object
  const dynamicFunctions = {};
  for(const item of obj.workflow) {
    dynamicFunctions[item.id] = async function(step,args,context) {
        context['LAST_STEP'] = step; // special context
        const language = languageKeyValue[step];
        console.log('[DEBUG] dynamicFunctions',JSON.stringify({step,args,context}));

        const resultCode = await runFunctionSingle(language, step, args,context);

        return resultCode;
    };
  }     
  
  console.log('flattenedObj',flattenedObj);

  // 4. actually run the graph
  let workflowResult;
  const startTime = Date.now();
  
  const INSECURE_CORE_DEV_MODE = false; // todo process.args
  let debugStepLog = [];

  try {
    workflowResult = await traverseFullGraph(flattenedObj,dynamicFunctions,debugStepLog,INSECURE_CORE_DEV_MODE);
  } catch(err){
    console.log('critical error',err);
    if(INSECURE_CORE_DEV_MODE){
      return { status:"error_critical", flattenedObj, debugStepLog, execution: {err:String(err)} };
    } else {
      return { status:"error_critical"};
    }
  }

 const endTime = Date.now();

  
 // 5. determine result format
  if(flattenedObj.context && "NYNO_ONE_VAR" in flattenedObj.context) {
     workflowResult = workflowResult.one_var;
  } else {
     workflowResult = workflowResult.result;
  }
  
  const retObj = { status:"ok", execution: workflowResult,execution_time_seconds: (endTime - startTime) / 1000 };
  if(debugStepLog) {
    retObj['debugStepLog'] = debugStepLog;
  }

  return retObj;
}

/**
 * Run a single NYNO/YAML node
 */
/*
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
*/


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
  if (context && 'NYNO_ONE_VAR' in context) {
    return context[context.NYNO_ONE_VAR];
  }
  return { log, context };
}
