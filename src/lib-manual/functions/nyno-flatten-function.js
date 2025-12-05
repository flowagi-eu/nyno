#!/usr/bin/env node

// ---------------------------
// Flatten Function (next as numbers)
// ---------------------------
export function flattenWorkflow(obj) {
  const result = {
    firstNode: null,
    loops: {},
    steps: {},          // stepId -> step name string
    args: {},           // stepId -> args array
    step_context: {},   // stepId -> context object
    context: obj.context || {}
  };

  if (!Array.isArray(obj.workflow)) {
    throw new Error("workflow must be an array");
  }

  // Determine first node
  if (obj.workflow.length > 0) {
    result.firstNode = obj.workflow[0].id;
  }

  // Build adjacency list + loops + separate step mappings
  for (const step of obj.workflow) {
    const id = step.id;

    // Step name
    result.steps[id] = step.step;

    // Args (if defined)
    if (step.args !== undefined) {
      result.args[id] = step.args;
    }

    // Step context (if defined)
    if (step.context !== undefined) {
      result.step_context[id] = step.context;
    }

    // Initialize adjacency list
    result[id] = [];

    // Detect loop
    if (typeof step.loop === "number" && step.loop > 0) {
      result.loops[id] = step.loop;
    }

    // Extract next node IDs (array of numbers)
    if (Array.isArray(step.next)) {
      for (const nxt of step.next) {
        if (typeof nxt !== "number") {
          throw new Error(`Invalid next node in step ${id}, expected number`);
        }
        result[id].push(nxt);
      }
    }
  }

  return result;
}

// ---------------------------
// Demo Workflow
// ---------------------------
const example = {
  context: { URL: 'https://empowerd.dev', TOKEN: 'ABC123' },
  workflow: [
    {
      step: 'demo-step',
      args: ['a', 'b'],
      context: { test: true },
      id: 1,
      loop: 30,
      next: [2]
    },
    {
      step: 'demo-2',
      id: 2,
      next: []
    }
  ]
};

// ---------------------------
// Direct Execution
// ---------------------------
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const flattened = flattenWorkflow(example);
  console.log("Flattened workflow:\n");
  console.log(JSON.stringify(flattened, null, 2));
}
