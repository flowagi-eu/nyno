import { sandbox_fs } from './shared-libs/sandbox-fs/SandboxFS.js';

let cached = null;

export async function createSandboxFs() {
  if (cached) {
    return cached;
  }

  const [readPairs,writePairs] = getReadWritePairs();
  const fs = sandbox_fs(readPairs, writePairs);
  cached = fs;
  return fs;
}

export function getReadWritePairs() {
  const readPairs = {'/':'/'};
  const writePairs = {'/':'/'};
  return [readPairs,writePairs];
}