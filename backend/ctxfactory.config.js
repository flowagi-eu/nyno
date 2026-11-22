// ctx.factory.js
import process from 'node:process';
import { taskManager } from './taskmanager.config.ts';

const ctxRegistry = {
  logger: console,
  getTask: (id) => taskManager.getTask(id),
  createTask: async (input, ctx, afterFn) =>
    taskManager.createTask(input, ctx, afterFn),
};

export function extendCtx(key, value) {
  ctxRegistry[key] = value;
}

export async function createCtx(req, requireAuth = true) {
  const ctx = { ...ctxRegistry };

  if (!requireAuth) {
    return { ...ctx, auth: false };
  }

  const headers = req.headers ?? {};
  const authHeader = req.headers['authorization'] ?? '';
  const secret = process.env.SECRET_NYNO_API_KEY ?? '';
  console.log(JSON.stringify({headers, authHeader,secret}));

  if (secret && authHeader === secret) {
    return { ...ctx, auth: true };
  }

  console.log(JSON.stringify({ t: 'unauthorized', ts: Date.now(), d: {} }));
  return null;
}