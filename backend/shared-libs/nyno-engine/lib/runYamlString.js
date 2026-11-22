import yaml, {dump} from 'js-yaml';

// custom modules
import { refineNynoObject} from './functions/yaml-to-object-for-nyno1.js';
import { flattenWorkflow } from './functions/nyno-flatten-function.js';
import { traverseFullGraph } from './functions/testing_paths_idea_nyno8.js';
import { processJob, loadAllExtensions } from './worker.js';

/**
 * Run a workflow from a YAML string content.
 */
export async function runYamlString(dirs,yamlObj,customContext=null) {

  // 1) text to object
  let obj = refineNynoObject(yamlObj);

if (obj.context === undefined || obj.context === null) {
  obj.context = {};
}

  // add custom context like .SYSTEM
  if(customContext) {
    for(const key of Object.keys(customContext)){
      obj.context[key] = customContext[key];
    }
  }

  console.log(JSON.stringify({
    'obj.context keys': Object.keys(obj.context).length
    }));

  // Custom mode NYNO_INC_WORKFLOW (to include workflow in contex, needs securitty masking SYSTEM)
  //if(obj.context && "NYNO_INC_WORKFLOW" in obj.context && obj.context.NYNO_INC_WORKFLOW){
	//obj.context.NYNO_WORKFLOW_OBJ = JSON.parse(JSON.stringify(yamlObj));
  //}
  
  // Extra var CONTEXT (rarely used: copy the workflow global context as variable to be used in steps)
  /*
  if(obj.context && "NYNO_EXTRA_VAR_CONTEXT" in obj.context && obj.context.NYNO_EXTRA_VAR_CONTEXT){
    obj.context.CONTEXT = JSON.parse(JSON.stringify(obj.context));
    
    // except special vars that might need to be set manually
    delete obj.context.CONTEXT['NYNO_ASYNC'];
    delete obj.context.CONTEXT['NYNO_ONE_VAR'];
    delete obj.context.CONTEXT['NYNO_EXTRA_VAR_CONTEXT'];
    
  }
  */
  
  // 2) object to flattened object
  let flattenedObj = flattenWorkflow(obj);


console.log(JSON.stringify({
    'flattenedObj steps': flattenedObj.steps.length
    }));
  

const steps = Array.from(new Set(Object.values(flattenedObj.steps).filter(v => typeof v === "string")));

// console.log(JSON.stringify({ts:Date.now(), t: 'flattenObj shape',d:{steps, flattenedObj}})); 

  const FUNCTIONS = await loadAllExtensions(dirs);

  // 3) execute flatten object
  const dynamicFunctions = {};
  for(const item of obj.workflow) {
    dynamicFunctions[item.id] = async function(step,args,context) {
	try { 
	

        context['LAST_STEP'] = step; // special context
          // Normal agentless runner step
        const res = await processJob(FUNCTIONS,step, args,context);

  console.log(JSON.stringify({
    'res code in dynmamicFunc': res[0]
    }));


	return res; // [retCode,deltaObj]
	} catch(err) {
		console.log('critical error',err);
		return [-1, { error: "critical fn error"}];;
	}
    }
  }     
  

  // 4. actually run the graph
  let workflowResult;
  const startTime = Date.now();
  
const INSECURE_CORE_DEV_MODE = ['1', 'true', 'yes'].includes(process.env.INSECURE_CORE_DEV_MODE);
  let debugStepLog = [];

if(true) {

 // common, 99% 
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
}

 const endTime = Date.now();

  
 // 5. determine result format
  if(flattenedObj.context && "NYNO_ONE_VAR" in flattenedObj.context) {
  	// early return for one var
     //workflowResult = workflowResult.one_var;
     const short = { execution: workflowResult.one_var };
	return short;
  } else {
     workflowResult = workflowResult.result;
  }



  let status = 'ok';
  // hotfix because forceStop was not reliable
  for(const nodeRes of workflowResult){
    if(nodeRes?.output?.r == -1){
        status = 'error';
    }
  }

  const lastNode = workflowResult[workflowResult.length-1];
  // hotfix is last node is non zero
  if(lastNode?.output?.r !== 0) {
	status = 'error';
  }
  
  const retObj = { status, execution: workflowResult,time: (endTime - startTime) / 1000, time_meta: {start_ms: startTime, end_ms: endTime} };
  if(INSECURE_CORE_DEV_MODE && debugStepLog) {
    retObj['debugStepLog'] = debugStepLog;
  }

  return maskSecretsAndDeleteInternal(retObj);
}


function maskSecretsAndDeleteInternal(data, patterns = ["API_", "SECRET_"]) {
  const internalKeys = new Set(["SYSTEM","__renderedKeys", "workflowId", "__n_id"]);

  function walk(obj) {
    if (!obj || typeof obj !== "object") return;

    if (Array.isArray(obj)) {
      for (const item of obj) {
        walk(item);
      }
      return;
    }

    for (const key of Object.keys(obj)) {
      if (internalKeys.has(key)) {
        delete obj[key];
        continue;
      }

      if (patterns.some(pattern => key.includes(pattern))) {
        obj[key] = "**********";
        continue;
      }

      walk(obj[key]);
    }
  }

  walk(data);
  return data;
}


// direct execution for isolated agentless runner

if (import.meta.main) {

  if (process.argv.length !== 3) {
    console.log({
      error: 96,
      src: "cli",
      usage: "bun [script] [dirsJson], YAML must be provided via stdin"
    });
    process.exit(1);
  }

  const dirs = JSON.parse(process.argv[2]);

  let text = "";
  for await (const chunk of process.stdin) {
    text += chunk;
  }

  const yamlObj = yaml.load(text);

	const res = await runYamlString(dirs,yamlObj,yamlObj.context ?? {});
	console.log(JSON.stringify(res));
        process.exit(0); // should not be needed but good to keep for forgotten dbClients
}
