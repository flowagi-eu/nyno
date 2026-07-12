#!/usr/bin/env node

import { ai_mistral_text } from "../ai-mistral-text/command.js";

export async function ai_mistral_orchestrator(args, context) {

    console.log("[JS] Processing Mistral orchestrator request");

    const set_name = context?.set_context || "prev";
    const error_key = `${set_name}_error`;

    if (!args || args.length < 2) {
        context[error_key] = `
Usage:
ai_mistral_orchestrator <prompt> <routes>

routes format:
key:description|key:description|...

example:
marketing:ads, campaigns, growth|
product:roadmap, prioritization|
feature:engineering, specs|

prompt:
user request text
`.trim();

        return -1;
    }

        const user_prompt = args[0];


    // ----------------------------
    // Parse routes
    // ----------------------------
   
    const routeObj = args[1];
const routeEntries = Object.entries(routeObj)
    .map(([key, desc]) => ({
        key: String(key).trim(),
        desc: desc ? String(desc).trim() : ""
    }))
    .filter(r => r.key);

    if (routeEntries.length === 0) {
        context[error_key] = "No valid routes provided.";
        return -1;
    }


    // ----------------------------
    // Build prompt
    // ----------------------------
    const route_table = routeEntries
        .map((r, i) => `${i} = ${r.key} → ${r.desc}`)
        .join("\n");

    const orchestrator_prompt = `
You are an orchestration agent.

Your job:
- Select the most appropriate route index for the user request.

Available routes:

${route_table}

Return ONLY valid JSON:

{
  "route": <integer>,
  "reason": "<short explanation>",
  "score": "<confidence score between 0-100 (higher is better)>",
  "key": "<route_key>"
}

Rules:
- Choose exactly one route
- Return only JSON
- No markdown, no extra text

User request:

${user_prompt}
`.trim();

    context.MISTRAL_JSON_MODE = true;

    try {

        // this sets the context[set_name] to str json {..} and returns 0 on success, -1 on fatal error
        const result = await ai_mistral_text(
            [orchestrator_prompt],
            context
        );

        if (result !== 0) return -1;

        const prevObj = context[set_name];
        context['debug_prevObj'] = prevObj;
        const parsed = JSON.parse(prevObj);
                context['debug_parsed'] = parsed;

        const route = Number(parsed.route);
         context['debug_route'] = route;


        if (
            !Number.isInteger(route) ||
            route < 0 ||
            route >= routeEntries.length
        ) {
            context[error_key] = `Invalid route: ${route}`;
            return -1;
        }

        context[`${set_name}_route_key`] =
            parsed.key || routeEntries[route].key;

        context[`${set_name}_reason`] =
            parsed.reason || "";

        return route;

    } catch (e) {
        context[error_key] = `Error: ${String(e)}`;
        return -1;
    }
}
