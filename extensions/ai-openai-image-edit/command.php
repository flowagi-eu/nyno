#!/usr/bin/env php
<?php
/**
 * Edit an image using GPT Image 1 API.
 *
 * @param array $args
 * @param array &$context
 * @return int
 */
function ai_openai_image_edit($args, &$context) {
    $setName = array_key_exists("set_context", $context)
        ? $context["set_context"]
        : "ai_openai_image_edit";

    // Define the generateUUIDv4 function locally
    $generateUUIDv4 = function() {
        $data = random_bytes(16);
        // Set version to 0100
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        // Set bits 6-7 to 10
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    };

    // Check if the required arguments are provided
    if (count($args) < 2) {
        $context['error'] = "Usage: edit_image_with_gpt <image_path> <prompt> [size]\n";
        return 1;
    }

    // Extract arguments
    $imagePaths = is_array($args[0]) ? $args[0] : [$args[0]];
    $prompt = $args[1];
    $size = $args[2] ?? "1024x1024";

    // Check if the API key is set in context
    if (empty($context['OPEN_AI_API_KEY'])) {
        $context['error'] = "Error: OPEN_AI_API_KEY is not set in context.\n";
        return 1;
    }

    // Create output directory if it doesn't exist
    $outputDir = $context['output_dir'] ?? 'output';
    if (!file_exists($outputDir)) {
        mkdir($outputDir, 0777, true);
    }

    $savedFiles = [];
    foreach ($imagePaths as $imagePath) {
        // Check if the image file exists
        if (!file_exists($imagePath)) {
            $context['error'] = "Image not found: $imagePath\n";
            continue;
        }

        $endpoint = "https://api.openai.com/v1/images/edits";
        $postFields = [
            "model" => "gpt-image-1",
            "prompt" => $prompt,
            "size" => $size,
            "image" => new CURLFile($imagePath, mime_content_type($imagePath))
        ];
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer " . $context['OPEN_AI_API_KEY']
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
        $response = curl_exec($ch);
        if ($response === false) {
            $context['error'] = "cURL error: " . curl_error($ch);
            curl_close($ch);
            continue;
        }
        $httpStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $decoded = json_decode($response, true);
        if ($httpStatus !== 200) {
            $context['error'] = "API returned HTTP $httpStatus: " . $response;
            continue;
        }

        $result = $decoded['data'] ?? false;
        if (!$result) {
            $context['error'] = "No data received from API for image: $imagePath\n";
            continue;
        }

        foreach ($result as $imageData) {
            if (isset($imageData['b64_json'])) {
                $imgBytes = base64_decode($imageData['b64_json']);
                $filename = $outputDir . '/' . $generateUUIDv4() . ".png";
                file_put_contents($filename, $imgBytes);
		$filename = realpath($filename);
                $savedFiles[] = $filename;
            } elseif (isset($imageData['url'])) {
                $savedFiles[] = $imageData['url'];
            }
        }
    }

    if (!empty($savedFiles)) {
        $context[$setName] = $savedFiles;
        return 0;
    } else {
        $context['error'] = "No images were saved.\n";
        return 1;
    }
}

// Example usage:
// $context = [
//     'OPEN_AI_API_KEY' => 'your_api_key_here',
//     'output_dir' => 'output'
// ];
// $args = [['path/to/image1.png', 'path/to/image2.png'], 'your prompt here'];
// $result = edit_image_with_gpt($args, $context);
// if ($result === 0) {
//     print_r($context['saved_files']);
// } else {
//     echo $context['error'];
// }

