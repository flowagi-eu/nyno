#!/usr/bin/env node
import { loadNynoWorkflowFromText } from '../../../src/lib-manual/functions/yaml-to-object-for-nyno1.js';
import { flattenWorkflow } from '../../../src/lib-manual/functions/nyno-flatten-function.js';
import { traverseFullGraph } from '../../../src/lib-manual/functions/testing_paths_idea_nyno4.js';
import * as jsYaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

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
