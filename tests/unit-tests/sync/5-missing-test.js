#!/usr/bin/env node
import { loadNynoWorkflowFromText } from '../../../src/lib-manual/functions/yaml-to-object-for-nyno1.js';
import { flattenWorkflow } from '../../../src/lib-manual/functions/nyno-flatten-function.js';

import { traverseFullGraph } from '../../../src/lib-manual/functions/testing_paths_idea_nyno4.js';


/** ---------------- Full nyno workflow ---------------- */

const text = `
context:
  TOKEN: ABC123

workflow:
  - step: demo-step
    args:
      - \${URL}
      - - deeperKey: \${URL}
    set_context:
      NODE_VAR: "node_specific_value"
      TOKEN: "NODE_OVERRIDE"

  - step: demo-2
    args:
      - \${URL}
      - - deeperKey: \${URL}
    set_context:
      NODE_VAR: "node_specific_value"
      TOKEN: "NODE_OVERRIDE"
`;

const obj = loadNynoWorkflowFromText(text);


  // 2) object to flattened object
const flattenedObj = flattenWorkflow(obj);


let ctx = { ...obj.context };
if (!ctx.__renderedKeys) ctx.__renderedKeys = [];


/** ---------------- Dynamic functions ---------------- */

const isTesting = true;
const dynamicFunctions = {};
for (const node of obj.workflow) {
  const stepId = node.id;
  dynamicFunctions[stepId] = async function(step,args,prevContext={}) {

    const context = prevContext;
    let returnCode = 0;
    if(isTesting) {
        // for testing
        context.prev = { args, step };
    } else {
	
	// todo
    }


    return {
      c: context,
      r: returnCode,
    };

  };
}

/** ---------------- Example usage ---------------- */

  
const customContext = {}; // for fn

  // 1) text to object
  if(customContext) obj.context = customContext;
  
  // Extra var CONTEXT (rarely used: copy the workflow global context as variable to be used in steps)
  if(obj.context && "NYNO_EXTRA_VAR_CONTEXT" in obj.context && obj.context.NYNO_EXTRA_VAR_CONTEXT){
    obj.context.CONTEXT = JSON.parse(JSON.stringify(obj.context));
    
    // except special vars that might need to be set manually
        delete obj.context.CONTEXT['NYNO_ASYNC'];
    delete obj.context.CONTEXT['NYNO_ONE_VAR'];
    delete obj.context.CONTEXT['NYNO_EXTRA_VAR_CONTEXT'];
    
  }
  

  

  // 4. actually run the graph
  let workflowResult;
  const startTime = Date.now();
   
  let result;
  try {
    workflowResult = await traverseFullGraph(flattenedObj,dynamicFunctions);
  } catch(err){
	  console.log('err',err);
    result = { status:"error", execution: {err:String(err)} };
  }

	  let testResultWf = JSON.parse(JSON.stringify(workflowResult));
  if(!result) {
 const endTime = Date.now();
  
 // 5. determine result format
  if(flattenedObj.context && "NYNO_ONE_VAR" in flattenedObj.context) {
     workflowResult = workflowResult.one_var;
  } else {
     workflowResult = workflowResult.result;
  }
  
  result = { status:"ok", execution: workflowResult,execution_time_seconds: (endTime - startTime) / 1000 };
  }

  console.log(JSON.stringify([
    {
      expect: 'Dynamic function 1 uses ${vars} that get replaced',
      input: { text },
      output: { testResultWf }
    }
  ], null, 2));

