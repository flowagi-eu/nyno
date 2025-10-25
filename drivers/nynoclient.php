<?php

class NynoClient
{
    private string $host;
    private int $port;
    private bool $usingSwoole;
    private ?object $client = null;
    private array $credentials = [];
    private int $maxRetries = 3;        // Max reconnect attempts
    private float $retryDelay = 0.2;    // Initial retry delay (seconds)

    public function __construct(array $credentials, string $host = '127.0.0.1', int $port = 6001, bool $usingSwoole = false)
    {
        $this->credentials = $credentials;
        $this->host = $host;
        $this->port = $port;
        $this->usingSwoole = $usingSwoole;
        $this->connect();
    }

    /**
     * Connect and authenticate with Nyno
     * @throws Exception
     */
    public function connect(): void
    {
        $this->close(); // close any previous connection

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
            if (!@socket_connect($this->client, $this->host, $this->port)) {
                $err = socket_strerror(socket_last_error($this->client));
                socket_close($this->client);
                throw new Exception("Connection failed: $err");
            }
        }

        // Authenticate
        $msg = 'c' . json_encode($this->credentials) . "\n";
        $this->writeRaw($msg);

        $response = $this->readResponse();
        $result = json_decode($response, true);

        if (!$result || empty($result['status'])) {
            $this->close();
            throw new Exception("Nyno authentication failed: " . ($result['error'] ?? 'Unknown error'));
        }
    }

    /**
     * Run a Nyno workflow, with auto-retry if disconnected
     */
    public function run_workflow(string $path, array $data = []): array
    {
        $attempts = 0;

        while (true) {
            try {
                $this->ensureConnected();

                $payload = array_merge(['path' => $path], $data);
                $msg = 'q' . json_encode($payload) . "\n";
                $this->writeRaw($msg);

                $response = $this->readResponse();
                if ($response === '') {
                    throw new Exception("Empty response from server");
                }

                $result = json_decode($response, true);
                if ($result === null) {
                    throw new Exception("Failed to decode Nyno response JSON: " . $response);
                }

                return $result;
            } catch (Exception $e) {
                // Attempt reconnect on connection failure
                $attempts++;
                if ($attempts > $this->maxRetries) {
                    throw new Exception("Nyno request failed after {$this->maxRetries} retries: " . $e->getMessage());
                }

                // Log or print reconnect attempt
                error_log("Nyno connection lost, retrying (#{$attempts})...");

                // Wait (exponential backoff)
                usleep($this->retryDelay * 1e6);
                $this->retryDelay *= 2;

                // Try to reconnect
                try {
                    $this->connect();
                } catch (Exception $ce) {
                    error_log("Reconnect attempt failed: " . $ce->getMessage());
                }
            }
        }
    }

    public function close(): void
    {
        if ($this->client) {
            if ($this->usingSwoole) {
                @$this->client->close();
            } else {
                @socket_close($this->client);
            }
            $this->client = null;
        }
    }

    private function writeRaw(string $msg): void
    {
        if ($this->usingSwoole) {
            $sent = $this->client->send($msg);
            if ($sent === false) {
                throw new Exception("Failed to send data via Swoole socket");
            }
        } else {
            $sent = @socket_write($this->client, $msg, strlen($msg));
            if ($sent === false) {
                throw new Exception("Failed to send data via PHP socket: " . socket_strerror(socket_last_error($this->client)));
            }
        }
    }

    private function readResponse(float $timeout = 2.0): string
    {
        $response = '';
        $start = microtime(true);

        while (true) {
            if ($this->usingSwoole) {
                $this->client->set(['timeout' => 0.1]);
                $chunk = @$this->client->recv();
            } else {
                $chunk = @socket_read($this->client, 2048, PHP_NORMAL_READ);
            }

            if ($chunk === false || $chunk === '' || $chunk === null) {
                if ((microtime(true) - $start) >= $timeout) {
                    break;
                }
                usleep(50000);
                continue;
            }

            $response .= $chunk;
            if (strpos($response, "\n") !== false) {
                break;
            }
        }

        return trim($response);
    }

    private function ensureConnected(): void
    {
        if ($this->client === null) {
            $this->connect();
        }
    }
}

