#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import * as jsYaml from "js-yaml";

/**
 * Refine a NYNO-like workflow object:
 * 1. Ensure all steps have numeric `id` (1,2,3,...)
 * 2. If none of the steps have `next`, autogenerate linear flow.
 */

export function refineNynoObject(obj) {
  if (!obj || typeof obj !== "object") return obj;

  const wf = obj.workflow;
  if (!Array.isArray(wf)) return obj;

  // 1. Assign numeric IDs if missing
  let autoCounter = 1;
  for (const step of wf) {
    if (step.id === undefined || step.id === null) {
      step.id = autoCounter++;
    }
  }

  const allIds = wf.map(s => s.id);

  // 2. Detect if ANY step already has `next`
  const anyHasNext = wf.some(step => step.next !== undefined);

  // If none have next → autogenerate simple linear next chain
  if (!anyHasNext) {
    for (let i = 0; i < wf.length; i++) {
      const step = wf[i];
      if (i < wf.length - 1) {
        step.next = [ wf[i + 1].id ];   // numeric
      } else {
        step.next = []; // last step ends
      }
    }
  }

  return obj;
}

// for now just from YAML + refine object automatically
export function loadNynoWorkflowFromText(text){
    let obj = jsYaml.load(text);
    return refineNynoObject(obj);
}

/* ==================== CLI DEMO ==================== */
if (import.meta.url === `file://${process.argv[1]}`) {
  const yamlText = `
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

  const doc = loadNynoWorkflowFromText(yamlText);
  console.log(doc);
}
