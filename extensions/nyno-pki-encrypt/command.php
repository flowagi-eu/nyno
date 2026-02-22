<?php
function nyno_pki_encrypt($args, &$context) {
    $setName = $context["set_context"] ?? "prev";

    try {
        // Validate args
        if (count($args) < 3) {
            throw new Exception("Missing arguments: requires [message, recipientPublicKeyBase64, senderSecretKeyBase64]");
        }

        $message = $args[0];
        $recipientPublicKeyBase64 = $args[1];
        $senderSecretKeyBase64 = $args[2];

        // Decode the keys
        $recipientPublicKey = base32_decode($recipientPublicKeyBase64);
        $senderSecretKey = base32_decode($senderSecretKeyBase64);

        if ($recipientPublicKey === false || $senderSecretKey === false) {
            throw new Exception("Invalid base64 public or secret key");
        }

        // Create the keypair
        $senderKeypair = sodium_crypto_box_keypair_from_secretkey_and_publickey(
            $senderSecretKey,
            $recipientPublicKey
        );

        // Generate nonce
        $nonce = random_bytes(SODIUM_CRYPTO_BOX_NONCEBYTES);

        // Encrypt the message
        $encrypted = sodium_crypto_box($message, $nonce, $senderKeypair);

        // Store result
        $context[$setName] = [
            'ciphertextBase64' => rtrim(base64_encode($encrypted), '='),
            'nonceBase64' => rtrim(base64_encode($nonce), '='),
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
