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
 * Performs a SINGLE-PASS safe replacement.
 * - Only replaces ${VAR} inside values whose key exists in originalKeys
 * - Tracks missing variables
 * - Never recursively re-evaluates replaced values
 */
export function replaceNynoVariables(node, options = {}) {
  if (!node || typeof node !== "object" || !node.step) {
    return { error: true, missing: [".step"] };
  }

  const mergedContext = node.context || {};
  const originalKeys = options.originalKeys || new Set();
  const unreplaced = new Set();

  /**
   * Replace ${VAR} inside a string (pure, no recursion)
   */
const replaceString = (str, key) => {
  // Check for full variable match: "${VAR}"
  const wholeVarMatch = str.match(/^\$\{(\w+)\}$/);
  if (wholeVarMatch) {
    const varKey = wholeVarMatch[1];
    if (key && originalKeys.has(key) && !(varKey in mergedContext)) {
      unreplaced.add(varKey);
      return "";
    }
    // Return the raw value (object/array/string as-is)
    return mergedContext[varKey];
  }

  // Partial replacements: "text ${VAR} more text"
  return str.replace(/\$\{(\w+)\}/g, (_, varKey) => {
    if (key && originalKeys.has(key) && !(varKey in mergedContext)) {
      unreplaced.add(varKey);
      return "";
    }
    const val = mergedContext[varKey];
    return typeof val === "object" ? JSON.stringify(val) : String(val);
  });
};


  /**
   * Walk the structure once, replacing strings
   */
  const walk = (value, key = null) => {
  // If key is provided and not in originalKeys, skip all replacement
  if (key && !originalKeys.has(key)) return value;

  if (typeof value === "string") return replaceString(value, key);

  if (Array.isArray(value)) return value.map(v => walk(v, key));

  if (value && typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value)) {
      // Only process this key if it's original; else copy as-is
      out[k] = originalKeys.has(k) ? walk(value[k], k) : value[k];
    }
    return out;
  }

  return value;
};


  // Perform single-pass replacement
  const newContext = walk(mergedContext);
  const newArgs = walk(node.args);

  if (unreplaced.size) {
    return { error: true, missing: [...unreplaced] };
  }

  return {
    error: false,
    step: node.step,
    context: newContext,
    args: newArgs
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const yamlText = `
context:
  URL: https://empowerd.dev
  TOKEN: ABC123
  JSON_DATA: {"test":"value1"}

workflow:
  - step: demo-step
    args:
      - \${JSON_DATA}
      - \${TOKEN}
      - '{ "url": "\${URL}" }'
      - - deeperKey: \${URL}
    context:
      NODE_VAR: "node_specific_value"
      TOKEN: "xy \${TOKEN}"
  - step: demo-step2
    args:
      - \${URL}
      - - deeperKey: \${URL2}
`;

  const doc = jsYaml.load(yamlText);
  const globalContext = doc.context || {};

  // Compute original workflow keys
  const originalKeys = getOriginalKeys(doc);

  // Add dynamic key after loading the workflow
  doc.context.dynamic_key = "${TOKEN}"; // new key, should NOT be replaced

  console.log("\nOriginal keys:", originalKeys);

  // simulating inside the executor
  for (const node of doc.workflow || []) {
    const { error, args,context, missing } = replaceNynoVariables({ step:node.step,args:node.args, context: { ...globalContext, ...(node.context || {}) }}, {
      originalKeys
    });

    console.log('==============PER STEP =================');

    if(error) {
       // early return
       console.log('early return error handler', error,{missing});
    } else {
        console.log('new replaced args:',args);        
        console.log('new replaced context:',context);
    } 
  }
}