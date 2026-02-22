/**
 * Detects sequences of word pairs from predefined bad word categories.
 * @param {Array} args - Input arguments: [textToCheck, badWordCategories]
 * @param {Object} context - Context object for storing results and configuration
 * @returns {Number} - 0 for success, -1 for error
 */
export function nyno_bad_word_pair_detector(args, context) {
    // Validate input
    if (!args || args.length < 2) {
        const setName = context?.set_context ?? "prev";
        context[setName + "_error"] = "Missing required arguments: [textToCheck, badWordCategories]";
        return -1;
    }

    const [textToCheck, badWordCategories] = args;
    const setName = context?.set_context ?? "prev";

    // Flatten and normalize bad word categories
    const badWords = {};
    for (const [category, words] of Object.entries(badWordCategories)) {
        if (!Array.isArray(words)) continue;
        badWords[category] = words.map(word => word.toLowerCase());
    }

    // Tokenize and normalize input text
    const wordsInText = textToCheck
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 0);

    // Detect bad word pairs
    const detectedPairs = [];
    const wordSet = new Set(wordsInText);

    for (const [category, words] of Object.entries(badWords)) {
        for (const word of words) {
            if (wordSet.has(word)) {
                // Check for co-occurrence with other categories
                for (const [otherCategory, otherWords] of Object.entries(badWords)) {
                    if (category === otherCategory) continue;
                    for (const otherWord of otherWords) {
                        if (wordSet.has(otherWord)) {
                            detectedPairs.push({
                                pair: [word, otherWord],
                                categories: [category, otherCategory],
                            });
                        }
                    }
                }
            }
        }
    }

    // Store results in context
    context[setName] = {
        detectedPairs,
        isClean: detectedPairs.length === 0,
    };

    return 0;
}

