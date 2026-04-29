export function sanitizeFunctionName(name) {
  if (!name) return "function";

  let sanitized = name
    .replace(/[^a-zA-Z0-9_.-]/g, "_")
    .replace(/[_\.]{2,}/g, "_")
    .replace(/^[_\.]+|[_\.]+$/g, "");

  return sanitized.length > 256 ? sanitized.slice(0, 256) : sanitized;
}

export function yamlTypeToJsonSchema(field) {
  if (typeof field === "object" && field !== null && !Array.isArray(field)) {
    const schema = {
      type: field.type || "string"
    };

    if (field.description) {
      schema.description = field.description;
    }

    if (field.enum !== undefined) {
      if (typeof field.enum === "string") {
        schema.enum = field.enum.split(",").map(v => v.trim());
      } else {
        schema.enum = field.enum;
      }
    }

    if (schema.type === "array") {
      schema.items = { type: field.items || "string" };
    }

    return schema;
  }

  // Legacy shorthand
  if (field === "string") return { type: "string" };
  if (field === "number") return { type: "number" };
  if (field === "boolean") return { type: "boolean" };
  if (field === "string[]") return { type: "array", items: { type: "string" } };

  return { type: "string" };
}

export function loadToolsFromArray(tools) {
  const mistralTools = [];

  for (const tool of tools || []) {
    const properties = {};
    const required = [];

    for (const [fieldName, fieldSpec] of Object.entries(tool.input_schema || {})) {
      properties[fieldName] = yamlTypeToJsonSchema(fieldSpec);
      required.push(fieldName);
    }

    mistralTools.push({
      type: "function",
      function: {
        name: sanitizeFunctionName(tool.name),
        description: tool.description || "",
        parameters: {
          type: "object",
          properties,
          required,
          additionalProperties: false
        }
      }
    });
  }

  return mistralTools;
}

export function removeEmptyEnum(obj) {
  if (Array.isArray(obj)) {
    return obj.map(removeEmptyEnum);
  } else if (obj && typeof obj === "object") {
    const newObj = {};
    for (const [k, v] of Object.entries(obj)) {
      if (!(k === "enum" && v === "")) {
        newObj[k] = removeEmptyEnum(v);
      }
    }
    return newObj;
  }
  return obj;
}

export async function ai_mistral_agent(args, context) {
  if (!args || args.length < 2) {
    context["prev.error"] = {
      errorMessage: "Usage: <prompt> <tools>"
    };
    return -1;
  }

  const userPrompt = args[0];
  const toolsRaw = args[1];

  console.log("tools_raw", toolsRaw);

  let tools = loadToolsFromArray(toolsRaw);
  console.log("tools_parsed", tools);

  tools = removeEmptyEnum(tools);
  console.log("tools_parsed remove_empty_enum", tools);

  const apiKey = context.MISTRAL_API_KEY;
  if (!apiKey) {
    context["prev.error"] = {
      errorMessage: "Missing MISTRAL_API_KEY"
    };
    return -1;
  }

  const today = new Date().toISOString().slice(0, 10);

  const defaultSystemPrompt = `Today is ${today}. When providing dates, always use YYYY-MM-DD. Use the provided schemas when appropriate.`;

  const systemPrompt = context.SYSTEM_PROMPT || defaultSystemPrompt;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  try {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        messages,
        tools,
        tool_choice: "auto"
      })
    });

    if (!res.ok) {
      throw new Error(`Chat failed: ${await res.text()}`);
    }

    const data = await res.json();
    const message = data.choices?.[0]?.message;

    // No tool selected
    if (!message?.tool_calls || message.tool_calls.length === 0) {
      context["prev"] = {
        toolName: null,
        args: {}
      };
      return 0;
    }

    const call = message.tool_calls[0];

    const toolJson = {
      toolName: call.function.name.toLowerCase().replace(/ /g, "-"),
      args: JSON.parse(call.function.arguments || "{}")
    };

    const setContext = context.set_context || "prev";
    context[setContext] = toolJson;

    return 0;

  } catch (e) {
    context["prev.error"] = {
      errorMessage: e.message || String(e)
    };
    return -1;
  }
}
