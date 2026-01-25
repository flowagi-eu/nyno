#!/usr/bin/env ruby
require "json"
require "socket"
require "etc"

############################################################
# Load ports.env
############################################################

def load_nyno_ports(path = "envs/ports.env")
  env = {}
  File.readlines(path).each do |line|
    line = line.strip
    next if line.empty? || line.start_with?("#")

    line = line.split("#", 2).first.strip
    next if line.empty?

    if line.include?("=")
      key, value = line.split("=", 2)
      key = key.strip
      value = value.strip

      if (value.start_with?('"') && value.end_with?('"')) || (value.start_with?("'") && value.end_with?("'"))
        value = value[1..-2]
      end

      if value.match?(/^\d+$/)
        value = value.to_i
      end

      env[key] = value
    end
  end
  env
end

ports = load_nyno_ports(File.expand_path("../../../envs/ports.env", __dir__))
HOST = ports["HOST"] || "localhost"
PORT = ports["RB"] || 9045
VALID_API_KEY = ports["SECRET"] || "changeme"


############################################################
# Load extensions (manifest)
############################################################

def load_extensions
  manifest_path = File.expand_path("../../extension-data.json", __dir__)

  unless File.exist?(manifest_path)
    puts "[Ruby Runner] No extension manifest found"
    return
  end

  manifest = JSON.parse(File.read(manifest_path))

  manifest.each do |ext_name, meta|
    source_dir = meta["sourceDir"]
    unless source_dir
      puts "[Ruby Runner] No sourceDir for #{ext_name}"
      next
    end

    cmd_file = File.join(source_dir, "command.rb")
    unless File.exist?(cmd_file)
      next
    end

    begin
      require cmd_file
      func_name = ext_name.downcase.gsub("-", "_")
      puts "[Ruby Runner] Loaded extension #{func_name}"
    rescue => e
      puts "[Ruby Runner] Failed loading #{ext_name}: #{e.message}"
    end
  end
end




############################################################
# Handle client request
############################################################

def handle_client(socket, valid_api_key)
  authenticated = false
  buffer = ""

  while (line = socket.gets)
    buffer += line

    while (idx = buffer.index("\n"))
      line = buffer.slice!(0, idx + 1).strip
      next if line.empty?

      type = line[0]
      raw = line[1..-1]

      begin
        payload = JSON.parse(raw)
      rescue JSON::ParserError
        next
      end

      if type == "c"
        if payload["apiKey"] == valid_api_key
          authenticated = true
          socket.write({ status: "OK" }.to_json + "\n")
        else
          socket.write({ status: "ERR", error: "Invalid apiKey" }.to_json + "\n")
          socket.close
        end
        next
      end

      if !authenticated
        socket.write({ status: "ERR", error: "Not authenticated" }.to_json + "\n")
        socket.close
        next
      end

      if type == "r"
        # fn_name = payload["functionName"]
        fn_name = payload["functionName"].tr("-", "_")
        if Object.private_methods.include?(fn_name.to_sym)
          fn = method(fn_name.to_sym)
        end

        unless fn
          context = payload["context"] || {}
          socket.write({ fnError: "not exist" , c: context}.to_json + "\n")
          next
        end

        begin
          context = payload["context"] || {}
          result = fn.call(payload["args"] || [], context)
          socket.write({ r: result, c: context }.to_json + "\n")
        rescue => e
          socket.write({ error: e.message }.to_json + "\n")
        end
      end
    end
  end
rescue => e
  puts "[Ruby Runner] Client error: #{e.message}"
ensure
  socket.close rescue nil
end

############################################################
# Worker
############################################################

def worker_main(server, valid_api_key)
  load_extensions
  puts "[Ruby Worker #{Process.pid}] Ready"

  loop do
    client = server.accept
    Thread.new(client) do |sock|
      handle_client(sock, valid_api_key)
    end
  end
rescue => e
  puts "[Ruby Runner] Worker crash #{Process.pid}: #{e.message}"
  retry
end

############################################################
# Master
############################################################

puts "[Ruby Runner Master] Starting..."

# Create server ONCE in master
server = TCPServer.new(HOST, PORT)
server.listen(128)

is_prod = ENV['NODE_ENV'] == 'production'

if is_prod
  total_cpus = Etc.nprocessors
  puts "Total CPUs: #{total_cpus}"
  num_workers = total_cpus * 3
else
  num_workers = 2
end

puts "[Ruby Runner Master] Forking #{num_workers} workers..."

workers = []

num_workers.times do
  pid = fork do
    worker_main(server, VALID_API_KEY)
  end
  workers << pid
end

puts "[Ruby Runner Master] Running with PIDs: #{workers.join(", ")}"

# Wait forever
workers.each { |pid| Process.wait(pid) }

