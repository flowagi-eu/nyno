import {loadNynoWorkflowFromText} from './yaml-to-object-for-nyno1.js';
import { flattenWorkflow } from './nyno-flatten-function.js';
import { traverseFullGraph } from './testing_paths_idea_nyno4.js';

// full demo in 3 steps

// 1) text to object
let text = `
context:
  URL: https://empowerd.dev
  TOKEN: ABC123

workflow:
  - step: demo-step
    args:
      - \${URL}
      - - deeperKey: \${URL}
    context:
      NODE_VAR: "node_specific_value"
      TOKEN: "NODE_OVERRIDE"

  - step: demo-2
    args:
      - \${URL}
      - - deeperKey: \${URL}
    context:
      NODE_VAR: "node_specific_value"
      TOKEN: "NODE_OVERRIDE"
`;
let obj = loadNynoWorkflowFromText(text);

// 2) object to flattened object
let flattenedObj = flattenWorkflow(obj);

// 3) execute flatten object

// this will be what will ex. call nyno-http-get based on right port
const requestFunction = function(data) {
    return data;
};


import { loadStepCommandLangs } from './loadfunctiondatanyno.js';
const languageKeyValue = loadStepCommandLangs('/home/user/github/nyno/extensions');
console.log(languageKeyValue['hello']);


// runFunctionSingle(language, functionName, args = [],context={})
const dynamicFunctions = {
   '1': async function(step,args,context) { console.log('function 1'); return 0; },
   '2': function() { return 0; },
   '3': function() { return 0; },
   '4': function() { return 0; },
   '5': function() { return 0; },
   '6': function() { return 0; },
   '7': function() { return 0; },
};
let workflowResult = await traverseFullGraph(flattenedObj,dynamicFunctions);
