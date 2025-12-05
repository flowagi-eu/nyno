export function nyno_guardrails(args, context) {
  try {
    let contextKeys = args && args[0] ? args[0] : "inputText";
    if (!Array.isArray(contextKeys)) contextKeys = [contextKeys]; // normalize

    const setName = context["set_context"] || "prev";

    const counts = {};
    let blocked = false;

    // -------- REGEXES --------
    const creditCardRegex = /\b(?:\d[ -]*?){13,19}\b/g; // 13-19 digits
    const secretPatterns = [
      /\bghp_[A-Za-z0-9]{36}\b/g,
      /\bsk_live_[A-Za-z0-9]{24,}\b/g,
      /\bAKIA[A-Z0-9]{16}\b/g,
      /\bAIza[0-9A-Za-z-_]{35}\b/g
    ];
    const genericLongKey = /\b[a-zA-Z0-9]{24,128}\b/g; // generic long alphanumeric
    const allSecretRegexes = [...secretPatterns, genericLongKey];

    // System prompt words: default [["system","prompt"]], can be overridden
    const sysWordLists = (context.guardrails_config && Array.isArray(context.guardrails_config.systemPromptWords))
      ? context.guardrails_config.systemPromptWords
      : [["system","prompt"]]; // array of word lists

    const metadata = {};

    // Helper: check if all words in a list are in text
    const containsAllWords = (text, words) => {
      // Normalize text: lowercase + remove all non-alphanumeric characters + split by spaces
      const normalized = (text || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, " ")
        .split(/\s+/)
        .filter(Boolean);
      const tokens = new Set(normalized);
      return words.every(w => tokens.has(w.toLowerCase()));
    };

    // -------- PROCESS EACH CONTEXT KEY --------
    for (const key of contextKeys) {
      let inputText = context[key];
      if (typeof inputText !== "string") {
        context[setName + ".error"] = `Context key "${key}" missing or not a string.`;
        blocked = true;
        counts[key] = {
          secrets: 0,
          creditCards: 0,
          systemPromptDetected: false
        };
        continue;
      }

      let sanitized = inputText;
      let secretCount = 0;
      let ccCount = 0;
      let systemPromptDetected = false; // initialize here

      // Secrets
      for (const rx of allSecretRegexes) {
        const matches = inputText.match(rx);
        if (matches) {
          secretCount += matches.length;
          for (const m of matches) sanitized = sanitized.split(m).join("[REDACTED_SECRET]");
        }
      }

      // Credit cards
      const ccMatches = inputText.match(creditCardRegex);
      if (ccMatches) {
        ccCount += ccMatches.length;
        for (const cc of ccMatches) sanitized = sanitized.split(cc).join("[REDACTED_CREDIT_CARD]");
      }

      // System prompt detection (on normalized text only)
      for (const wordList of sysWordLists) {
        if (Array.isArray(wordList) && wordList.length && containsAllWords(inputText, wordList)) {
          systemPromptDetected = true;
          blocked = true;
          break; // no need to check other lists
        }
      }

      // Update context with sanitized text
      context[key] = sanitized;

      counts[key] = {
        secrets: secretCount,
        creditCards: ccCount,
        systemPromptDetected
      };

      metadata[key] = {
        original_length: inputText.length,
        sanitized_length: sanitized.length
      };

      if (secretCount || ccCount) blocked = true;
    }

    context[setName] = {
      status: blocked ? "blocked" : "sanitized",
      counts,
      metadata: { ...metadata, timestamp: new Date().toISOString() }
    };

    // Return 0 = success, 1 = blocked/error
    return blocked ? 1 : 0;
  } catch (err) {
    const setName = context["set_context"] || "guardrails";
    context[setName + ".error"] = { error: err?.toString() || String(err) };
    return 1;
  }
}

