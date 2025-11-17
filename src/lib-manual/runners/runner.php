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
//var_dump($ports);

$pe_port = $ports['PE'] ?? 9003;
$api_key = $ports['SECRET'] ?? "changeme";
$host = $ports['HOST'] ?? 'localhost';
$isProd = getenv('NODE_ENV') === 'production';
$num_workers = 2;
if($isProd) {
	    $num_workers = intval(shell_exec('nproc')) * 3; // Linux/Mac
}

$server = new Server($host, $pe_port);
$server->set([
    'worker_num' => $num_workers,
]);
$VALID_API_KEY = $api_key;

// Global state with built-in functions
$STATE = [
    // "say_hello" => fn() => "Hello from PHP worker",
];

// Preload all extensions
foreach (glob(__DIR__ . "/../../../extensions/*/command.php") as $file) {
    require_once $file; // preload the file
    $folder = dirname($file);
    $bname = basename($folder);
    $funcName = strtolower(str_replace("-", "_", $bname));
    if(is_callable($funcName)) {
	    $STATE[$bname] = $funcName;
        //echo "[PHP Runner] Loaded extension $bname\n";
    } else {
        echo "[PHP Runner] Failed to Load extension $bname with name $funcName \n";
    }
}

//var_dump('php $STATE[$bname]',$STATE[$bname]);

// Handle incoming data
$server->on("Receive", function ($server, $fd, $reactorId, $data) use (&$STATE, $VALID_API_KEY) {
    static $auth = [];
    $lines = explode("\n", $data);
    foreach ($lines as $line) {
        if (!$line) continue;
        $type = $line[0];
        $raw = substr($line, 1);
        $payload = json_decode($raw, true);

        if ($type === "c") { // authenticate
            if (($payload['apiKey'] ?? '') === $VALID_API_KEY) {
                $auth[$fd] = true;
                $server->send($fd, json_encode(["status" => "OK"]) . "\n");
            } else {
                $server->send($fd, json_encode(["status" => "ERR", "error" => "Invalid apiKey"]) . "\n");
                $server->close($fd);
            }
        } elseif (empty($auth[$fd])) {
            $server->send($fd, json_encode(["status" => "ERR", "error" => "Not authenticated"]) . "\n");
            $server->close($fd);
        } elseif ($type === "r") { // run function
            $bname = $payload['functionName'] ?? '';
            $args = $payload['args'] ?? [];
            $context = $payload['context'] ?? [];
            if (!isset($STATE[$bname]) || !is_callable($STATE[$bname])) {
                $server->send($fd, json_encode(["fnError" => "not exist"]) . "\n");
            } else {
                try {
                    $result = call_user_func_array($STATE[$bname], [$args,&$context]);
                    $server->send($fd, json_encode(["r" => $result, "c"=>$context]) . "\n");
                } catch (Exception $e) {
                    $server->send($fd, json_encode(["error" => $e->getMessage()]) . "\n");
                }
            }
        }
    }
});

// Start the Swoole server
$server->start();

