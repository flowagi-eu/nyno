<?php
function nyno_pki_sign($args, &$context) {
    $setName = $context["set_context"] ?? "prev";

    try {
        // Validate args
        if (count($args) < 2) {
            throw new Exception("Missing arguments: requires [message, secretKeyBase32]");
        }

        $message = $args[0];
        $secretKeyBase64 = $args[1]['secretBase32'];
                $publicBase64 = $args[1]['publicBase32'];


 	// If message is array or object, JSON encode it
        if (is_array($message) || is_object($message)) {
            $message = json_encode($message, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($message === false) {
                throw new Exception("Failed to JSON encode message");
            }
        }
        
        // Decode the secret key
        $secretKey = base32_decode($secretKeyBase64);
        if ($secretKey === false) {
            throw new Exception("Invalid base64 secret key");
        }

        // Sign the message
        $signedMessage = sodium_crypto_sign_detached($message, $secretKey);

        // Store result
        $context[$setName] = [
            'signatureBase64' => rtrim(base64_encode($signedMessage), '='),
            'publicBase32' => $publicBase64,
            'message' => $message
        ];

        return 0;
    } catch (Exception $e) {
        $context[$setName . "_error"] = [
            'message' => $e->getMessage(),
            'code' => $e->getCode()
        ];
        return -1;
    }
}
