import { readFileSync, existsSync } from 'fs';
import { Client } from 'ssh2';
import os from 'os';
import path from 'path';

/**
 * Execute a command on a remote server via SSH with live logging and retry on connection errors.
 *
 * @param {Array} args - [ "user@server" or "server", "command" ]
 * @param {Object} context - { sshUsername, sshPassword, sshKeyPath, sshPort, setContext }
 * @param {number} retries - Number of connection retries (default: 10)
 * @returns {Promise<number>} - 0 on success, 1 on failure
 */
export function nyno_ssh_command(args, context = {}, retries = 10) {
    return new Promise((resolve) => {
        if (!args || args.length < 2) {
            const setName = context.setContext || 'prev';
            context[`${setName}.error`] = "Usage: ssh_command user@server command";
            return resolve(1);
        }

        let [target, command] = args;
        let username, server;

        if (target.includes('@')) {
            [username, server] = target.split('@', 2);
        } else {
            username = context.sshUsername || os.userInfo().username;
            server = target;
        }

        const port = context.sshPort || 22;

        // Determine key path (default to ~/.ssh/id_rsa)
        const keyPath = context.sshKeyPath || path.join(os.homedir(), '.ssh', 'id_rsa');
        const useKey = existsSync(keyPath);

        if (!useKey && !context.sshPassword) {
            const setName = context.setContext || 'prev';
            context[`${setName}.error`] = `No SSH key or password provided and default key not found at ${keyPath}`;
            return resolve(1);
        }

        let attempt = 0;

        const tryConnect = () => {
            attempt++;
            const conn = new Client();

            conn.on('ready', () => {
                console.log(`[SSH] Connected to ${username}@${server} (attempt ${attempt})`);
                conn.exec(command, (err, stream) => {
                    if (err) {
                        context[`${context.setContext || 'prev'}.error`] = err.message;
                        console.error(`[SSH ERROR] ${err.message}`);
                        conn.end();
                        return resolve(1);
                    }

                    let output = '';
                    let error = '';

                    stream.on('close', (code) => {
                        const setName = context.setContext || 'prev';
                        context[setName] = {
                            output: output.trim(),
                            error: error.trim() || null,
                            exitCode: code
                        };
                        console.log(`[SSH] Command finished with code ${code}`);
                        conn.end();
                        resolve(0);
                    });

                    // Log stdout live
                    stream.on('data', (data) => {
                        const chunk = data.toString();
                        output += chunk;
                        process.stdout.write(chunk);
                    });

                    // Log stderr live
                    stream.stderr.on('data', (data) => {
                        const chunk = data.toString();
                        error += chunk;
                        process.stderr.write(chunk);
                    });
                });
            });

            conn.on('error', (err) => {
                console.error(`[SSH CONNECTION ERROR] Attempt ${attempt}: ${err.message}`);
                if (attempt < retries) {
                    console.log(`[SSH] Retrying connection in 2s...`);
                    setTimeout(tryConnect, 2000);
                } else {
                    const setName = context.setContext || 'prev';
                    context[`${setName}.error`] = err.message;
                    resolve(1);
                }
            });

            // Connect with key or password
            const connectOptions = { host: server, port, username };
            if (useKey) connectOptions.privateKey = readFileSync(keyPath);
            else connectOptions.password = context.sshPassword;

            conn.connect(connectOptions);
        };

        tryConnect();
    });
}

// -----------------------------
// Test block when run directly
// -----------------------------
if (process.argv[1] === new URL(import.meta.url).pathname) {
    const context = {
        sshPassword: '',        // leave empty to use key
        sshKeyPath: null,       // will default to ~/.ssh/id_rsa
        setContext: 'test'
    };

    const args = ["root@140.82.53.102", "apt update; apt install podman git nginx certbot python3-certbot-nginx -y"];

    nyno_ssh_command(args, context).then((result) => {
        console.log(`Return code: ${result}`);
        console.log(`Context:`, context.test);
        if (context['test.error']) {
            console.log(`Error: ${context['test.error']}`);
        }
    });
}

