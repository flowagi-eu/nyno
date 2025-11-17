// extensions/serper-search/command.js
//import fetch from "node-fetch"; // or use global fetch if your Node version supports it

import { middleware } from '../../sdk/nynosdk.js';

export async function nyno_serper_search(args, context) {
  let loop_args = [];
  context['all_results'] = [];
  if(Array.isArray(args[0])){
	  for(const item of args[0]) {
		loop_args.push([item]); // to get [QUERY] 
	  }
  } else {
  	loop_args = [args];
  }

  const API_KEY = context['SERPER_API_KEY'];
  for(const args of loop_args) {
  const [QUERY] = args;

  if (!API_KEY || !QUERY) {
    context['SERPER_ERROR'] = "Usage: serperSearch <API_KEY> <search_query>";
    return 0;
  }

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
    context['all_results'].push(data);
    context['last_result'] = data;
    middleware(args,context); // uses last_result (can also use all_results)
    // Save the results in context for the next steps
  } catch (err) {
    context['error_serper'] = `Error: ${err.message}`;
  }
  }

  // Always return 0
  return 0;
}

