// src/lib/auth_tcp.js

/**
 * Simple unified auth:
 * - If apiKey === "changeme" → default/single-tenant
 * - If apiKey matches a tenant → return { system } for multi-tenant
 */

const tenantApiKeys = {
  systemA: 'keyA123',
  systemB: 'keyB456',
};

export default async function authTcp(data) {
  if (!data || !data.apiKey) return null;

  if (data.apiKey === 'changeme') return true; // single-tenant

  const system = Object.keys(tenantApiKeys).find(k => tenantApiKeys[k] === data.apiKey);
	console.log({system});
  if (system) return { system }; // multi-tenant demo

  return null; // auth failed
}
