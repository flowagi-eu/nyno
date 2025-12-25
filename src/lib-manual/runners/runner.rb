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
# Load extensions
############################################################

def load_extensions
  possible_dirs = [
    File.expand_path("../../../extensions", __dir__),
    File.expand_path("../../../../nyno-private-extensions", __dir__)
  ]

  possible_dirs.each do |ext_base|
    next unless Dir.exist?(ext_base)

    Dir.each_child(ext_base) do |folder|
      dir_path = File.join(ext_base, folder)
      next unless Dir.exist?(dir_path)

      cmd_file = File.join(dir_path, "command.rb")
      next unless File.exist?(cmd_file)

      begin
        require_relative cmd_file
        func_name = folder.downcase.gsub("-", "_")
        # optionally: verify method exists
        puts "[Ruby Runner] Loaded extension #{func_name}"
      rescue => e
        puts "[Ruby Runner] Failed to load #{cmd_file}: #{e.message}"
      end
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
          socket.write({ fnError: "not exist" }.to_json + "\n")
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

