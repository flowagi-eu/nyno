import { Client } from 'ssh2';
import { readFileSync, existsSync } from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

export function nyno_ssh_rpc(args, context = {}) {
    return new Promise((resolve) => {
        if (!args || args.length < 2) {
            context.prev = {
                output: '',
                error: 'Usage: nyno_ssh_rpc [user@host, text]',
                exitCode: 1
            };
            return resolve(1);
        }

        const [target, text] = args;

        let username, server;

        if (target.includes('@')) {
            [username, server] = target.split('@', 2);
        } else {
            username = context.sshUsername || os.userInfo().username;
            server = target;
        }

        const port = context.sshPort || 22;

        const keyPath =
            context.sshKeyPath || path.join(os.homedir(), '.ssh', 'id_rsa');

        const useKey = existsSync(keyPath);

        const conn = new Client();

        conn.on('ready', () => {
            conn.sftp((err, sftp) => {
                if (err) {
                    context.prev = {
                        output: '',
                        error: err.message,
                        exitCode: 1
                    };
                    conn.end();
                    return resolve(1);
                }

                // Create remote temp file
                const tmpFile =
                    `/tmp/nyno-${crypto.randomBytes(16).toString('hex')}.nyno`;

                const writeStream = sftp.createWriteStream(tmpFile);

                writeStream.on('error', (err) => {
                    context.prev = {
                        output: '',
                        error: err.message,
                        exitCode: 1
                    };
                    conn.end();
                    return resolve(1);
                });

                writeStream.on('close', () => {
                    // IMPORTANT: deterministic execution, no shell
                    const execCmd =
                        `~/.bun/bin/bun ~/nyno-mini/nyno-mini ${tmpFile}`;

                    conn.exec(execCmd, (err, stream) => {
                        if (err) {
                            context.prev = {
                                output: '',
                                error: err.message,
                                exitCode: 1
                            };
                            conn.end();
                            return resolve(1);
                        }

                        let stdout = '';
                        let stderr = '';

                        stream.on('data', (d) => {
                            stdout += d.toString();
                            process.stdout.write(d);
                        });

                        stream.stderr.on('data', (d) => {
                            stderr += d.toString();
                            process.stderr.write(d);
                        });

                        stream.on('close', (code) => {
                            // cleanup tmp file
                            conn.exec(`rm -f ${tmpFile}`, () => {
                                conn.end();

                                context.prev = {
                                    output: stdout.trim(),
                                    error: stderr.trim() || null,
                                    exitCode: code
                                };

                                resolve(code === 0 ? 0 : 1);
                            });
                        });
                    });
                });

                writeStream.end(text);
            });
        });

        conn.on('error', (err) => {
            context.prev = {
                output: '',
                error: err.message,
                exitCode: 1
            };
            resolve(1);
        });

        const connectOpts = {
            host: server,
            port,
            username
        };

        if (useKey) {
            connectOpts.privateKey = readFileSync(keyPath);
        } else if (context.sshPassword) {
            connectOpts.password = context.sshPassword;
        }

        conn.connect(connectOpts);
    });
}
