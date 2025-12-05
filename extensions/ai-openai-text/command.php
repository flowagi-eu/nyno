#!/usr/bin/env php
<?php
/**
 * Generate text using GPT-5 Chat Completion with context and arguments.
 *
 * @param array $args
 * @param array &$context
 * @return int
 */
function ai_openai_text($args, &$context) {
    // Determine the output key
    $setName = array_key_exists("set_context", $context)
        ? $context["set_context"]
        : "prev";


    // Check if args is empty and set usage message in context
    if (empty($args)) {
        $context['ai-openai-text::usage'] = "Usage: ai_openai_text <prompt> [reasoning_effort]\n"
            . "ai_openai_text:\n"
            . "    args:\n"
            . "        - prompt\n"
            . "        - reasoning_effort (optional) // minimal, low, medium, high; defaults to 'low'\n"
            . "    context:\n"
            . "        - OPEN_AI_API_KEY: The API key for accessing the OpenAI API.\n"
            . "        - SYSTEM_PROMPT: The system prompt to be used in the API call.\n";
        return 1;
    }

    // Check if the API key is set in context
    if (empty($context['OPEN_AI_API_KEY'])) {
        $context['error'] = "Error: OPEN_AI_API_KEY is not set in context.\n";
        return 1;
    }

    // Extract prompt and reasoningEffort from args
    $prompt = $args[0] ?? '';
    $reasoningEffort = $args[1] ?? 'low';
    $systemPrompt = $context['SYSTEM_PROMPT'] ?? '';

    $endpoint = "https://api.openai.com/v1/chat/completions";
    $messages = [];
    if (!empty($systemPrompt)) {
        $messages[] = ["role" => "system", "content" => $systemPrompt];
    }
    $messages[] = ["role" => "user", "content" => $prompt];
    $postFields = [
        "model" => "gpt-5",
        "messages" => $messages,
        "reasoning_effort" => $reasoningEffort
    ];
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $endpoint);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer " . $context['OPEN_AI_API_KEY'],
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
//     'OPEN_AI_API_KEY' => 'your_api_key_here',
//     'SYSTEM_PROMPT' => 'You are a helpful assistant.'
// ];
// $args = ['Hello, world!', 'low'];
// $result = ai_openai_text($args, $context);
// if ($result === 0) {
//     echo $context['result'];
// } else {
//     echo $context['error'] ?? $context['ai-openai-text::usage'] ?? 'Unknown error';
// }

