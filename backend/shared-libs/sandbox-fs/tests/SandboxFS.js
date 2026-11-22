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
    // TEST 1
    // ----------------------------------------------------------

    console.log('TEST 1: Create sandbox');

    let result = await sandbox_fs(
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

    const [read, write] = result;

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
    console.log('TEST 3: Write through sandbox');

    result = await write.write(
        '/data/integration-test.txt',
        'hello from sandbox_fs'
    );

    if (result[0] !== 0) {
        console.log('❌ write failed');
        console.log('   status:', result[0]);
        console.log('   data:', result[1]);
        return;
    }

    console.log('✅ write succeeded');
    console.log('   status:', result[0]);


    // ----------------------------------------------------------
    // TEST 4
    // ----------------------------------------------------------

    console.log('');
    console.log('TEST 4: Read through sandbox');

    result = await read.cat(
        '/data/integration-test.txt'
    );

    if (result[0] !== 0) {
        console.log('❌ read failed');
        console.log('   status:', result[0]);
        console.log('   data:', result[1]);
        return;
    }

    console.log('✅ read succeeded');
    console.log('   status:', result[0]);

    const content =
        result[1]?.content ??
        result[1]?.data;

    if (content !== 'hello from sandbox_fs') {
        console.log('❌ incorrect content');
        console.log('   expected:', 'hello from sandbox_fs');
        console.log('   actual:', content);
        return;
    }

    console.log('   ✅ expected value:', content);


    // ----------------------------------------------------------
    // TEST 5
    // ----------------------------------------------------------

    console.log('');
    console.log('TEST 5: Unmounted write is blocked');

    result = await write.write(
        '/not-mounted/evil.txt',
        'evil'
    );

    if (result[0] !== -1) {
        console.log('❌ unmounted write was accepted');
        console.log('   expected status:', -1);
        console.log('   actual status:', result[0]);
        return;
    }

    console.log('✅ unmounted write blocked');
    console.log('   status:', result[0]);


    // ----------------------------------------------------------
    // TEST 6
    // ----------------------------------------------------------

    console.log('');
    console.log('TEST 6: Unmounted read is blocked');

    result = await read.cat(
        '/not-mounted/secret.txt'
    );

    if (result[0] !== -1) {
        console.log('❌ unmounted read was accepted');
        console.log('   expected status:', -1);
        console.log('   actual status:', result[0]);
        return;
    }

    console.log('✅ unmounted read blocked');
    console.log('   status:', result[0]);


    // ----------------------------------------------------------
    // TEST 7
    // ----------------------------------------------------------

    console.log('');
    console.log('TEST 7: Nested write');

    result = await write.write(
        '/data/a/b/c.txt',
        'nested'
    );

    if (result[0] !== 0) {
        console.log('❌ nested write failed');
        console.log('   status:', result[0]);
        console.log('   data:', result[1]);
        return;
    }

    console.log('✅ nested write succeeded');


    // ----------------------------------------------------------
    // TEST 8
    // ----------------------------------------------------------

    console.log('');
    console.log('TEST 8: Invalid sandbox arguments');

    try {
	    result = await sandbox_fs(
		{},
		{
		    '/data': './demo-data',
		},
	    );
   } catch(err) {

        console.log('❌ valid empty read mounts rejected');
        console.log('   status:', result[0]);
        console.log('   data:', result[1]);
        return;
    }

    console.log('✅ empty read mounts accepted');


    // ----------------------------------------------------------
    // FINAL
    // ----------------------------------------------------------

    console.log('');
    console.log('========================================');
    console.log('🎉 GOOD — ALL CHECKS PASSED');
    console.log('========================================');
    console.log('');
}


// ============================================================
// RUN TESTS
// ============================================================

runTests().catch(err => {
    console.error('');
    console.error('💥 FATAL TEST ERROR');
    console.error(err);
});

