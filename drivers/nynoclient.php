
<?php

class NynoClient
{
    private string $host;
    private int $port;
    private bool $usingSwoole;
    private ?object $client = null;
    private array $credentials = [];

    /**
     * NynoDriver constructor.
     * @param string $host Nyno server host
     * @param int $port Nyno server port
     * @param bool $usingSwoole Use Swoole client if true, else native PHP sockets
     */
    public function __construct(array $credentials, string $host = '127.0.0.1', int $port = 6001,  bool $usingSwoole = false)
    {
	    $this->credentials = $credentials;
        $this->host = $host;
        $this->port = $port;
        $this->usingSwoole = $usingSwoole;
	$this->connect();
    }

    /**
     * Connect and authenticate with Nyno
     * Example:
     *   $nyno->connect(['apiKey' => 'changeme']);
     * @param array $credentials
     * @throws Exception
     */
    public function connect(): void
    {

        if ($this->usingSwoole) {
            $this->client = new Swoole\Client(SWOOLE_SOCK_TCP);
            if (!$this->client->connect($this->host, $this->port, 0.5)) {
                throw new Exception("Swoole client connection failed");
            }
        } else {
            $this->client = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
            if ($this->client === false) {
                throw new Exception("Socket creation failed: " . socket_strerror(socket_last_error()));
            }
            if (!socket_connect($this->client, $this->host, $this->port)) {
                $err = socket_strerror(socket_last_error($this->client));
                socket_close($this->client);
                throw new Exception("Connection failed: $err");
            }
        }

        // Send credentials: c{"apiKey":"changeme"}
        $msg = 'c' . json_encode($this->credentials) . "\n";
        $this->writeRaw($msg);

        $response = $this->readResponse();
	var_dump('response',$response);
        $result = json_decode($response, true);

        if (!$result || empty($result['status'])) {
            $this->close();
            throw new Exception("Nyno authentication failed: " . ($result['error'] ?? 'Unknown error'));
        }
    }

    /**
     * Run a Nyno workflow.
     * Example:
     *   $nyno->run_workflow('/sync/users', ['userId' => 42, 'action' => 'sync']);
     * Sends:
     *   q{"path":"/sync/users","userId":42,"action":"sync"}
     *
     * @param string $path
     * @param array $data
     * @return array
     * @throws Exception
     */
    public function run_workflow(string $path, array $data = []): array
    {
        $this->ensureConnected();

        // Merge 'path' into the payload
        $payload = array_merge(['path' => $path], $data);

        $msg = 'q' . json_encode($payload) . "\n";
        $this->writeRaw($msg);

        $response = $this->readResponse();
        $result = json_decode($response, true);

        if ($result === null) {
            throw new Exception("Failed to decode Nyno response JSON: " . $response);
        }

        return $result;
    }

    /**
     * Close the Nyno connection
     */
    public function close(): void
    {
        if ($this->client) {
            if ($this->usingSwoole) {
                $this->client->close();
            } else {
                socket_close($this->client);
            }
            $this->client = null;
        }
    }

    /**
     * Write raw message to the socket
     */
    private function writeRaw(string $msg): void
    {
        if ($this->usingSwoole) {
            $this->client->send($msg);
        } else {
            socket_write($this->client, $msg, strlen($msg));
        }
    }

    /**
     * Read a full line response ending with \n
     */
    private function readResponse(float $timeout = 2.0): string
{
    $response = '';
    $start = microtime(true);

    while (true) {
        if ($this->usingSwoole) {
	    $this->client->set(['timeout' => 0.1]);
		$chunk = @$this->client->recv(); // no argument

        } else {
            $chunk = @socket_read($this->client, 2048, PHP_NORMAL_READ);
        }

        if ($chunk === false || $chunk === '' || $chunk === null) {
            // temporary unavailable, keep trying until timeout
            if ((microtime(true) - $start) >= $timeout) {
                break; // exit loop after total timeout
            }
            usleep(50000); // wait 50ms before retrying
            continue;
        }

        $response .= $chunk;

        if (strpos($response, "\n") !== false) {
            break; // full message received
        }
    }

    return trim($response);
}

    /**
     * Ensure the client is connected
     */
    private function ensureConnected(): void
    {
        if ($this->client === null) {
            throw new Exception("Nyno connection not established. Call connect() first.");
        }
    }
}
