import { readFileSync, existsSync } from 'fs';
import { Client } from 'ssh2';
import os from 'os';
import path from 'path';

/**
 * Upload a local file to a remote server via SFTP with retry on connection errors.
 *
 * @param {Array} args - [ "user@server" or "server", "localFilePath", "remoteFilePath?" ]
 *                        If remoteFilePath is omitted, uploads to remote home directory.
 * @param {Object} context - { sshUsername, sshPassword, sshKeyPath, sshPort, setContext }
 * @param {number} retries - Number of connection retries (default: 10)
 * @returns {Promise<number>} - 0 on success, 1 on failure
 */
export function nyno_sftp_command(args, context = {}, retries = 10) {
    return new Promise((resolve) => {
        if (!args || args.length < 2) {
            const setName = context.setContext || 'prev';
            context[`${setName}.error`] = "Usage: sftp_upload user@server localFilePath [remoteFilePath]";
            return resolve(1);
        }

        let [target, localFile, remoteFile] = args;
        if (!existsSync(localFile)) {
            const setName = context.setContext || 'prev';
            context[`${setName}.error`] = `Local file does not exist: ${localFile}`;
            return resolve(1);
        }

        let username, server;
        if (target.includes('@')) {
            [username, server] = target.split('@', 2);
        } else {
            username = context.sshUsername || os.userInfo().username;
            server = target;
        }

        const port = context.sshPort || 22;
        const keyPath = context.sshKeyPath || path.join(os.homedir(), '.ssh', 'id_rsa');
        const useKey = existsSync(keyPath);

        if (!useKey && !context.sshPassword) {
            const setName = context.setContext || 'prev';
            context[`${setName}.error`] = `No SSH key or password provided and default key not found at ${keyPath}`;
            return resolve(1);
        }

        if (!remoteFile) {
            if(target.startsWith('root')) {
                remoteFile = path.posix.join('/root', path.basename(localFile));
            } else {
                remoteFile = path.posix.join('/home', username, path.basename(localFile));
            }
        }

        let attempt = 0;

        const tryConnect = () => {
            attempt++;
            const conn = new Client();

            conn.on('ready', () => {
                console.log(`[SFTP] Connected to ${username}@${server} (attempt ${attempt})`);
                conn.sftp((err, sftp) => {
                    if (err) {
                        console.error(`[SFTP ERROR] ${err.message}`);
                        const setName = context.setContext || 'prev';
                        context[`${setName}.error`] = err.message;
                        conn.end();
                        return resolve(1);
                    }

                    console.log(`[SFTP] Uploading ${localFile} -> ${remoteFile}`);
                    sftp.fastPut(localFile, remoteFile, {}, (err) => {
                        const setName = context.setContext || 'prev';
                        if (err) {
                            context[`${setName}.error`] = err.message;
                            console.error(`[SFTP ERROR] ${err.message}`);
                            conn.end();
                            return resolve(1);
                        }
                        console.log(`[SFTP] Upload successful`);
                        context[setName] = {
                            uploaded: localFile,
                            remotePath: remoteFile
                        };
                        conn.end();
                        resolve(0);
                    });
                });
            });

            conn.on('error', (err) => {
                console.error(`[SFTP CONNECTION ERROR] Attempt ${attempt}: ${err.message}`);
                if (attempt < retries) {
                    console.log(`[SFTP] Retrying connection in 2s...`);
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

    const args = ["root@140.82.53.102", "./localfile.txt", "/root/remote_uploaded.txt"];

    nyno_sftp_command(args, context).then((result) => {
        console.log(`Return code: ${result}`);
        console.log(`Context:`, context.test);
        if (context['test.error']) {
            console.log(`Error: ${context['test.error']}`);
        }
    });
}

