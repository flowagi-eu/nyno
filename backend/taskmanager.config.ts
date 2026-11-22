// taskmanager.config.js
import { createTaskManager } from './shared-libs/tasks-util/index.js';
import { runYamlString,loadAllExtensions } from './shared-libs/nyno-engine/index.js';

import { createSandboxFs } from './sandboxfs.config.ts';

import path from 'node:path';

const defaultDirs = [
  path.join(process.cwd(), 'backend', 'extensions'),
  path.join(process.cwd(), 'my-extensions'),
];

const dirs = JSON.parse(
  process.env.NYNO_CORE_PLUGINS_DIRS ?? JSON.stringify(defaultDirs)
);

loadAllExtensions(dirs);

// Flat registry for SYSTEM keys — extend from anywhere
const systemExt = {
};

export function extendSystem(key, value) {
  systemExt[key] = value;
}

export async function runTaskSync(dirs, workflow, context) {
  const [sandboxfs_read, sandboxfs_write] = await createSandboxFs();
  const customContext = {
    SYSTEM: {
      ...systemExt,
      fs_read: sandboxfs_read,
      fs_write: sandboxfs_write,
    },
  };

  return runYamlString(dirs, { workflow, context }, customContext);
}

export const taskManager = createTaskManager({
  runTaskFn: async (taskId, input, ctx) => {
    const { workflow, context } = input.json ?? {};
    const dirs = JSON.parse(process.env.NYNO_CORE_PLUGINS_DIRS ?? '[]');
    let raw = {};
    try {
      raw.lastJson = await runTaskSync(dirs, workflow, context);
      return (
        raw?.lastJson ?? {
          status: 'error',
          execution: [{ output: { error: 'no result' } }],
        }
      );
    } catch (err) {
      console.log(err);
      console.log(JSON.stringify({ t: 'critical error 251', d: { err: String(err), ts: Date.now() } }));
      return { status: 'critical_error' };
    }
  },
});
