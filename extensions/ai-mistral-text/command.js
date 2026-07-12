#!/usr/bin/env node

export async function ai_mistral_text(args, context) {
    // ----------------------------
    // Normal mode
    // ----------------------------
    console.log("[JS] Processing Mistral normal request");

    const set_name = context?.set_context || "prev";
    const error_key = `${set_name}_error`;
    const error_meta_key = `error_meta`; 
    context[error_meta_key] = {};

    if (!args || args.length === 0) {
        context[error_key] = `
Usage: ai_mistral_text <prompt> [reasoning_effort]

ai_mistral_text:
    args:
        - prompt
        - reasoning_effort (optional) // High; defaults to None
    context:
        - MISTRAL_API_KEY: The API key for accessing the Mistral API.
        - SYSTEM_PROMPT: The system prompt to be used in the API call.
        - MISTRAL_MODEL: Optional custom model to use.
        - MISTRAL_MESSAGES: Optional fully custom message list.
        - MISTRAL_TEMPERATURE: Optional float (0.0–2.0) for sampling randomness.
        - MISTRAL_K: Optional int for top-k sampling.

	// JSON mode
        - MISTRAL_JSON_MODE=true
        `.trim();
        return 1;
    }

    const api_key = context?.MISTRAL_API_KEY;
    if (!api_key) {
        context[error_key] = "Error: MISTRAL_API_KEY is not set in context.";
        return 1;
    }

    const prompt = args[0];
    const reasoning_effort = args.length > 1 ? args[1] : null;

    const system_prompt = context?.SYSTEM_PROMPT || "";

    const model = context?.MISTRAL_MODEL || "mistral-medium-3-5";
	context.MISTRAL_MODEL = model;

    const endpoint = "https://api.mistral.ai/v1/chat/completions";



let messages = [];

context[error_meta_key]['LAST_MISTRAL_MESSAGES'] = context.MISTRAL_MESSAGES ?? null;

if (Array.isArray(context?.MISTRAL_MESSAGES)) {
    messages = [...context.MISTRAL_MESSAGES];
} else if (typeof context?.MISTRAL_MESSAGES === "string") {
    try {
        const parsed = JSON.parse(context.MISTRAL_MESSAGES);

        if (Array.isArray(parsed)) {
            messages = parsed;
        } else {
            throw new Error("MISTRAL_MESSAGES JSON is not an array");
        }
    } catch (err) {
    context[error_meta_key]['LAST_ERROR_MISTRAL_MESSAGES'] = `Failed to parse MISTRAL_MESSAGES: ${err.message}`;
    }
}

if (
    messages.length === 0 &&
    system_prompt
) {
    messages.push({
        role: "system",
        content: system_prompt
    });
}




    messages.push({ role: "user", content: prompt });

    const payload = {
        model,
        messages,
        reasoning_effort
    };

    if (context?.MISTRAL_TEMPERATURE !== undefined) {
        payload.temperature = context.MISTRAL_TEMPERATURE;
    }

    if (context?.MISTRAL_K !== undefined) {
        payload.k = context.MISTRAL_K;
    }

    // ----------------------------
    // JSON mode support
    // ----------------------------
    if (
        context?.MISTRAL_JSON_MODE === true ||
        context?.MISTRAL_JSON_MODE === "true"
    ) {
        payload.response_format = {
            type: "json_object"
        };
    }

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${api_key}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const text = await response.text();
            context[error_key] = `API returned HTTP ${response.status}: ${text}`;
            return 1;
        }

        const decoded = await response.json();
        const lastMessage = decoded?.choices?.[0]?.message?.content || "";

	    messages.push({role:'assistant', content: lastMessage});

        if(context.set_value ?? false) {
            if(context.set_value == 'MESSAGES') {
                context[set_name] = messages;
            }
        } else {
            if(context.MISTRAL_JSON_MODE ?? false) {
                    context[set_name] = JSON.parse(lastMessage);
            } else {
                context[set_name] = lastMessage;
            }
        }

        context[`${set_name}_meta`] = decoded;
        context[`${set_name}_meta`]['messages'] = messages;
        return 0;

    } catch (e) {
        context[error_key] = `Request error: ${String(e)}`;
        return 1;
    }
}

