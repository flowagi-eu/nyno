#!/usr/bin/env node

// -----------------------------
// The Purpose of this test is to proof that variables cannot be rendered multiple times
// 
// In real workflow scenario this would mean..
// 
// 1. Workstep step sets ${prev}, perhaps based on a file that includes ${something}
// 2. In the next step ${prev} is used.
// 3. ${something} is not replaced.
// -----------------------------

import { replaceNynoVariables } from '../../../src/lib-manual/functions/blabla.js';

const globalContext = {
  user: {
    name: 'Alice'
  }
};

// -----------------------------
// Node with custom context
// -----------------------------
const node = {
  context: {
    prev: 'Variables should render: "${user.name}"',
  },
  args: [
    'First time: ${prev}'
  ]
};


const [err1, args1, ctx1] = replaceNynoVariables(
  node,
  structuredClone(globalContext)
);

if(err1) {
  console.log('Error found in First Time Test', JSON.stringify({err1, args1, ctx1}))
  process.exit(1);
}

console.log('args:', args1);
console.log('context:', ctx1);

// -----------------------------
// Second node (should NOT re-render globals)
// -----------------------------
const node2 = {
  context: {
    prev: 'These variables should not be rendered: ${user.name} (example use case when previous step read a file that contains ${something}',
  },
  args: [
    'Second time: ${prev}',
  ]
};


const [err2, args2, ctx2] = replaceNynoVariables(
  node2,
  ctx1 // reuse context
);

if(err2) {
  console.log('Error found in Second Time Test', JSON.stringify({err2, args2, ctx2}))
  process.exit(1);
}

console.log('args:', args2);
console.log('context:', ctx2);
