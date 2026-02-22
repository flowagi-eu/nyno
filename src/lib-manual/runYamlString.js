import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { runFunctionSingle,generateUUIDv7 } from './runners.js';
import {loadNynoWorkflowFromText} from './functions/yaml-to-object-for-nyno1.js';
import { flattenWorkflow } from './functions/nyno-flatten-function.js';
import { traverseFullGraph } from './functions/testing_paths_idea_nyno4.js';
import { loadStepCommandLangs } from './functions/loadfunctiondatanyno.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pendingEvents = new Map();

function debugLog(...args) {
  if (process.env.NODE_ENV !== 'production') console.log('[DEBUG]', ...args);
}

 
export function emitEvent(eventName,data={}) {
  const key = String(eventName);
  const waiters = pendingEvents.get(key);

  if (!waiters || waiters.size === 0) {
    console.log("[emitEvent] no waiters for:", key);
    return;
  }

  for (const resolve of waiters) {
    resolve(data);
  }

  pendingEvents.delete(key); // single-shot consume
}


export function waitForEvent(eventName, timeoutMs = 60000) {
  const key = String(eventName);

  return new Promise((resolve, reject) => {
    let waiters = pendingEvents.get(key);
    if (!waiters) {
      waiters = new Set();
      pendingEvents.set(key, waiters);
    }

    const timeout = setTimeout(() => {
      waiters.delete(resolve);
      if (waiters.size === 0) pendingEvents.delete(key);
      reject(new Error(`Timeout waiting for event '${key}'`));
    }, timeoutMs);

    waiters.add((data) => {
      clearTimeout(timeout);
      resolve(data);
    });
  });
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

      // Event wait step
      if (step.startsWith('nyno-wait-for-event')) {
        const eventName = args[0]; // e.g., step args = ['user-ready']
        console.log(`[EVENT WAIT] Waiting for event '${eventName}'`);

        try {
          const waitCtx = await waitForEvent(eventName, 10000);
          console.log(`[EVENT RECEIVED] Event '${eventName}'`, waitCtx);
          context['prev'] = waitCtx;
          return {r:0,c:context};
        } catch (err) {
          console.log('err',err);
          console.warn(`[EVENT TIMEOUT] Event '${eventName}' never fired`);
          flattenedObj.context.error = (`[EVENT TIMEOUT (10s)] Event '${eventName}' never fired`);
          return {r:-1,c:context};
        }

      } else {
          // Normal TCP runner step
          const language = languageKeyValue[step];
          console.log('[DEBUG] dynamicFunctions',JSON.stringify({step,args,context}));
          const resultCode = await runFunctionSingle(language, step, args,context);
          return resultCode;
      }
    }
  }     
  
  console.log('flattenedObj',flattenedObj);

  // 4. actually run the graph
  let workflowResult;
  flattenedObj.context.workflowId = generateUUIDv7();
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
