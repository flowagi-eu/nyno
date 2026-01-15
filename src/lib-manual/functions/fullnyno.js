#!/usr/bin/env node
import { loadNynoWorkflowFromText } from './yaml-to-object-for-nyno1.js';
import { flattenWorkflow } from './nyno-flatten-function.js';
import { traverseFullGraph } from './testing_paths_idea_nyno4.js';
import * as jsYaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

/** ---------------- symbol6.js renderOnce engine ---------------- */

function rendered(value) {
  return { __rendered: true, value };
}

function isRendered(v) {
  return v && typeof v === 'object' && v.__rendered;
}

function renderOnce(str, ctx) {
  if (typeof str !== 'string') return str;
  return str.replace(/\$\{(\w+)\}/g, (_, key) => {
    if (!(key in ctx)) return `\${${key}}`;
    const v = ctx[key];
    if (typeof v === 'string') return v;          // preserve nested templates
    if (isRendered(v)) return v.value;           // already rendered
    return String(v);
  });
}

function render(value, ctx) {
  if (isRendered(value)) return value;

  if (typeof value === 'string') return rendered(renderOnce(value, ctx));

  if (Array.isArray(value)) {
    return rendered(value.map(v => render(v, ctx).value));
  }

  if (value && typeof value === 'object') {
    const out = {};
    for (const k in value) out[k] = render(value[k], ctx).value;
    return rendered(out);
  }

  return rendered(value);
}

/** ---------------- replaceNynoVariables using symbol6 method ---------------- */

function replaceNynoVariables(node, prevContext = {}) {
  if (!node || typeof node !== 'object' || !node.step) {
    return { error: true, missing: ['.step'] };
  }

  // Start with previous step context
  const newContext = { ...prevContext };

  // Merge in new step-defined variables
  const nodeContext = node.set_context || {};
  for (const k in nodeContext) {
    newContext[k] = render(nodeContext[k], newContext);
  }

  // Render args using the updated context
  const renderArgs = (value) => {
    if (typeof value === 'string') return render(value, newContext);
    if (Array.isArray(value)) return value.map(renderArgs);
    if (value && typeof value === 'object') {
      const out = {};
      for (const k in value) out[k] = renderArgs(value[k]);
      return out;
    }
    return value;
  };

  const newArgs = renderArgs(node.args);

  return {
    error: false,
    step: node.step,
    context: newContext,
    args: newArgs
  };
}

/** ---------------- Full nyno workflow ---------------- */

async function runFullNyno() {
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
  console.log('fat obj', flattenedObj);

  // 3) Execute flattened workflow using symbol6 replacement
  let ctx = obj.context || {};

  for (const node of flattenedObj.workflow || []) {
    const result = replaceNynoVariables(node, ctx);

    console.log(`============== ${node.step} ================`);
    console.log('Rendered args:', result.args.map(a => (a && a.__rendered ? a.value : a)));
    console.log(
      'Rendered context:',
      Object.fromEntries(
        Object.entries(result.context).map(([k, v]) => [k, isRendered(v) ? v.value : v])
      )
    );

    ctx = result.context;
  }

  // Example: dynamic functions execution
  const dynamicFunctions = {
    '1': async function(step, args, context) { console.log('function 1'); return 0; },
    '2': function() { return 0; },
    '3': function() { return 0; },
  };

  const workflowResult = await traverseFullGraph(flattenedObj, dynamicFunctions);
  console.log('Workflow final result:', workflowResult);
}

runFullNyno();

