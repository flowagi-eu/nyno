<?php

// RFC 4648 Base32 alphabet
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32_encode($data) {
    if ($data === '') {
        return '';
    }

    $alphabet = BASE32_ALPHABET;
    $binary = '';

    // Convert input to binary string
    foreach (str_split($data) as $char) {
        $binary .= str_pad(decbin(ord($char)), 8, '0', STR_PAD_LEFT);
    }

    // Split into 5-bit groups
    $chunks = str_split($binary, 5);
    $encoded = '';

    foreach ($chunks as $chunk) {
        if (strlen($chunk) < 5) {
            $chunk = str_pad($chunk, 5, '0', STR_PAD_RIGHT);
        }
        $encoded .= $alphabet[bindec($chunk)];
    }

    // Add RFC 4648 padding
    $padLength = (8 - (strlen($encoded) % 8)) % 8;
    if ($padLength > 0) {
        $encoded .= str_repeat('=', $padLength);
    }

    return $encoded;
}

function base32_decode($encoded) {
    if ($encoded === '') {
        return '';
    }

    $alphabet = BASE32_ALPHABET;

    // Remove padding
    $encoded = strtoupper($encoded);
    $encoded = rtrim($encoded, '=');

    $binary = '';

    foreach (str_split($encoded) as $char) {
        $pos = strpos($alphabet, $char);
        if ($pos === false) {
            throw new Exception("Invalid Base32 character: $char");
        }
        $binary .= str_pad(decbin($pos), 5, '0', STR_PAD_LEFT);
    }

    // Split into bytes
    $bytes = str_split($binary, 8);
    $decoded = '';

    foreach ($bytes as $byte) {
        if (strlen($byte) === 8) {
            $decoded .= chr(bindec($byte));
        }
    }

    return $decoded;
}




function nyno_pki_create_keypairs($args, &$context) {
    $setName = $context["set_context"] ?? "prev";
    $found = false;
    $attempts = 0;
    $mustStartWith = strtoupper($args[0]); // USER or FLOW
    if($mustStartWith != 'FLOW' && $mustStartWith != 'USER'){
    	$context[$setName . "_error"] = [
                'message' => 'args[0] must be "user" or "flow" (for automated actors)',
            ];
            return -1; // Error
    }

    while (!$found) {
        try {
            // Generate Ed25519 keypair for signing (sig)
            $signKeypair = sodium_crypto_sign_keypair();
            $signPublic = sodium_crypto_sign_publickey($signKeypair);
	    //var_dump($signPublic);
	    //exit;
            $signPublicBase64 = rtrim(base32_encode($signPublic), '=');

            // Check if the Base64 public key starts with "ny"
            if (strpos($signPublicBase64, $mustStartWith) === 0) {
                $found = true;

                // Generate X25519 keypair for encryption (e2e)
                $e2eKeypair = sodium_crypto_box_keypair();
                $e2eSecret = sodium_crypto_box_secretkey($e2eKeypair);
                $e2ePublic = sodium_crypto_box_publickey($e2eKeypair);

                // Prepare the output
                $result = [
                    'for_signing' => [
                        'publicBase32' => $signPublicBase64,
                        'secretBase32' => rtrim(base32_encode(sodium_crypto_sign_secretkey($signKeypair)), '=')
                    ],
                    'for_e2e' => [
                        'publicBase32' => rtrim(base32_encode($e2ePublic), '='),
                        'secretBase32' => rtrim(base32_encode($e2eSecret), '=')
                    ],
                    
                ];

                $context[$setName] = $result;
                $context[$setName . '_' . 'attempts'] = $attempts;
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

//echo base32_encode('Hi!');

/*
// Example usage in CLI context
$context = [];
$args = [];
$ret = nyno_pki_create_keypairs($args, $context);

if ($ret === 0) {
    echo "Success! Found matching keypair after {$context['prev']['attempts']} attempts.\n";
    echo "Signing public key (Base32): {$context['prev']['for_signing']['publicBase64']}\n";
    echo "Signing secret key (Base32): {$context['prev']['for_signing']['secretBase64']}\n";
    echo "E2E public key (Base32): {$context['prev']['for_e2e']['publicBase64']}\n";
    echo "E2E secret key (Base32): {$context['prev']['for_e2e']['secretBase64']}\n";
} else {
    echo "Error: {$context['prev_error']['message']}\n";
}
 */
