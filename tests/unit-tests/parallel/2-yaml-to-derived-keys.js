#!/usr/bin/env node
// -----------------------------
// The Purpose of this test is to proof that we can run the flattenWorkflow function
// in order to convert YAML=>Object=>Flattened Object
//
// No specific assertions, just a light test to see if the basics work.
// -----------------------------

import { loadNynoWorkflowFromText } from '../../../src/lib-manual/functions/yaml-to-object-for-nyno1.js';
import { flattenWorkflow } from '../../../src/lib-manual/functions/nyno-flatten-function.js';


  // 1) Text to object
  let text = `
context:
  URL: https://empowerd.dev
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

  let obj = loadNynoWorkflowFromText(text);

  // 2) Flatten object
  let flattenedObj = flattenWorkflow(obj);
console.log(JSON.stringify({
	expect: "Input YAML text turns into derived_keys", 
	input: {text}, 
	output: {derived_keys:Object.keys(flattenedObj)}
}));
