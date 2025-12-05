<?php
use Swoole\Server;

$basedir = __DIR__ . "/../../../";
$basedir_envs_ports = $basedir . "/envs/ports.env";

// Load Main Nyno Envs (ports.env)
function load_nyno_ports($path = "envs/ports.env") {
    $env = [];
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        if (strpos($line, '#') !== false)
            $line = substr($line, 0, strpos($line, '#'));
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);

            // Remove quotes
            if ((str_starts_with($value, '"') && str_ends_with($value, '"')) ||
                (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
                $value = substr($value, 1, -1);
            }

            // Convert numeric values
            if (is_numeric($value)) $value = (int)$value;
            else $value = (string)$value;

            $env[$key] = $value;
        }
    }
    return $env;
}

// Example usage
$ports = load_nyno_ports($basedir_envs_ports);

$pe_port = $ports['PE'] ?? 9003;
$api_key = $ports['SECRET'] ?? "changeme";
$host = $ports['HOST'] ?? 'localhost';
$isProd = getenv('NODE_ENV') === 'production';
$num_workers = $isProd ? intval(shell_exec('nproc')) * 3 : 2;

$server = new Server($host, $pe_port);
$server->set([
    'worker_num' => $num_workers,
]);

$VALID_API_KEY = $api_key;

// Global state with built-in functions
$STATE = [];

// Preload extensions
foreach (glob(__DIR__ . "/../../../extensions/*/command.php") as $file) {
    require_once $file;
    $folder = dirname($file);
    $bname = basename($folder);
    $funcName = strtolower(str_replace("-", "_", $bname));

    if (is_callable($funcName)) {
        $STATE[$bname] = $funcName;
    } else {
        echo "[PHP Runner] Failed to Load extension $bname with name $funcName\n";
    }
}

// Handle incoming data (FIXED)
$server->on("Receive", function ($server, $fd, $reactorId, $data) use (&$STATE, $VALID_API_KEY) {
    static $auth = [];
    static $buffers = [];

    // Append fragment to connection buffer
    $buffers[$fd] = ($buffers[$fd] ?? '') . $data;

    // Process all complete messages ending with "\n"
    while (($pos = strpos($buffers[$fd], "\n")) !== false) {

        // Extract one full line
        $line = substr($buffers[$fd], 0, $pos);
        $buffers[$fd] = substr($buffers[$fd], $pos + 1);

        if ($line === '') continue;

        // Type = first char
        $type = $line[0];
        $raw = substr($line, 1);

        // Decode JSON
        $payload = json_decode($raw, true, 512, JSON_INVALID_UTF8_SUBSTITUTE);

        if (json_last_error() !== JSON_ERROR_NONE) {
            var_dump('<BEGIN_JSON_ERROR>');
            echo json_last_error_msg();
            var_dump('<END_JSON_ERROR>');
            continue;
        }

        // Authentication
        if ($type === "c") {
            if (($payload['apiKey'] ?? '') === $VALID_API_KEY) {
                $auth[$fd] = true;
                $server->send($fd, json_encode(["status" => "OK"]) . "\n");
            } else {
                $server->send($fd, json_encode(["status" => "ERR", "error" => "Invalid apiKey"]) . "\n");
                $server->close($fd);
            }
            continue;
        }

        // Must be authenticated
        if (empty($auth[$fd])) {
            $server->send($fd, json_encode(["status" => "ERR", "error" => "Not authenticated"]) . "\n");
            $server->close($fd);
            continue;
        }

        // Run function
        if ($type === "r") {
            $bname = $payload['functionName'] ?? '';
            $args = $payload['args'] ?? [];
            $context = $payload['context'] ?? [];

            if (!isset($STATE[$bname]) || !is_callable($STATE[$bname])) {
                $server->send($fd, json_encode(["fnError" => "not exist"]) . "\n");
                continue;
            }

            try {
                $result = call_user_func_array($STATE[$bname], [$args, &$context]);
                $server->send($fd, json_encode(["r" => $result, "c" => $context]) . "\n");
            } catch (Exception $e) {
                $server->send($fd, json_encode(["error" => $e->getMessage()]) . "\n");
            }
        }
    }
});

// Start server
$server->start();
