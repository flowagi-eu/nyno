import fs from 'node:fs/promises';
import path from 'node:path';

import { sandbox_fs } from '../SandboxFS.js';

// ============================================================
// TESTS
// ============================================================

async function runTests() {
    console.log('');
    console.log('========================================');
    console.log(' sandbox_fs INTEGRATION TESTS');
    console.log('========================================');
    console.log('');

    // ----------------------------------------------------------
    // CLEAN TEST DATA
    // ----------------------------------------------------------

    const demoData =
        path.resolve('./demo-data');

    const realDir =
        path.join(
            demoData,
            'real-dir'
        );

    const symlinkDir =
        path.join(
            demoData,
            'symlink-dir'
        );

    await fs.rm(
        realDir,
        {
            recursive: true,
            force: true,
        }
    );

    await fs.rm(
        symlinkDir,
        {
            recursive: true,
            force: true,
        }
    );

    await fs.mkdir(
        demoData,
        {
            recursive: true,
        }
    );

    // ----------------------------------------------------------
    // TEST 1
    // ----------------------------------------------------------

    console.log('TEST 1: Create sandbox');

    let result =
        await sandbox_fs(
            {
                '/data': './demo-data',
            },
            {
                '/data': './demo-data',
            },
        );

    console.log('✅ sandbox created');

    // ----------------------------------------------------------
    // TEST 2
    // ----------------------------------------------------------

    console.log('');
    console.log('TEST 2: Read and write objects exist');

    const [read, write] =
        result;

    if (!read) {
        console.log('❌ read object missing');
        return;
    }

    console.log('✅ read object exists');

    if (!write) {
        console.log('❌ write object missing');
        return;
    }

    console.log('✅ write object exists');

    // ----------------------------------------------------------
    // TEST 3
    // ----------------------------------------------------------

    console.log('');
    console.log('TEST 3: Create directory containing symlink');

    await fs.mkdir(
        realDir,
        {
            recursive: true,
        }
    );

    await fs.writeFile(
        path.join(
            realDir,
            'secret.txt'
        ),
        'secret',
        'utf8'
    );

    await fs.symlink(
        realDir,
        symlinkDir,
        'dir'
    );

    console.log('✅ real directory created');
    console.log('✅ symlink created');

    // ----------------------------------------------------------
    // TEST 4
    // ----------------------------------------------------------

    console.log('');
    console.log('TEST 4: Read through symlink');

    result =
        await read.ls(
            '/data/symlink-dir'
        );

    if (result[0] === -1) {
        console.log(
            '✅ read through symlink blocked'
        );
        console.log(
            '   status:',
            result[0]
        );
    } else {
        console.log(
            '❌ read through symlink unexpectedly succeeded'
        );
        console.log(
            '   expected status: -1'
        );
        console.log(
            '   actual status:',
            result[0]
        );
        console.log(
            '   data:',
            result[1]
        );
    }

    // ----------------------------------------------------------
    // TEST 5
    // ----------------------------------------------------------

    console.log('');
    console.log('TEST 5: Write through symlink');

    result =
        await write.write(
            '/data/symlink-dir/hacked.txt',
            'hacked'
        );

    if (result[0] === -1) {
        console.log(
            '✅ write through symlink blocked'
        );
        console.log(
            '   status:',
            result[0]
        );
    } else {
        console.log(
            '❌ write through symlink unexpectedly succeeded'
        );
        console.log(
            '   expected status: -1'
        );
        console.log(
            '   actual status:',
            result[0]
        );
        console.log(
            '   data:',
            result[1]
        );
    }

    // ----------------------------------------------------------
    // TEST 6
    // ----------------------------------------------------------

    console.log('');
    console.log('TEST 6: Verify symlink target was not modified');

    try {
        await fs.access(
            path.join(
                realDir,
                'hacked.txt'
            )
        );

        console.log(
            '❌ SECURITY FAILURE: hacked.txt exists in target'
        );

    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log(
                '✅ target directory was not modified'
            );
        } else {
            console.log(
                '❌ unexpected filesystem error'
            );
            console.log(err);
        }
    }

    // ----------------------------------------------------------
    // TEST 7
    // ----------------------------------------------------------

    console.log('');
    console.log('TEST 7: Direct symlink file');

    const realFile =
        path.join(
            demoData,
            'real-file.txt'
        );

    const symlinkFile =
        path.join(
            demoData,
            'symlink-file.txt'
        );

    await fs.rm(
        realFile,
        {
            force: true,
        }
    );

    await fs.rm(
        symlinkFile,
        {
            force: true,
        }
    );

    await fs.writeFile(
        realFile,
        'secret file',
        'utf8'
    );

    await fs.symlink(
        realFile,
        symlinkFile
    );

    result =
        await read.cat(
            '/data/symlink-file.txt'
        );

    if (result[0] === -1) {
        console.log(
            '✅ cat through symlink blocked'
        );
        console.log(
            '   status:',
            result[0]
        );
    } else {
        console.log(
            '❌ cat through symlink unexpectedly succeeded'
        );
        console.log(
            '   expected status: -1'
        );
        console.log(
            '   actual status:',
            result[0]
        );
        console.log(
            '   data:',
            result[1]
        );
    }

    // ----------------------------------------------------------
    // TEST 8
    // ----------------------------------------------------------

    console.log('');
    console.log('TEST 8: Write direct symlink');

    result =
        await write.write(
            '/data/symlink-file.txt',
            'overwritten'
        );

    if (result[0] === -1) {
        console.log(
            '✅ write to symlink blocked'
        );
        console.log(
            '   status:',
            result[0]
        );
    } else {
        console.log(
            '❌ write to symlink unexpectedly succeeded'
        );
        console.log(
            '   expected status: -1'
        );
        console.log(
            '   actual status:',
            result[0]
        );
        console.log(
            '   data:',
            result[1]
        );
    }

    // ----------------------------------------------------------
    // DONE
    // ----------------------------------------------------------

    console.log('');
    console.log('========================================');
    console.log(' SYMLINK SECURITY TESTS COMPLETE');
    console.log('========================================');
    console.log('');
}

runTests().catch(err => {
    console.error('');
    console.error('💥 FATAL TEST ERROR');
    console.error(err);
});
