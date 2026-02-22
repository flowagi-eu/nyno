<?php
function nyno_pki_decrypt($args, &$context) {
    $setName = $context["set_context"] ?? "prev";

    try {
        // Validate args
        if (count($args) < 4) {
            throw new Exception("Missing arguments: requires [ciphertextBase64, nonceBase64, senderPublicKeyBase64, recipientSecretKeyBase64]");
        }

        $ciphertextBase64 = $args[0];
        $nonceBase64 = $args[1];
        $senderPublicKeyBase64 = $args[2];
        $recipientSecretKeyBase64 = $args[3];

        // Decode all inputs
        $ciphertext = base64_decode($ciphertextBase64);
        $nonce = base64_decode($nonceBase64);
        $senderPublicKey = base32_decode($senderPublicKeyBase64);
        $recipientSecretKey = base32_decode($recipientSecretKeyBase64);

        if ($ciphertext === false || $nonce === false ||
            $senderPublicKey === false || $recipientSecretKey === false) {
            throw new Exception("Invalid base64 input");
        }

        // Create the keypair
        $recipientKeypair = sodium_crypto_box_keypair_from_secretkey_and_publickey(
            $recipientSecretKey,
            $senderPublicKey
        );

        // Decrypt the message
        $decrypted = sodium_crypto_box_open($ciphertext, $nonce, $recipientKeypair);

        if ($decrypted === false) {
            throw new Exception("Decryption failed - possibly incorrect keys or corrupted data");
        }

        // Store result
        $context[$setName] = [
            'message' => $decrypted,
            'ciphertextBase64' => $ciphertextBase64,
            'nonceBase64' => $nonceBase64
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

