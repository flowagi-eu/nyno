export async function ai_mistral_embeddings(args, context) {
  /**
   * Nyno extension to load embeddings using Mistral's API.
   * Accepts a single string or an array of strings in args[0].
   * Stores the result(s) in context[set_context].
   *
   * Returns:
   *   0 for success, 1 for failure.
   */

  const apiKey = context.MISTRAL_API_KEY;
  const setName = context.set_context || "prev";

  if (!apiKey) {
    context[setName + ".error"] = {
      error: "MISTRAL_API_KEY not found in context."
    };
    return 1;
  }

  // Normalize input
  const inputTexts = Array.isArray(args[0]) ? args[0] : [args[0]];

  try {
    const response = await fetch("https://api.mistral.ai/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "mistral-embed",
        input: inputTexts
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();

    const embeddings = data.data.map(item => item.embedding);

    // Match Python behavior
    context[setName] =
      embeddings.length === 1 && typeof args[0] === "string"
        ? embeddings[0]
        : embeddings;

    context[setName + '_meta'] = data;

    return 0;

  } catch (e) {
    context[setName + ".error"] = {
      error: e.message || String(e)
    };
    return 1;
  }
}
