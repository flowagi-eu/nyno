import { readdir } from 'fs/promises';
import { spawn } from 'child_process';
import { resolve } from 'path';

// Helper to safely parse JSON if possible
const tryParseJSON = (data) => {
  try {
    return JSON.parse(data);
  } catch {
    return data; // fallback to string
  }
};

// Run a single Node.js script and return result object
const runNodeScript = (filePath) => {
  return new Promise((resolvePromise) => {
    const proc = spawn('node', [filePath]);

    let stdoutData = '';
    let stderrData = '';

    proc.stdout.on('data', (chunk) => { stdoutData += chunk.toString(); });
    proc.stderr.on('data', (chunk) => { stderrData += chunk.toString(); });

    proc.on('close', (code) => {
      const result = {
        filePath,
        testResult: stdoutData ? tryParseJSON(stdoutData.trim()) : null,
        stderr: stderrData ? tryParseJSON(stderrData.trim()) : null,
        exitCode: code
      };
      resolvePromise(result);
    });
  });
};

// Shuffle utility
const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Run parallel tests
const runParallelTests = async () => {
  const parallelDir = resolve('./parallel');
  const files = await readdir(parallelDir);
  const shuffledFiles = shuffleArray(files);

  const promises = shuffledFiles.map((f) => runNodeScript(resolve(parallelDir, f)));
  return Promise.all(promises);
};

// Run sequential tests
const runSyncTests = async (order = null) => {
  const syncDir = resolve('./sync');
  const files = await readdir(syncDir);

  let orderedFiles;
  if (order && order.length) {
    orderedFiles = order
      .map((prefix) => files.find((f) => f.startsWith(prefix)))
      .filter(Boolean)
      .map((f) => resolve(syncDir, f));
  } else {
    orderedFiles = files
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((f) => resolve(syncDir, f));
  }

  const results = [];
  for (const file of orderedFiles) {
    const r = await runNodeScript(file);
    results.push(r);
    if (r.exitCode !== 0) break; // stop sequential tests on first failure
  }
  return results;
};

// Main
const main = async () => {
  const allResults = [];
  let failed = false;


  const parallelResults = await runParallelTests();
  allResults.push(...parallelResults);
  if (parallelResults.some(r => r.exitCode !== 0)) failed = true;

  const syncResults = await runSyncTests();
  allResults.push(...syncResults);
  if (syncResults.some(r => r.exitCode !== 0)) failed = true;

  // Output full JSON array
  console.log(JSON.stringify(allResults, null, 2));

  // Exit with 1 if any test failed
  process.exit(failed ? 1 : 0);
};

main();

