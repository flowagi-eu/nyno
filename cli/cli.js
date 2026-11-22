import { readFile } from 'node:fs/promises';
import yaml from './vendor/js-yaml.min.js';

if(!process.argv[2]) {
   console.log('usage: nyno10 [workflow.yml]');
   process.exit(1);
}

const BASE = process.env.NYNO_BASE ?? 'http://0.0.0.0:9099';
const AUTH = process.env.NYNO_SECRET_API_KEY ?? 'changeme';
const WORKFLOW_FILE = process.argv[2];
const POLL_MS = 150;
const MAX_POLLS = 4000; // ~10 minutes at 150ms

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function pickTaskId(body) {
  return body?.taskId ?? body?.id ?? body?.json?.taskId ?? body?.data?.taskId;
}

function pickStatus(body) {
  return body?.status ?? body?.json?.status ?? body?.data?.status;
}

async function main() {
  const yamlText = await readFile(WORKFLOW_FILE, 'utf8');
  const workflowJson = JSON.stringify(yaml.load(yamlText), null, 2);

  // 1) submit workflow
  const postRes = await fetch(`${BASE}/flows`, {
    method: 'POST',
    headers: {
      Authorization: AUTH,
      'Content-Type': 'application/json',
    },
    body: workflowJson,
  });
  if (!postRes.ok) {
    throw new Error(`POST /flows failed ${postRes.status}: ${await postRes.text()}`);
  }
  const created = await postRes.json();

  const taskId = pickTaskId(created);
  if (!taskId) throw new Error(`no taskId in response: ${JSON.stringify(created)}`);

  // 2) poll until status changes away from "pending"
  for (let i = 0; i < MAX_POLLS; i++) {
    const res = await fetch(`${BASE}/polling/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: AUTH },
    });
    if (!res.ok) {
      throw new Error(`GET /polling/${taskId} failed ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    const status = pickStatus(data);

    if (status && status !== 'pending') {

      const showFullTaskInfo = process.env.NYNO_SHOW_FULL_TASK ?? false;
      if(showFullTaskInfo) {
      	console.log(JSON.stringify(data, null, 2));
      } else {
      	console.log(JSON.stringify(data.result, null, 2));
      }

      return data;
    }
    await sleep(POLL_MS);
  }

  throw new Error(`timed out after ${MAX_POLLS} polls (${(MAX_POLLS * POLL_MS) / 1000}s)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
