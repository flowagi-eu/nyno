// sandbox-fs.mjs

import fs from "node:fs/promises";
import path from "node:path";
import { SandboxFSRead } from '../read.js';


// ============================================================
// TEST HELPERS
// ============================================================

function valuesEqual(actual, expected) {
  if (Object.is(actual, expected)) {
    return true;
  }

  if (
    actual === null ||
    expected === null ||
    typeof actual !== typeof expected
  ) {
    return false;
  }

  // Arrays
  if (
    Array.isArray(actual) ||
    Array.isArray(expected)
  ) {
    if (
      !Array.isArray(actual) ||
      !Array.isArray(expected)
    ) {
      return false;
    }

    if (actual.length !== expected.length) {
      return false;
    }

    return actual.every(
      (value, index) =>
        valuesEqual(
          value,
          expected[index]
        )
    );
  }

  // Objects
  if (
    typeof actual === "object" &&
    typeof expected === "object"
  ) {
    const actualKeys =
      Object.keys(actual);

    const expectedKeys =
      Object.keys(expected);

    if (
      actualKeys.length !==
      expectedKeys.length
    ) {
      return false;
    }

    return expectedKeys.every(key =>
      Object.hasOwn(actual, key) &&
      valuesEqual(
        actual[key],
        expected[key]
      )
    );
  }

  return false;
}


function getValue(object, valuePath) {
  if (!valuePath) {
    return object;
  }

  let value = object;

  for (const key of valuePath.split(".")) {
    if (
      value === null ||
      value === undefined
    ) {
      return undefined;
    }

    value = value[key];
  }

  return value;
}


function checkStatus(
  result,
  expectedStatus,
  description
) {
  if (!Array.isArray(result)) {
    console.log(
      `❌ ${description}`
    );

    console.log(
      "   result is not [statusCode, data]:",
      result
    );

    return false;
  }

  const actualStatus =
    result[0];

  if (
    actualStatus !==
    expectedStatus
  ) {
    console.log(
      `❌ ${description}`
    );

    console.log(
      `   expected status: ${expectedStatus}`
    );

    console.log(
      `   actual status:   ${actualStatus}`
    );

    console.log(
      "   data:",
      result[1]
    );

    return false;
  }

  console.log(
    `✅ ${description}`
  );

  console.log(
    `   status: ${actualStatus}`
  );

  return true;
}


function checkValue(
  actual,
  expected,
  description
) {
  if (
    !valuesEqual(
      actual,
      expected
    )
  ) {
    console.log(
      `❌ ${description}`
    );

    console.log(
      "   expected:",
      expected
    );

    console.log(
      "   actual:",
      actual
    );

    return false;
  }

  console.log(
    "   ✅ expected value:",
    expected
  );

  return true;
}


/**
 * Check both:
 *
 *   [0] status code
 *   [1] expected value
 *
 * Example:
 *
 *   check(
 *     result,
 *     0,
 *     "/data",
 *     "path",
 *     "ls /data"
 *   );
 */
function check(
  result,
  expectedStatus,
  expectedValue,
  valuePath,
  description
) {
  if (
    !checkStatus(
      result,
      expectedStatus,
      description
    )
  ) {
    return false;
  }

  if (
    expectedValue === undefined
  ) {
    return true;
  }

  const actual =
    getValue(
      result[1],
      valuePath
    );

  return checkValue(
    actual,
    expectedValue,
    `${description} value`
  );
}


// ============================================================
// TESTS
// ============================================================

