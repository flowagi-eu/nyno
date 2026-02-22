<?php
function nyno_pki_verify($args, &$context) {
    $setName = $context["set_context"] ?? "prev";

    try {
        // Validate args
        if (count($args) < 3) {
            throw new Exception("Missing arguments: requires [message, signatureBase64, publicKeyBase32]");
        }

        $message = $args[0];
        $signatureBase64 = $args[1];
        $publicKeyBase64 = $args[2];

        // Decode the signature and public key
        $signature = base64_decode($signatureBase64);
        $publicKey = base32_decode($publicKeyBase64);

        if ($signature === false || $publicKey === false) {
            throw new Exception("Invalid base64 signature or public key");
        }

        // Verify the signature
        $isValid = sodium_crypto_sign_verify_detached($signature, $message, $publicKey);

        // Store result
        $context[$setName] = [
            'isValid' => $isValid,
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
