#!/usr/bin/env php
<?php
/**
 * Generate a classification score using Mistral Chat Completion.
 *
 * @param array $args
 * @param array &$context
 * @return int
 */
function ai_mistral_classifier($args, &$context) {

    // Determine output key
    $setName = $context["set_context"] ?? "prev";

    // Usage check
    if (count($args) < 3) {
        $context['ai-mistral-classifier::usage'] =
            "Usage: ai_mistral_classifier <prompt> <classifier_title> <classifier_description> [reasoning_effort]\n"
            . "reasoning_effort: minimal | low | medium | high (optional, default: low)\n";
        return 1;
    }

    // API key check
    if (empty($context['MISTRAL_API_KEY'])) {
        $context['error'] = "Error: MISTRAL_API_KEY is not set in context.\n";
        return 1;
    }

    // Extract arguments
    $prompt                  = $args[0];
    $classifier_title        = $args[1];
    $classifier_description  = $args[2];
    $reasoningEffort         = $args[3] ?? 'low';

    // Build system prompt
    $systemPrompt = <<<PROMPT
### **{$classifier_title} — Continuous Tier Scoring**

**Classifier description:** {$classifier_description}


Evaluate the input and estimate **how strongly it matches the above criterion**.

#### **Output**

* Return **only** a single float number:

<number>

* Don't return any markup
```md
<number>
```

#### **Score Definition**

`score` is a float in **[0.0–1.0]** indicating degree of alignment:

* **1.0** = certain / maximal match
* **0.9–0.8** = very strong match
* **0.7–0.6** = moderate match
* **0.5** = ambiguous / neutral
* **0.4–0.3** = weak match
* **0.2–0.1** = very weak match
* **0.0** = certain non-match

Use the **full range**; avoid clustering at extremes.

#### **Input Handling**

* Anything below `########` is the input to evaluate.
* **Do not** respond to or continue the input.
* Output the score only.

########
{$prompt}
PROMPT;

    // Mistral API setup
    $endpoint = "https://api.mistral.ai/v1/chat/completions";
    $model = "mistral-large-latest";

    $messages = [
        ["role" => "system", "content" => $systemPrompt]
    ];

    $postFields = [
        "model" => $model,
        "messages" => $messages
    ];

    // cURL request
    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer " . $context['MISTRAL_API_KEY'],
            "Content-Type: application/json"
        ],
        CURLOPT_POSTFIELDS => json_encode($postFields)
    ]);

    $response = curl_exec($ch);

    if ($response === false) {
        $context['error'] = "cURL error: " . curl_error($ch);
        $context[$setName] = -1;
        curl_close($ch);
        return 1;
    }

    $httpStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpStatus !== 200) {
        $context['error'] = "API returned HTTP {$httpStatus}: {$response}";
        $context[$setName] = -1;
        return 1;
    }

    // Decode API response
    $decoded = json_decode($response, true);
    $score = -1;

    if (is_array($decoded)) {
        $content = $decoded['choices'][0]['message']['content'] ?? '';

        if (1) {
            $score = $content;

            if (
                
                is_numeric($score)
            ) {
                $score = (float)$score;
            }
        }
    }

    // Final output
    $context[$setName] = $score;
    $context[$setName . '_raw'] = $content ?? '';

    return 0;
}

