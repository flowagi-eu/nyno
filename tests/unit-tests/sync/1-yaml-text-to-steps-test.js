#!/usr/bin/env node
import { loadNynoWorkflowFromText } from '../../../src/lib-manual/functions/yaml-to-object-for-nyno1.js';

import * as jsYaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

/** ---------------- Full nyno workflow ---------------- */

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
let steps = [];
for(const step of obj.workflow){
	steps.push(step.step);
}
console.log(JSON.stringify({
	expect: "Input YAML text turns into steps", 
	input: {text}, 
	output: {steps}
}));
