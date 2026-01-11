// nyno_transform_flatten.js
// Simple ES6 transformer that extracts nested arrays by path and flattens one level

import { runWorkflow } from '../../sdk/nynosdk.js';
export function nyno_trigger_and_save_file(args, context) {
const setName = context.set_context ?? 'prev';
  const eventName = args[0];
  if(!eventName) {
    context[setName + '.error'] = 'No workflow name args[0] defined';
    return -1;
  }


  const data = context.TRIGGER_CONTEXT ?? [];
  const outputFile = args[1];
  if(!outputFile) {
    context[setName + '.error'] = 'No output file args[1] defined';
    return -1;
  }

  // add it to sdk's in memory queue (or directly execute async?)
  executeTrigger(eventName,data,outputFile);

  return 0;
}

import { writeFile } from 'fs/promises';
import { join } from 'path';

async function executeTrigger(eventName, data = {},outputFile) {
  try {
    const rw = await runWorkflow("/" + eventName, data);
    const r = rw.execution;
    const fileData =   typeof r === 'string'     ? r     : JSON.stringify(r, null, 2); 
    await writeFile(outputFile, fileData, 'utf8');
    
    console.log(`Saved trigger result to ${outputFile}`);
  } catch (err) {
    console.error('Error running workflow or saving JSON:', err);
    return 1; // return error code
  }
  return 0; // success
}

