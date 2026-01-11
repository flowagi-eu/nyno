#!/usr/bin/env php
<?php
/**
 * Generate text using Mistral Chat Completion with context and arguments.
 *
 * @param array $args
 * @param array &$context
 * @return int
 */
function ai_mistral_text($args, &$context) {
    // Determine the output key
    $setName = array_key_exists("set_context", $context)
        ? $context["set_context"]
        : "prev";

    // Check if args is empty and set usage message in context
    if (empty($args)) {
        $context['ai-mistral-text::usage'] = "Usage: ai_mistral_text <prompt> [reasoning_effort]\n"
            . "ai_mistral_text:\n"
            . "    args:\n"
            . "        - prompt\n"
            . "        - reasoning_effort (optional) // minimal, low, medium, high; defaults to 'low'\n"
            . "    context:\n"
            . "        - MISTRAL_API_KEY: The API key for accessing the Mistral API.\n"
            . "        - SYSTEM_PROMPT: The system prompt to be used in the API call.\n";
        return 1;
    }

    // Check if the API key is set in context
    if (empty($context['MISTRAL_API_KEY'])) {
        $context['error'] = "Error: MISTRAL_API_KEY is not set in context.\n";
        return 1;
    }

    // Extract prompt and reasoningEffort from args
    $prompt = $args[0] ?? '';
    $reasoningEffort = $args[1] ?? 'low';
    $systemPrompt = $context['SYSTEM_PROMPT'] ?? '';

    // Mistral API endpoint and model
    $endpoint = "https://api.mistral.ai/v1/chat/completions";
    $model = "mistral-large-latest"; // or "mistral-small-latest", "mistral-large-latest", etc.

    $messages = [];
    if (!empty($systemPrompt)) {
        $messages[] = ["role" => "system", "content" => $systemPrompt];
    }
    $messages[] = ["role" => "user", "content" => $prompt];

    $postFields = [
        "model" => $model,
        "messages" => $messages,
        // Note: Mistral's API may not use "reasoning_effort" directly; adjust as needed.
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $endpoint);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer " . $context['MISTRAL_API_KEY'],
        "Content-Type: application/json"
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postFields));

    $response = curl_exec($ch);
    if ($response === false) {
        $context['error'] = "cURL error: " . curl_error($ch);
        curl_close($ch);
        return 1;
    }

    $httpStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $decoded = json_decode($response, true);
    if ($httpStatus !== 200) {
        $context['error'] = "API returned HTTP $httpStatus: " . $response;
        return 1;
    }

    $context[$setName] = $decoded['choices'][0]['message']['content'] ?? '';
    return 0;
}

// Example usage:
// $context = [
//     'MISTRAL_API_KEY' => 'your_api_key_here',
//     'SYSTEM_PROMPT' => 'You are a helpful assistant.'
// ];
// $args = ['Hello, world!', 'low'];
// $result = ai_mistral_text($args, $context);
// if ($result === 0) {
//     echo $context['prev'];
// } else {
//     echo $context['error'] ?? $context['ai-mistral-text::usage'] ?? 'Unknown error';
// }

