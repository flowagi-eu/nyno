require 'socket'
require 'json'

class NynoClient
  attr_reader :host, :port, :credentials

  def initialize(credentials, host='127.0.0.1', port=6001, max_retries=3, retry_delay=0.2)
    @credentials = credentials
    @host = host
    @port = port
    @socket = nil
    @buffer = ''
    @max_retries = max_retries
    @retry_delay = retry_delay
    connect
  end

  # Connect and authenticate
  def connect
    close

    @socket = TCPSocket.new(@host, @port)
    authenticate
  end

  # General request sender with retries
  def send_request(prefix, payload)
    attempts = 0

    begin
      ensure_connected
      msg = prefix + payload.to_json + "\n"
      send_raw(msg)
      resp = read_line
      raise "Empty response from server" if resp.nil? || resp.empty?
      JSON.parse(resp)
    rescue => e
      attempts += 1
      if attempts > @max_retries
        raise "Nyno request failed after #{@max_retries} retries: #{e.message}"
      end
      puts "Nyno connection lost, retrying (##{attempts})..."
      sleep @retry_delay
      @retry_delay *= 2
      connect
      retry
    end
  end

  # Run a workflow
  def run_workflow(path, data={})
    payload = { 'path' => path }.merge(data)
    send_request('q', payload)
  end

  # Run /run-nyno with YAML content
  def run_nyno(yaml_content, context={})
    payload = { 'path' => "/run-nyno", 'yamlContent' => yaml_content, 'context' => context }
    send_request('q', payload)
  end

  # Ensure socket is connected
  def ensure_connected
    connect if @socket.nil? || @socket.closed?
  end

  # Close socket
  def close
    @socket.close unless @socket.nil? || @socket.closed?
    @socket = nil
  end

  private

  def authenticate
    msg = 'c' + @credentials.to_json + "\n"
    send_raw(msg)
    resp = read_line
    result = JSON.parse(resp)
    unless result['status']
      close
      raise "Nyno authentication failed: #{result['error'] || resp}"
    end
  end

  def send_raw(msg)
    raise "Socket not connected" if @socket.nil? || @socket.closed?
    @socket.write(msg)
  end

  def read_line
    loop do
      chunk = @socket.readpartial(2048)
      raise "Socket closed" if chunk.nil?
      @buffer << chunk
      if (idx = @buffer.index("\n"))
        line = @buffer[0...idx]
        @buffer = @buffer[(idx + 1)..-1]
        return line.strip
      end
    end
  rescue EOFError
    raise "Socket closed"
  end
end

