<?php
function nyno_pki_create_keypairs($args, &$context) {
    $setName = $context["set_context"] ?? "prev";
    $found = false;
    $attempts = 0;
    
// Get full year, month, day
$yearFull = date("Y");      // e.g., 2026
$month = date("m");         // e.g., 02
$day = date("d");           // e.g., 25

// Take last 2 digits of year + month + day
$mustStartWith = substr($yearFull, -2) . $month . $day; // "260225"
echo '$mustStartWith: '.$mustStartWith.PHP_EOL;

    while (!$found) {
        try {
            // Generate Ed25519 keypair for signing
            $signKeypair = sodium_crypto_sign_keypair();
            $signPublic = sodium_crypto_sign_publickey($signKeypair);
            $signSecret = sodium_crypto_sign_secretkey($signKeypair);

            // Convert keys to decimal (base10) instead of hex
            $signPublicDec = '';
            for ($i = 0; $i < strlen($signPublic); $i++) {
                $signPublicDec .= str_pad(ord($signPublic[$i]), 3, '0', STR_PAD_LEFT);
            }

            $signSecretDec = '';
            for ($i = 0; $i < strlen($signSecret); $i++) {
                $signSecretDec .= str_pad(ord($signSecret[$i]), 3, '0', STR_PAD_LEFT);
            }

            // Check if public key starts with today's YYYYMMDD in decimal
            if (strpos($signPublicDec, $mustStartWith) === 0) {
                $found = true;

                // Generate X25519 keypair for encryption (E2E)
                $e2eKeypair = sodium_crypto_box_keypair();
                $e2eSecret = sodium_crypto_box_secretkey($e2eKeypair);
                $e2ePublic = sodium_crypto_box_publickey($e2eKeypair);

                // Convert E2E keys to decimal as well
                $e2ePublicDec = '';
                for ($i = 0; $i < strlen($e2ePublic); $i++) {
                    $e2ePublicDec .= str_pad(ord($e2ePublic[$i]), 3, '0', STR_PAD_LEFT);
                }

                $e2eSecretDec = '';
                for ($i = 0; $i < strlen($e2eSecret); $i++) {
                    $e2eSecretDec .= str_pad(ord($e2eSecret[$i]), 3, '0', STR_PAD_LEFT);
                }

                $result = [
                    'for_signing' => [
                        'publicDec' => $signPublicDec,
                        'secretDec' => $signSecretDec
                    ],
                    'for_e2e' => [
                        'publicDec' => $e2ePublicDec,
                        'secretDec' => $e2eSecretDec
                    ]
                ];

                $context[$setName] = $result;
                $context[$setName . '_attempts'] = $attempts;

                return 0; // Success
            }

            $attempts++;
        } catch (Exception $e) {
            $context[$setName . "_error"] = [
                'message' => $e->getMessage(),
                'code' => $e->getCode()
            ];
            return -1; // Error
        }
    }
}
