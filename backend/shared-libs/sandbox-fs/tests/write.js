// index.js

import fs from "node:fs/promises";
import path from "node:path";
import { SandboxFSWrite } from '../write.js';


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

    return expectedKeys.every(
      key =>
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

  for (
    const key of valuePath.split(".")
  ) {
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
    actualStatus !== expectedStatus
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


async function exists(filename) {
  try {
    await fs.lstat(filename);
    return true;
  } catch {
    return false;
  }
}


async function expectFile(
  filename,
  expectedContent
) {
  try {
    const content =
      await fs.readFile(
        filename,
        "utf8"
      );

    return (
      content ===
      expectedContent
    );
  } catch {
    return false;
  }
}


// ============================================================
// TESTS
// ============================================================

async function runTests() {
  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    " SandboxFSWrite TESTS"
  );
  console.log(
    "========================================"
  );
  console.log("");


  // ----------------------------------------------------------
  // CLEAN START
  // ----------------------------------------------------------

  await fs.rm(
    "./demo-data",
    {
      recursive: true,
      force: true,
    }
  );

  await fs.rm(
    "./demo-app",
    {
      recursive: true,
      force: true,
    }
  );

  await fs.rm(
    "./outside-sandbox-target",
    {
      recursive: true,
      force: true,
    }
  );


  // ==========================================================
  // TEST 1
  // ==========================================================

  console.log(
    "TEST 1: No mounts"
  );

  const emptyFS =
    await SandboxFSWrite.create({});

  let result =
    await emptyFS.write(
      "/hello.txt",
      "bad"
    );

  if (!check(
    result,
    -1,
    "WRITE_FAILED",
    "code",
    "unmounted write is blocked"
  )) {
    return;
  }


  // ==========================================================
  // TEST 2
  // ==========================================================

  console.log("");
  console.log(
    "TEST 2: Create fixed mounts"
  );

  const sandbox =
    await SandboxFSWrite.create({
      "/data":
        "./demo-data",

      "/data/app":
        "./demo-app",
    });

  result =
    sandbox.mounts();

  if (!check(
    result,
    0,
    2,
    "count",
    "two mounts exist"
  )) {
    return;
  }


  // ==========================================================
  // TEST 3
  // ==========================================================

  console.log("");
  console.log(
    "TEST 3: Mounted directories created automatically"
  );

  if (!await exists("./demo-data")) {
    console.log(
      "❌ demo-data was not created"
    );
    return;
  }

  if (!await exists("./demo-app")) {
    console.log(
      "❌ demo-app was not created"
    );
    return;
  }

  console.log(
    "   ✅ demo-data exists"
  );

  console.log(
    "   ✅ demo-app exists"
  );


  // ==========================================================
  // TEST 4
  // ==========================================================

  console.log("");
  console.log(
    "TEST 4: Write file"
  );

  result =
    await sandbox.write(
      "/data/hello.txt",
      "hello world\n"
    );

  if (!check(
    result,
    0,
    "/data/hello.txt",
    "path",
    "write hello.txt"
  )) {
    return;
  }


  // ==========================================================
  // TEST 5
  // ==========================================================

  console.log("");
  console.log(
    "TEST 5: Write directory"
  );

  result =
    await sandbox.mkdir(
      "/data/src"
    );

  if (!check(
    result,
    0,
    "/data/src",
    "path",
    "create src directory"
  )) {
    return;
  }

  result =
    await sandbox.write(
      "/data/src",
      "bad"
    );

  if (!check(
    result,
    -1,
    "IS_DIRECTORY",
    "code",
    "cannot write to directory"
  )) {
    return;
  }


  // ==========================================================
  // TEST 6
  // ==========================================================

  console.log("");
  console.log(
    "TEST 6: Recursive write"
  );

  result =
    await sandbox.write(
      "/data/a/b/c/file.txt",
      "nested"
    );

  if (!check(
    result,
    0,
    "/data/a/b/c/file.txt",
    "path",
    "write nested file"
  )) {
    return;
  }


  // ==========================================================
  // TEST 7
  // ==========================================================

  console.log("");
  console.log(
    "TEST 7: Copy file"
  );

  result =
    await sandbox.cp(
      "/data/hello.txt",
      "/data/hello-copy.txt"
    );

  if (!check(
    result,
    0,
    "file",
    "type",
    "copy file"
  )) {
    return;
  }

  if (!await expectFile(
    "./demo-data/hello-copy.txt",
    "hello world\n"
  )) {
    console.log(
      "❌ copied file contents incorrect"
    );
    return;
  }

  console.log(
    "   ✅ copied file contents correct"
  );


  // ==========================================================
  // TEST 8
  // ==========================================================

  console.log("");
  console.log(
    "TEST 8: Copy directory recursively"
  );

  await sandbox.write(
    "/data/copy-source/one.txt",
    "one"
  );

  await sandbox.write(
    "/data/copy-source/nested/two.txt",
    "two"
  );

  await sandbox.write(
    "/data/copy-source/nested/deeper/three.txt",
    "three"
  );

  result =
    await sandbox.cp(
      "/data/copy-source",
      "/data/copy-destination"
    );

  if (!check(
    result,
    0,
    "directory",
    "type",
    "copy directory"
  )) {
    return;
  }

  if (!await expectFile(
    "./demo-data/copy-destination/one.txt",
    "one"
  )) {
    console.log(
      "❌ copied directory file one missing"
    );
    return;
  }

  if (!await expectFile(
    "./demo-data/copy-destination/nested/two.txt",
    "two"
  )) {
    console.log(
      "❌ copied directory file two missing"
    );
    return;
  }

  if (!await expectFile(
    "./demo-data/copy-destination/nested/deeper/three.txt",
    "three"
  )) {
    console.log(
      "❌ copied directory file three missing"
    );
    return;
  }

  console.log(
    "   ✅ recursive directory contents correct"
  );


  // ==========================================================
  // TEST 9
  // ==========================================================

  console.log("");
  console.log(
    "TEST 9: Copy cannot overwrite"
  );

  result =
    await sandbox.cp(
      "/data/hello.txt",
      "/data/hello-copy.txt"
    );

  if (!check(
    result,
    -1,
    "DESTINATION_EXISTS",
    "code",
    "copy existing destination rejected"
  )) {
    return;
  }


  // ==========================================================
  // TEST 10
  // ==========================================================

  console.log("");
  console.log(
    "TEST 10: Move file"
  );

  result =
    await sandbox.write(
      "/data/move-me.txt",
      "move me"
    );

  if (result[0] !== 0) {
    console.log(
      "❌ unable to create move source"
    );
    return;
  }

  result =
    await sandbox.mv(
      "/data/move-me.txt",
      "/data/moved.txt"
    );

  if (!check(
    result,
    0,
    "file",
    "type",
    "move file"
  )) {
    return;
  }

  if (
    await exists(
      "./demo-data/move-me.txt"
    )
  ) {
    console.log(
      "❌ original file still exists"
    );
    return;
  }

  if (!await expectFile(
    "./demo-data/moved.txt",
    "move me"
  )) {
    console.log(
      "❌ moved file contents incorrect"
    );
    return;
  }

  console.log(
    "   ✅ source removed"
  );

  console.log(
    "   ✅ destination correct"
  );


  // ==========================================================
  // TEST 11
  // ==========================================================

  console.log("");
  console.log(
    "TEST 11: Move directory recursively"
  );

  await sandbox.write(
    "/data/move-directory/a.txt",
    "A"
  );

  await sandbox.write(
    "/data/move-directory/nested/b.txt",
    "B"
  );

  result =
    await sandbox.mv(
      "/data/move-directory",
      "/data/moved-directory"
    );

  if (!check(
    result,
    0,
    "directory",
    "type",
    "move directory"
  )) {
    return;
  }

  if (
    await exists(
      "./demo-data/move-directory"
    )
  ) {
    console.log(
      "❌ original directory still exists"
    );
    return;
  }

  if (!await expectFile(
    "./demo-data/moved-directory/a.txt",
    "A"
  )) {
    console.log(
      "❌ moved directory file A missing"
    );
    return;
  }

  if (!await expectFile(
    "./demo-data/moved-directory/nested/b.txt",
    "B"
  )) {
    console.log(
      "❌ moved directory file B missing"
    );
    return;
  }

  console.log(
    "   ✅ recursive directory move correct"
  );


  // ==========================================================
  // TEST 12
  // ==========================================================

  console.log("");
  console.log(
    "TEST 12: Cross-mount copy file"
  );

  result =
    await sandbox.cp(
      "/data/hello.txt",
      "/data/app/from-data.txt"
    );

  if (!check(
    result,
    0,
    "file",
    "type",
    "cross-mount file copy"
  )) {
    return;
  }

  if (!await expectFile(
    "./demo-app/from-data.txt",
    "hello world\n"
  )) {
    console.log(
      "❌ cross-mount file copy incorrect"
    );
    return;
  }

  console.log(
    "   ✅ destination is demo-app"
  );


  // ==========================================================
  // TEST 13
  // ==========================================================

  console.log("");
  console.log(
    "TEST 13: Cross-mount copy directory"
  );

  await sandbox.write(
    "/data/cross-source/a.txt",
    "A"
  );

  await sandbox.write(
    "/data/cross-source/nested/b.txt",
    "B"
  );

  result =
    await sandbox.cp(
      "/data/cross-source",
      "/data/app/cross-destination"
    );

  if (!check(
    result,
    0,
    "directory",
    "type",
    "cross-mount directory copy"
  )) {
    return;
  }

  if (!await expectFile(
    "./demo-app/cross-destination/a.txt",
    "A"
  )) {
    console.log(
      "❌ cross-mount directory file A missing"
    );
    return;
  }

  if (!await expectFile(
    "./demo-app/cross-destination/nested/b.txt",
    "B"
  )) {
    console.log(
      "❌ cross-mount directory file B missing"
    );
    return;
  }

  console.log(
    "   ✅ cross-mount recursive copy correct"
  );


  // ==========================================================
  // TEST 14
  // ==========================================================

  console.log("");
  console.log(
    "TEST 14: Cross-mount move file"
  );

  await sandbox.write(
    "/data/cross-move.txt",
    "cross move"
  );

  result =
    await sandbox.mv(
      "/data/cross-move.txt",
      "/data/app/cross-moved.txt"
    );

  if (!check(
    result,
    0,
    true,
    "crossMount",
    "cross-mount file move"
  )) {
    return;
  }

  if (
    await exists(
      "./demo-data/cross-move.txt"
    )
  ) {
    console.log(
      "❌ cross-mount move source still exists"
    );
    return;
  }

  if (!await expectFile(
    "./demo-app/cross-moved.txt",
    "cross move"
  )) {
    console.log(
      "❌ cross-mount moved file incorrect"
    );
    return;
  }

  console.log(
    "   ✅ cross-mount move correct"
  );


  // ==========================================================
  // TEST 15
  // ==========================================================

  console.log("");
  console.log(
    "TEST 15: Cross-mount move directory"
  );

  await sandbox.write(
    "/data/cross-move-dir/a.txt",
    "A"
  );

  await sandbox.write(
    "/data/cross-move-dir/nested/b.txt",
    "B"
  );

  result =
    await sandbox.mv(
      "/data/cross-move-dir",
      "/data/app/cross-moved-dir"
    );

  if (!check(
    result,
    0,
    true,
    "crossMount",
    "cross-mount directory move"
  )) {
    return;
  }

  if (
    await exists(
      "./demo-data/cross-move-dir"
    )
  ) {
    console.log(
      "❌ cross-mount directory source still exists"
    );
    return;
  }

  if (!await expectFile(
    "./demo-app/cross-moved-dir/a.txt",
    "A"
  )) {
    console.log(
      "❌ cross-mount moved directory A missing"
    );
    return;
  }

  if (!await expectFile(
    "./demo-app/cross-moved-dir/nested/b.txt",
    "B"
  )) {
    console.log(
      "❌ cross-mount moved directory B missing"
    );
    return;
  }

  console.log(
    "   ✅ cross-mount directory move correct"
  );


  // ==========================================================
  // TEST 16
  // ==========================================================

  console.log("");
  console.log(
    "TEST 16: Recursive remove"
  );

  await sandbox.write(
    "/data/delete-me/a.txt",
    "A"
  );

  await sandbox.write(
    "/data/delete-me/nested/b.txt",
    "B"
  );

  await sandbox.write(
    "/data/delete-me/nested/deeper/c.txt",
    "C"
  );

  result =
    await sandbox.rm(
      "/data/delete-me"
    );

  if (!check(
    result,
    0,
    true,
    "recursive",
    "remove directory recursively"
  )) {
    return;
  }

  if (
    await exists(
      "./demo-data/delete-me"
    )
  ) {
    console.log(
      "❌ recursive directory still exists"
    );
    return;
  }

  console.log(
    "   ✅ recursive directory removed"
  );


  // ==========================================================
  // SECURITY TEST 17
  // ==========================================================

  console.log("");
  console.log(
    "SECURITY TEST 17: Directory traversal"
  );

  result =
    await sandbox.write(
      "/data/../../evil.txt",
      "EVIL"
    );

  if (!check(
    result,
    -1,
    "WRITE_FAILED",
    "code",
    "directory traversal blocked"
  )) {
    return;
  }


  // ==========================================================
  // SECURITY TEST 18
  // ==========================================================

  console.log("");
  console.log(
    "SECURITY TEST 18: Unmounted copy"
  );

  result =
    await sandbox.cp(
      "/etc/passwd",
      "/data/passwd-copy"
    );

  if (!check(
    result,
    -1,
    "COPY_FAILED",
    "code",
    "unmounted source copy blocked"
  )) {
    return;
  }


  // ==========================================================
  // SECURITY TEST 19
  // ==========================================================

  console.log("");
  console.log(
    "SECURITY TEST 19: Unmounted move"
  );

  result =
    await sandbox.mv(
      "/etc/passwd",
      "/data/passwd-moved"
    );

  if (!check(
    result,
    -1,
    "MOVE_FAILED",
    "code",
    "unmounted source move blocked"
  )) {
    return;
  }


  // ==========================================================
  // SECURITY TEST 20
  // ==========================================================

  console.log("");
  console.log(
    "SECURITY TEST 20: Mount root cannot be copied"
  );

  result =
    await sandbox.cp(
      "/data",
      "/data/data-copy"
    );

  if (!check(
    result,
    -1,
    "MOUNT_ROOT",
    "code",
    "mount root copy blocked"
  )) {
    return;
  }


  // ==========================================================
  // SECURITY TEST 21
  // ==========================================================

  console.log("");
  console.log(
    "SECURITY TEST 21: Mount root cannot be moved"
  );

  result =
    await sandbox.mv(
      "/data",
      "/data/data-moved"
    );

  if (!check(
    result,
    -1,
    "MOUNT_ROOT",
    "code",
    "mount root move blocked"
  )) {
    return;
  }


  // ==========================================================
  // SECURITY TEST 22
  // ==========================================================

  console.log("");
  console.log(
    "SECURITY TEST 22: Mount root cannot be removed"
  );

  result =
    await sandbox.rm(
      "/data"
    );

  if (!check(
    result,
    -1,
    "MOUNT_ROOT",
    "code",
    "mount root remove blocked"
  )) {
    return;
  }


  // ==========================================================
  // SECURITY TEST 23
  // ==========================================================

  console.log("");
  console.log(
    "SECURITY TEST 23: Symlink escape"
  );

  await fs.mkdir(
    "./outside-sandbox-target",
    {
      recursive: true,
    }
  );

  await fs.writeFile(
    "./outside-sandbox-target/protected.txt",
    "DO NOT MODIFY",
    "utf8"
  );

  await fs.symlink(
    "../outside-sandbox-target",
    "./demo-data/escape",
    "dir"
  );


  result =
    await sandbox.cp(
      "/data/escape/protected.txt",
      "/data/stolen.txt"
    );

  if (!check(
    result,
    -1,
    "COPY_FAILED",
    "code",
    "symlink source escape blocked"
  )) {
    return;
  }


  result =
    await sandbox.mv(
      "/data/escape/protected.txt",
      "/data/stolen-moved.txt"
    );

  if (!check(
    result,
    -1,
    "MOVE_FAILED",
    "code",
    "symlink source move escape blocked"
  )) {
    return;
  }


  result =
    await sandbox.write(
      "/data/escape/evil.txt",
      "EVIL"
    );

  if (!check(
    result,
    -1,
    "WRITE_FAILED",
    "code",
    "symlink write escape blocked"
  )) {
    return;
  }


  result =
    await sandbox.rm(
      "/data/escape"
    );

  if (!check(
    result,
    -1,
    "RM_FAILED",
    "code",
    "symlink remove escape blocked"
  )) {
    return;
  }


  if (!await expectFile(
    "./outside-sandbox-target/protected.txt",
    "DO NOT MODIFY"
  )) {
    console.log(
      "❌ outside protected file was modified/deleted"
    );
    return;
  }

  console.log(
    "   ✅ outside protected file remains intact"
  );

  await fs.unlink(
    "./demo-data/escape"
  );


  // ==========================================================
  // SECURITY TEST 24
  // ==========================================================

  console.log("");
  console.log(
    "SECURITY TEST 24: Longest matching mount wins"
  );

  result =
    await sandbox.write(
      "/data/app/nested-mount.txt",
      "nested mount"
    );

  if (!check(
    result,
    0,
    "/data/app/nested-mount.txt",
    "path",
    "nested mount write"
  )) {
    return;
  }

  if (!await expectFile(
    "./demo-app/nested-mount.txt",
    "nested mount"
  )) {
    console.log(
      "❌ nested mount resolved incorrectly"
    );
    return;
  }

  if (
    await exists(
      "./demo-data/app/nested-mount.txt"
    )
  ) {
    console.log(
      "❌ nested mount incorrectly used parent mount"
    );
    return;
  }

  console.log(
    "   ✅ longest mount match works correctly"
  );


  // ==========================================================
  // SECURITY TEST 25
  // ==========================================================

  console.log("");
  console.log(
    "SECURITY TEST 25: Destination symlink escape"
  );

  await fs.symlink(
    "../outside-sandbox-target",
    "./demo-data/destination-escape",
    "dir"
  );

  result =
    await sandbox.cp(
      "/data/hello.txt",
      "/data/destination-escape/copied.txt"
    );

  if (!check(
    result,
    -1,
    "COPY_FAILED",
    "code",
    "destination symlink escape blocked"
  )) {
    return;
  }

  if (
    await exists(
      "./outside-sandbox-target/copied.txt"
    )
  ) {
    console.log(
      "❌ copy escaped through destination symlink"
    );
    return;
  }

  console.log(
    "   ✅ destination symlink escape blocked"
  );

  await fs.unlink(
    "./demo-data/destination-escape"
  );


  // ==========================================================
  // SECURITY TEST 26
  // ==========================================================

  console.log("");
  console.log(
    "SECURITY TEST 26: Recursive copy symlink escape"
  );

  await sandbox.write(
    "/data/safe-source/normal.txt",
    "safe"
  );

  /*
   * The symlink is INSIDE the source directory.
   *
   * It points outside the mounted /data tree.
   */
  await fs.symlink(
    "../outside-sandbox-target",
    "./demo-data/safe-source/escape",
    "dir"
  );

  result =
    await sandbox.cp(
      "/data/safe-source",
      "/data/safe-copy"
    );


  /*
   * THIS IS THE TEST THAT PREVIOUSLY FAILED.
   *
   * fs.cp() used to accept the symlink because
   * dereference:false preserves it.
   *
   * The new #validateTree() walks the entire source
   * before fs.cp() is called and detects the escape.
   */
  if (!check(
    result,
    -1,
    "COPY_FAILED",
    "code",
    "recursive copy symlink escape blocked"
  )) {
    return;
  }


  if (
    await exists(
      "./demo-data/safe-copy"
    )
  ) {
    console.log(
      "❌ unsafe destination was created"
    );
    return;
  }

  console.log(
    "   ✅ no unsafe destination created"
  );


  if (!await expectFile(
    "./outside-sandbox-target/protected.txt",
    "DO NOT MODIFY"
  )) {
    console.log(
      "❌ outside protected file was modified"
    );
    return;
  }

  console.log(
    "   ✅ outside target remains untouched"
  );

  await fs.unlink(
    "./demo-data/safe-source/escape"
  );


  // ==========================================================
  // SECURITY TEST 27
  // ==========================================================

  console.log("");
  console.log(
    "SECURITY TEST 27: Recursive move symlink escape"
  );

  await sandbox.write(
    "/data/unsafe-move/normal.txt",
    "normal"
  );

  await fs.symlink(
    "../outside-sandbox-target",
    "./demo-data/unsafe-move/escape",
    "dir"
  );

  result =
    await sandbox.mv(
      "/data/unsafe-move",
      "/data/unsafe-moved"
    );

  if (!check(
    result,
    -1,
    "MOVE_FAILED",
    "code",
    "recursive move symlink escape blocked"
  )) {
    return;
  }

  if (
    await exists(
      "./demo-data/unsafe-moved"
    )
  ) {
    console.log(
      "❌ unsafe move destination was created"
    );
    return;
  }

  console.log(
    "   ✅ unsafe move destination not created"
  );

  /*
   * Source should still be there because validation happens
   * before the move.
   */
  if (
    !await exists(
      "./demo-data/unsafe-move"
    )
  ) {
    console.log(
      "❌ source was removed despite failed validation"
    );
    return;
  }

  console.log(
    "   ✅ source preserved after rejected move"
  );

  await fs.unlink(
    "./demo-data/unsafe-move/escape"
  );

  await sandbox.rm(
    "/data/unsafe-move"
  );


  // ==========================================================
  // SECURITY TEST 28
  // ==========================================================

  console.log("");
  console.log(
    "SECURITY TEST 28: Mount immutability"
  );

  result =
    sandbox.mounts();

  if (!check(
    result,
    0,
    2,
    "count",
    "mount count"
  )) {
    return;
  }

  result[1].mounts["/evil"] =
    "/tmp";

  const mountsAgain =
    sandbox.mounts();

  if (
    Object.hasOwn(
      mountsAgain[1].mounts,
      "/evil"
    )
  ) {
    console.log(
      "❌ external mutation changed mounts"
    );
    return;
  }

  console.log(
    "   ✅ mounts remain immutable"
  );


  // ==========================================================
  // TEST 29
  // ==========================================================

  console.log("");
  console.log(
    "TEST 29: Write-only API"
  );

  if (
    typeof sandbox.cat ===
    "function"
  ) {
    console.log(
      "❌ cat() should not exist"
    );
    return;
  }

  console.log(
    "   ✅ cat() does not exist"
  );

  if (
    typeof sandbox.ls ===
    "function"
  ) {
    console.log(
      "❌ ls() should not exist"
    );
    return;
  }

  console.log(
    "   ✅ ls() does not exist"
  );


  // ==========================================================
  // FINAL
  // ==========================================================

  console.log("");
  console.log(
    "========================================"
  );

  console.log(
    "🎉 GOOD — ALL CHECKS PASSED"
  );

  console.log(
    "========================================"
  );

  console.log("");
}


// ============================================================
// RUN
// ============================================================

runTests().catch(err => {
  console.error("");
  console.error(
    "💥 FATAL TEST ERROR"
  );
  console.error(err);
});
