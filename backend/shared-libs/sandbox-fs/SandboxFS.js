import { SandboxFSRead  } from './read.js';
import { SandboxFSWrite } from './write.js';

export async function sandbox_fs(readPairs,writePairs) {
    try {
        const read = await SandboxFSRead.create(readPairs);
        const write = await SandboxFSWrite.create(writePairs);
        return [read, write];
    } catch (err) {
	throw new Error(JSON.stringify({
                code: 'SANDBOX_FS_INIT_FAILED',
                message: err.message,
            }));
    }
}

