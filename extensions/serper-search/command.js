// extensions/serper-search/command.js
// import fetch from "node-fetch"; // or use global fetch if supported

import { middleware } from '../../sdk/nynosdk.js';

export async function serper_search(args, context) {
  let loop_args = [];
  let setName = context.set_context ?? 'prev';
  context[setName] = [];

	 console.log('args',args);
  // Handle list of queries or single query
  if (Array.isArray(args[0])) {
    for (const item of args[0]) {
      loop_args.push([item]); // ensure structure [QUERY]
    }
  } else {
    loop_args = [args];
  }

  const API_KEY = context['SERPER_API_KEY'];
  if (!API_KEY) {
    context['SERPER_ERROR'] = "Missing SERPER_API_KEY in context.";
    return 0;
  }

  // Helper function to execute a single search
  const doSearch = async (QUERY) => {
    try {
      const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: QUERY }),
      });

      const data = await response.json();
      context[setName].push(data);
      context['last_result'] = { key:QUERY, data };
      await middleware([QUERY], context);
      return data;
    } catch (err) {
      context['error_serper'] = `Error for query "${QUERY}": ${err.message}`;
      return null;
    }
  };

  // Control concurrency
  const maxConcurrent = Number(context['async']) || 1; // default = sequential
  if (maxConcurrent <= 1) {
    // Sequential mode
    for (const [QUERY] of loop_args) {
      await doSearch(QUERY);
    }
  } else {
    // Limited parallel mode
    let index = 0;
    const pool = new Set();

    while (index < loop_args.length) {
      while (pool.size < maxConcurrent && index < loop_args.length) {
        const [QUERY] = loop_args[index++];
        const p = doSearch(QUERY).finally(() => pool.delete(p));
        pool.add(p);
      }
      // Wait for at least one to finish before adding more
      if (pool.size >= maxConcurrent) {
        await Promise.race(pool);
      }
    }
    // Wait for all remaining tasks
    await Promise.all(pool);
  }

  return 0;
}


