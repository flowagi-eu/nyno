import { randomUUID } from "crypto";


// Simple protection against more than n (6) concurrent workflows
const activeTasksPerTenant = new Map();
function releaseTenantTask(tenantId) {
  const active = activeTasksPerTenant.get(tenantId) || 0;
  if (active <= 1) {
    activeTasksPerTenant.delete(tenantId);
  } else {
    activeTasksPerTenant.set(tenantId, active - 1);
  }
}

/**
 * =========================
 * TASK MANAGER
 * =========================
 */
export function createTaskManager({ runTaskFn }) {
  const tasks = new Map();

  function createTask(input, ctx) {


    const tenantId = ctx.tenant_id;

    const active = activeTasksPerTenant.get(tenantId) || 0;

    if (active >= 6) {
      throw new Error("Tenant task limit reached");
    }

    activeTasksPerTenant.set(tenantId, active + 1);


    const taskId = randomUUID();

    tasks.set(taskId, {
      status: "pending",
      result: null,
      createdAt: Date.now(),
    });

    Promise.resolve(runTaskFn(taskId, input, ctx))
      .then((result) => {
        tasks.set(taskId, {
          status: "done",
          result,
          createdAt: Date.now(),
        });
      })
      .catch((err) => {
        tasks.set(taskId, {
          status: "error",
          result: err?.message || "unknown error",
          errStr: String(err),
          createdAt: Date.now(),
        });
      }).finally(() => {
      releaseTenantTask(tenantId);
    });

    return taskId;
  }

  function getTask(taskId) {
    return tasks.get(taskId) || null;
  }

  function listTasks() {
    return Array.from(tasks.entries()).map(([taskId, t]) => ({
      taskId,
      ...t,
    }));
  }

  function deleteTask(taskId) {
    return tasks.delete(taskId);
  }

  return {
    createTask,
    getTask,
    listTasks,
    deleteTask,
  };
}

/**
 * =========================
 * ASSERT HELPERS
 * =========================
 */
function stableStringify(obj) {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return `[${obj.map(stableStringify).join(",")}]`;
  }

  const keys = Object.keys(obj).sort();

  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

function assertJSON(actual, expected, message = "JSON mismatch") {
  const a = stableStringify(actual);
  const e = stableStringify(expected);

  if (a !== e) {
    throw new Error(
      `❌ ASSERT FAILED: ${message}\n\nACTUAL:\n${a}\n\nEXPECTED:\n${e}`
    );
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error("❌ ASSERT FAILED: " + message);
  }
}

/**
 * =========================
 * MOCK TEST (RUN DIRECTLY)
 * =========================
const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url === Bun.main;

if (isDirectRun) {
  console.log("🧪 Running TaskManager FULL TEST...\n");

  const manager = createTaskManager({
    runTaskFn: async (taskId, input) => {
      console.log("▶ runTaskFn:", taskId, input);

      assert(typeof taskId === "string", "taskId must be string");
      assert(input === "hello world", "input must match");

      await new Promise((r) => setTimeout(r, 500));

      return {
        ok: true,
        echo: input,
      };
    },
  });

  // =========================
  // TEST 1: CREATE TASK
  // =========================
  const taskId = manager.createTask("hello world", {
    tenant: "test",
  });

  console.log("📌 task created:", taskId);

  assert(typeof taskId === "string", "taskId must be string");

  // =========================
  // TEST 2: POLLING LOOP
  // =========================
  const interval = setInterval(() => {
    const task = manager.getTask(taskId);

    console.log("📡 poll:", task);

    assert(task, "task must exist");

    assert(
      ["pending", "done", "error"].includes(task.status),
      "invalid status"
    );

    // =========================
    // FINAL CHECK
    // =========================
    if (task.status === "done") {
      console.log("✅ task completed");

      assertJSON(
        task.result,
        { ok: true, echo: "hello world" },
        "task result mismatch"
      );

      clearInterval(interval);

      console.log("\n🎉 ALL TESTS PASSED");
    }

    if (task.status === "error") {
      throw new Error("Task failed unexpectedly");
    }
  }, 200);
}
 */