async function runTests() {
  console.log("");
  console.log("========================================");
  console.log(" SandboxFSRead TESTS");
  console.log("========================================");
  console.log("");


  // ----------------------------------------------------------
  // TEST 1
  // No mounts = no filesystem access
  // ----------------------------------------------------------

  console.log("TEST 1: No mounts");

  const emptyFS =
    await SandboxFSRead.create({});

  let result =
    await emptyFS.ls("/");

  if (!check(
    result,
    -1,
    "LS_FAILED",
    "code",
    "root is blocked"
  )) {
    return;
  }


  // ----------------------------------------------------------
  // TEST 2
  // Create one fixed mount
  // ----------------------------------------------------------

  console.log("");
  console.log("TEST 2: Create fixed mount");

  const sandbox =
    await SandboxFSRead.create({
      "/data": "./demo-data",
    });

  result =
    sandbox.mounts();

  if (!check(
    result,
    0,
    1,
    "count",
    "one mount exists"
  )) {
    return;
  }


  // ----------------------------------------------------------
  // TEST 3
  // Verify mount
  //
  // The value of mounts["/data"] is the resolved real path,
  // so we check that it ends in demo-data instead of
  // incorrectly expecting boolean true.
  // ----------------------------------------------------------

  console.log("");
  console.log("TEST 3: Verify mount");

  result =
    sandbox.mounts();

  const mountedPath =
    result[1]?.mounts?.["/data"];

  if (
    result[0] !== 0
  ) {
    console.log(
      "❌ /data mount lookup failed"
    );

    console.log(
      "   result:",
      result
    );

    return;
  }

  console.log(
    "✅ /data exists"
  );

  console.log(
    "   status:",
    result[0]
  );

  if (
    typeof mountedPath !== "string"
  ) {
    console.log(
      "❌ /data mount path"
    );

    console.log(
      "   expected: string"
    );

    console.log(
      "   actual:",
      mountedPath
    );

    return;
  }

  if (
    !mountedPath.endsWith(
      `${path.sep}demo-data`
    ) &&
    !mountedPath.endsWith(
      "/demo-data"
    )
  ) {
    console.log(
      "❌ /data mount path"
    );

    console.log(
      "   expected path ending: demo-data"
    );

    console.log(
      "   actual:",
      mountedPath
    );

    return;
  }

  console.log(
    "   ✅ expected value: demo-data"
  );

  console.log(
    "   actual:",
    mountedPath
  );


  // ----------------------------------------------------------
  // TEST 4
  // ls /data
  // ----------------------------------------------------------

  console.log("");
  console.log("TEST 4: ls /data");

  result =
    await sandbox.ls("/data");

  if (!check(
    result,
    0,
    "/data",
    "path",
    "ls /data"
  )) {
    return;
  }


  // ----------------------------------------------------------
  // TEST 5
  // cat hello.txt
  // ----------------------------------------------------------

  console.log("");
  console.log("TEST 5: cat hello.txt");

  result =
    await sandbox.cat(
      "/data/hello.txt"
    );

  if (!check(
    result,
    0,
    "hello world\n",
    "content",
    "cat /data/hello.txt"
  )) {
    return;
  }


  // ----------------------------------------------------------
  // TEST 6
  // Nested directory
  // ----------------------------------------------------------

  console.log("");
  console.log("TEST 6: Nested directory");

  result =
    await sandbox.ls(
      "/data/src"
    );

  if (!check(
    result,
    0,
    "/data/src",
    "path",
    "ls /data/src"
  )) {
    return;
  }


  // ----------------------------------------------------------
  // TEST 7
  // File is not a directory
  // ----------------------------------------------------------

  console.log("");
  console.log("TEST 7: File as directory");

  result =
    await sandbox.ls(
      "/data/hello.txt"
    );

  if (!check(
    result,
    -1,
    "NOT_DIRECTORY",
    "code",
    "/data/hello.txt is not a directory"
  )) {
   console.log(JSON.stringify({result,check}));
 return;
  }


  // ----------------------------------------------------------
  // TEST 8
  // Directory is not a file
  // ----------------------------------------------------------

  console.log("");
  console.log("TEST 8: Directory as file");

  result =
    await sandbox.cat(
      "/data/src"
    );

  if (!check(
    result,
    -1,
    "IS_DIRECTORY",
    "code",
    "cannot cat a directory"
  )) {
   console.log(JSON.stringify({result,check}));
    return;
  }


  // ----------------------------------------------------------
  // BAD ACTOR 1
  // Absolute filesystem path
  // ----------------------------------------------------------

  console.log("");
  console.log("BAD ACTOR 1: /etc/passwd");

  result =
    await sandbox.cat(
      "/etc/passwd"
    );

  if (!check(
    result,
    -1,
    "CAT_FAILED",
    "code",
    "/etc/passwd is blocked"
  )) {
   console.log(JSON.stringify({result,check}));
    return;
  }


  // ----------------------------------------------------------
  // BAD ACTOR 2
  // Directory traversal
  // ----------------------------------------------------------

  console.log("");
  console.log("BAD ACTOR 2: ../ traversal");

  result =
    await sandbox.cat(
      "/data/../../etc/passwd"
    );

  if (!check(
    result,
    -1,
    "CAT_FAILED",
    "code",
    "directory traversal is blocked"
  )) {
   console.log(JSON.stringify({result,check}));
    return;
  }


  // ----------------------------------------------------------
  // BAD ACTOR 3
  // Deep traversal
  // ----------------------------------------------------------

  console.log("");
  console.log("BAD ACTOR 3: Deep traversal");

  result =
    await sandbox.cat(
      "/data/a/b/c/../../../../../../etc/passwd"
    );

  if (!check(
    result,
    -1,
    "CAT_FAILED",
    "code",
    "deep traversal is blocked"
  )) {
   console.log(JSON.stringify({result,check}));
    return;
  }


  // ----------------------------------------------------------
  // BAD ACTOR 4
  // Unmounted paths
  // ----------------------------------------------------------

  console.log("");
  console.log("BAD ACTOR 4: Unmounted paths");

  const badPaths = [
    "/home",
    "/tmp",
    "/var",
    "/usr",
    "/root",
    "/proc",
    "/sys",
  ];

  for (const badPath of badPaths) {
    result =
      await sandbox.ls(
        badPath
      );

    if (!check(
      result,
      -1,
      "LS_FAILED",
      "code",
      `${badPath} is blocked`
    )) {
   console.log(JSON.stringify({result,check}));
      return;
    }
  }


  // ----------------------------------------------------------
  // BAD ACTOR 5
  // Escape from mounted directory
  // ----------------------------------------------------------

  console.log("");
  console.log("BAD ACTOR 5: Mount escape");

  result =
    await sandbox.cat(
      "/data/../etc/passwd"
    );

  if (!check(
    result,
    -1,
    "CAT_FAILED",
    "code",
    "mount escape is blocked"
  )) {
   console.log(JSON.stringify({result,check}));
    return;
  }


  // ----------------------------------------------------------
  // BAD ACTOR 6
  // Nonexistent file
  // ----------------------------------------------------------

  console.log("");
  console.log("BAD ACTOR 6: Nonexistent file");

  result =
    await sandbox.cat(
      "/data/does-not-exist.txt"
    );

  if (!check(
    result,
    -1,
    "CAT_FAILED",
    "code",
    "nonexistent file fails"
  )) {
   console.log(JSON.stringify({result,check}));
    return;
  }


  // ----------------------------------------------------------
  // TEST 9
  // No mount mutation API
  // ----------------------------------------------------------

  console.log("");
  console.log("TEST 9: Mounts are immutable");

  if (
    typeof sandbox.mount === "function"
  ) {
    console.log(
      "❌ mount() should not exist"
    );

    return;
  }

  console.log(
    "   ✅ mount() does not exist"
  );

  if (
    typeof sandbox.unmount === "function"
  ) {
    console.log(
      "❌ unmount() should not exist"
    );

    return;
  }

  console.log(
    "   ✅ unmount() does not exist"
  );


  // ----------------------------------------------------------
  // TEST 10
  // Legitimate access still works
  // ----------------------------------------------------------

  console.log("");
  console.log("TEST 10: Legitimate access");

  result =
    await sandbox.cat(
      "/data/hello.txt"
    );

  if (!check(
    result,
    0,
    "hello world\n",
    "content",
    "legitimate cat still works"
  )) {
    return;
  }


  // ----------------------------------------------------------
  // DONE
  // ----------------------------------------------------------

  console.log("");
  console.log("========================================");
  console.log("🎉 GOOD — ALL CHECKS PASSED");
  console.log("========================================");
  console.log("");
}


// ============================================================
// RUN
// ============================================================

runTests().catch(err => {
  console.error("");
  console.error("💥 FATAL TEST ERROR");
  console.error(err);
});
