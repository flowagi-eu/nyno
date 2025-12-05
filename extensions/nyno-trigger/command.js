// nyno_transform_flatten.js
// Simple ES6 transformer that extracts nested arrays by path and flattens one level

import { runWorkflow } from '../../sdk/nynosdk.js';
export function nyno_trigger(args, context) {
  const eventName = args[0];

  // add it to sdk's in memory queue (or directly execute async?)
  executeTrigger(eventName);

  return 0;
}

import { writeFile } from 'fs/promises';
import { join } from 'path';

async function executeTrigger(eventName, data = {}) {
  try {
    const r = await runWorkflow("/" + eventName, data);
    const timestamp = Date.now();
    const filePath = join(process.env.HOME, 'Downloads', `trigger-${timestamp}.json`);
    await writeFile(filePath, JSON.stringify(r, null, 2), 'utf8');
    console.log(`Saved trigger result to ${filePath}`);
  } catch (err) {
    console.error('Error running workflow or saving JSON:', err);
    return 1; // return error code
  }
  return 0; // success
}

