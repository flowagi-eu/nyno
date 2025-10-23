<?php
use Swoole\Server;

$server = new Server("127.0.0.1", 6000);
$VALID_API_KEY = "changeme";

// Global state with built-in functions
$STATE = [
    "say_hello" => fn() => "Hello from PHP worker",
    "add" => fn($a, $b) => $a + $b,
];

// Preload all extensions
foreach (glob(__DIR__ . "/../../../extensions/*/command.php") as $file) {
    require_once $file; // preload the file
    $folder = dirname($file);
    $bname = basename($folder);
    $funcName = strtolower(str_replace("-", "_", $bname));
    if(is_callable($funcName)) {
	    $STATE[$bname] = $funcName;
        echo "[PHP Runner] Loaded extension $bname\n";
    } else {
        echo "[PHP Runner] Failed to Load extension $bname with name $funcName \n";
    }
}

var_dump('php $STATE[$bname]',$STATE[$bname]);

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

