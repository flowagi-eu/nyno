// extensions/auto_watch_trigger/command.js
import { watch } from 'fs';
import { join } from 'path';
import { runWorkflow } from '../../sdk/nynosdk.js';
import { writeFile } from 'fs/promises';

// Read directories and event name from environment variables
const WATCH_DIRS = (process.env.NYNO_WATCH_DIRS || '').split(':').filter(Boolean); // colon-separated paths
const EVENT_NAME = 'nyno_watch_dirs';

if (WATCH_DIRS.length) {
  
const watchers = new Map(); // track active watchers

for (const dir of WATCH_DIRS) {
  if (watchers.has(dir)) continue;

  try {
    const w = watch(dir, { recursive: false }, (eventType, filename) => {
      if (!filename) return;
      console.log(`[watcher] ${eventType}: ${filename} in ${dir}`);
      executeTrigger(EVENT_NAME, { eventType, filename, directory: dir });
    });
    watchers.set(dir, w);
    console.log(`[watcher] Watching directory: ${dir}`);
  } catch (err) {
    console.error(`Failed to watch directory ${dir}:`, err);
  }
}

// Trigger helper
async function executeTrigger(eventName, data = {}) {
  try {
    const result = await runWorkflow("/" + eventName, data);
    const timestamp = Date.now();
    const filePath = join(process.env.HOME || '.', 'Downloads', `trigger-${timestamp}.json`);
    await writeFile(filePath, JSON.stringify(result, null, 2), 'utf8');
    console.log(`Saved trigger result to ${filePath}`);
  } catch (err) {
    console.error('Error running workflow or saving JSON:', err);
  }
}

}