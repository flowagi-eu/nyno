#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import * as jsYaml from "js-yaml";

/**
 * Get all original context keys in a workflow (global + node contexts)
 * @param {object} workflowData
 * @returns {Set<string>}
 */
export function getOriginalKeys(workflowData) {
  const keys = new Set();

  if (workflowData.context && typeof workflowData.context === "object") {
    Object.keys(workflowData.context).forEach(k => keys.add(k));
  }

  if (Array.isArray(workflowData.workflow)) {
    for (const node of workflowData.workflow) {

	    // collect original keys from context, ex. same as with args
      if (node.context && typeof node.context === "object") {
        Object.keys(node.context).forEach(k => keys.add(k));
      }


	     // collect original keys from args, ex. if you use - offset: ${OFFSET} it will add offset to the original keys to replace

	    if (node.args) {
  const collectKeys = (v) => {
    if (Array.isArray(v)) v.forEach(collectKeys);
    else if (v && typeof v === "object") Object.keys(v).forEach(k => {
      keys.add(k);
      collectKeys(v[k]);
    });
  };
  collectKeys(node.args);
}

    }
  }

  return keys;
}

/**
 * runYamlToolParser
 * - Deeply replaces ${VARIABLE} in context and args
 * - Only replaces variables in keys that existed in the original workflow
 * - Only tracks missing variables for original keys
 */
export function runYamlToolParser(node, globalContext = {}, options = {}) {
  const nodeName = node.step;

  if (!("step" in node)) return { error: true, missing: '.step', output: { r: "", c: globalContext } };

  const rawArgs = node.args || [];
  const unreplaced = new Set();
  const maxDepth = options.maxDepth ?? 4;

  const mergedContext = { ...globalContext, ...(node.context || {}) };
  const originalKeys = options.originalKeys || new Set(Object.keys(mergedContext));

  const replaceValue = (value, key = null, depth = 0) => {
    if (depth > maxDepth) return value;

    if (Array.isArray(value)) return value.map(v => replaceValue(v, key, depth + 1));

    if (value && typeof value === "object") {
      const out = {};
      for (const k of Object.keys(value)) {
	      //console.log('object detected',value);
        // Only replace keys present in originalKeys
        if (originalKeys.has(k)) {
		//console.log('key in originalKeys', k , value[k]);
          out[k] = replaceValue(value[k], k, depth + 1);
        } else {
          out[k] = value[k]; // leave new/dynamic keys untouched
        }
      }
      return out;
    }

    if (typeof value !== "string") return value;

    // Full string is a variable
    const wholeVarMatch = value.match(/^\$\{(\w+)\}$/);
    if (wholeVarMatch) {
      const varKey = wholeVarMatch[1];
	   // console.log('wholeVarMatch varKey',varKey);
      if (key && originalKeys.has(key) && !(varKey in mergedContext)) {
        unreplaced.add(varKey);
        return "";
      }
      return replaceValue(mergedContext[varKey], key, depth + 1);
    }

    // Partial variable replacement in strings
    return value.replace(/\$\{(\w+)\}/g, (_, varKey) => {
	    //console.log('varKey and value',varKey,value);
      if (key && originalKeys.has(key) && !(varKey in mergedContext)) {
        unreplaced.add(varKey);
        return "";
      }
      const val = mergedContext[varKey];
      if (typeof val === "object") return JSON.stringify(replaceValue(val, key, depth + 1));
      return String(replaceValue(val, key, depth + 1));
    });
  };

  node.context = replaceValue(mergedContext);
  const args = replaceValue(rawArgs);

  if (unreplaced.size > 0) {
    return { error: true, missing: [...unreplaced], output: { r: "", c: mergedContext } };
  }

  return { error: false, step: nodeName, args, context: node.context };
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
`;

  const doc = jsYaml.load(yamlText);
  const context = doc.context || {};

  console.log("Global context loaded:", context);

  // Compute original workflow keys
  const originalKeys = getOriginalKeys(doc);

  // Add dynamic key after loading the workflow
  doc.context.dynamic_key = "${TOKEN}"; // new key, should NOT be replaced

  console.log("\nOriginal keys:", [...originalKeys]);
  console.log("Workflow context before parser:", doc.context);

  for (const node of doc.workflow || []) {
    const result = runYamlToolParser(node, doc.context, {
      maxDepth: 4,
      originalKeys
    });

    console.log("\n=== Node Result ===");
    console.dir(result, { depth: 20, colors: true });
  }

  console.log("\nFinal workflow context after parser:");
  console.dir(doc.context, { depth: 20, colors: true });
}
