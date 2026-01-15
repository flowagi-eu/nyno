#!/usr/bin/env node
import { loadNynoWorkflowFromText } from '../../../src/lib-manual/functions/yaml-to-object-for-nyno1.js';
import { flattenWorkflow } from '../../../src/lib-manual/functions/nyno-flatten-function.js';

import { generateDF, renderOnce, getContextValue, renderArgs, replaceNynoVariables } from '../../../src/lib-manual/functions/blabla.js';

/** ---------------- Full nyno workflow ---------------- */

const text = `
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

const obj = loadNynoWorkflowFromText(text);
const flattenedObj = flattenWorkflow(obj);


let ctx = { ...obj.context };
if (!ctx.__renderedKeys) ctx.__renderedKeys = [];


/** ---------------- Dynamic functions ---------------- */

const IS_TESTING = true;
const dynamicFunctions = {};
for (const node of obj.workflow) {
  const stepId = node.id;
  dynamicFunctions[stepId] = generateDF(IS_TESTING);
}

/** ---------------- Example usage ---------------- */

(async () => {
  const vars = { PROMPT: 'hello ${KEY1} ${prev}',KEY1:"val1" };
  const arg = ['my idea: ${PROMPT}', 'another with prev: ${prev}'];
  let context = { ...vars, __renderedKeys: [] };

  const dynamicFunction1 = dynamicFunctions['1'];
  const dynamicFunction2 = dynamicFunctions['2'];

  const function1Result = await dynamicFunction1(1, arg, context);
  context = function1Result.c;
  const contextAfterFunc1 = JSON.parse(JSON.stringify(context));

  const function2Result = await dynamicFunction2(2, arg, context);
  context = function2Result.c;
  const contextAfterFunc2 = JSON.parse(JSON.stringify(context));

  console.log(JSON.stringify([
    {
      expect: 'Dynamic function 1 uses ${vars} that get replaced',
      input: { step: '1', arg, vars },
      output: { contextAfterFunc1 }
    },
    {
      expect: 'Dynamic function 2 uses ${prev} that will not get replaced later',
      input: { step: '2', arg, contextAfterFunc1 },
      output: { contextAfterFunc2 }
    }
  ], null, 2));
})();

