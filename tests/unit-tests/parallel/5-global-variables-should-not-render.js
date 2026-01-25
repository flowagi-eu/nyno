#!/usr/bin/env node

// -----------------------------
// The Purpose of this test is to proof that global context variables
// do not render (since 5.3 only context ${variables} in workflows steps are rendered)
// 
// In real workflow scenario this would mean..
// 
// 1. User supplies ${PROMPT} global context with ${some_string}
// 2. This should not trigger 'missing some_string' warning or replace some_string
// -----------------------------

import { replaceNynoVariables } from '../../../src/lib-manual/functions/blabla.js';

const globalContext = {
  user: {
    name: 'Alice'
  },
  key1: "val1",
  PROMPT: "My prompt that contains ${some_string}",
};

// -----------------------------
// Node with custom context
// -----------------------------
const node = {
  args: [
    'First time: ${key1} ${PROMPT}'
  ]
};


const [err1, args1, ctx1] = replaceNynoVariables(
  node,
  structuredClone(globalContext)
);

if(!args1[0].includes('${some_string}')) {
  console.log('Global Variables Should Not Render', JSON.stringify({err1, args1, ctx1}))
  process.exit(1);
}

console.log('args:', args1);
console.log('context:', ctx1);
