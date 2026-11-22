import { replaceNynoVariables } from './blabla.js';

const MAX_TOTAL_STEPS = 300;

/**
 * ============================================================
 * WORKFLOW DEFINITION
 * ============================================================
 *
 * The definition describes WHAT the workflow looks like.
 *
 * It knows nothing about execution.
 */
function getNodeDefinition(path, node) {
  const children = path[String(node)];

  if (children === undefined) {
    return null;
  }

  return {
    node,
    children,

    stepType:
      path.steps?.[node] ?? 'normal',

    args:
      path.args?.[node],

    stepContext:
      path.step_context?.[node],

    loopCount:
      path.loops?.[node] ?? 0,
  };
}


/**
 * ============================================================
 * QUEUE
 * ============================================================
 *
 * A queue item represents ONE piece of work.
 *
 * The queue does not execute anything.
 */
function createTask({
  node,
  context,
  branchId = null,
}) {
  return {
    node,
    context: structuredClone(context ?? {}),
    branchId,
  };
}


/**
 * ============================================================
 * EXECUTION
 * ============================================================
 *
 * Executes exactly ONE node.
 *
 * It does NOT decide what node comes next.
 *
 * The returned `.r` is interpreted later by the scheduler.
 */
async function executeNode({
  definition,
  task,
  dynamicFunctions,
}) {
  const {
    node,
    stepType,
    args: rawArgs,
    stepContext,
  } = definition;

  let context = {
    ...task.context,
  };

  /*
   * Apply node-specific context.
   */
  if (stepContext) {
    context = {
      ...context,
      ...stepContext,
    };
  }

  /*
   * Parallel is a control-flow node.
   *
   * It doesn't need a dynamic function.
   */
  if (stepType === 'nyno-parallel') {
    return {
      node,
      branchId: task.branchId,

      r: 0,

      c: {
        ...context,
        LAST_STEP: 'nyno-parallel',
      },

      argsRep: [],
      contextRep: context,
      error: false,
    };
  }

  /*
   * Resolve variables.
   */
  let error = false;
  let argsRep = [];
  let contextRep = context;

  [
    error,
    argsRep,
    contextRep,
  ] = replaceNynoVariables(
    {
      step: stepType,
      args: rawArgs,
      context: stepContext,
    },
    context
  );

  /*
   * Mistral hotfix.
   */
  if (stepType.includes('mistral')) {
    contextRep.__rawArgs = rawArgs;

    contextRep.__rawContext = {
      ...context,
      ...stepContext,
    };
  }

  /*
   * Variable replacement failed.
   */
  if (error) {
    return {
      node,
      branchId: task.branchId,

      r: -1,

      c: contextRep,

      argsRep,
      contextRep,
      error,
    };
  }

  /*
   * Find the actual implementation.
   */
  const dynamicFunction =
    dynamicFunctions[String(node)];

  if (typeof dynamicFunction !== 'function') {
    throw new Error(
      `No dynamic function for node ${node}`
    );
  }

  /*
   * Execute the node.
   */
  let fullResult =
    await dynamicFunction(
      stepType,
      argsRep,
      contextRep
    );

  /*
   * Normalize empty result.
   */
  if (!fullResult) {
    fullResult = {
      r: 0,
      c: contextRep,
    };
  }

  /*
   * Normalize context.
   */
  if (!fullResult.c) {
    fullResult.c = contextRep;
  }

  /*
   * Store LAST_R.
   */
  fullResult.c.LAST_R =
    fullResult.r;

  /*
   * Rendered keys.
   */
  if (!('__renderedKeys' in fullResult.c)) {
    fullResult.c.__renderedKeys = [];
  }

  for (const key of Object.keys(fullResult.c)) {
    if (
      !fullResult.c.__renderedKeys.includes(key)
    ) {
      fullResult.c.__renderedKeys.push(key);
    }
  }

  return {
    node,
    branchId: task.branchId,

    r: fullResult.r,

    c: fullResult.c,

    argsRep,
    contextRep,

    fullResult,

    error: false,
  };
}


/**
 * ============================================================
 * NEXT TASK RESOLUTION
 * ============================================================
 *
 * This is where `.r` becomes graph traversal.
 *
 * Execution does NOT know what `.r` means.
 *
 * This function does.
 */
function resolveNextTasks({
  definition,
  execution,
}) {
  /*
   * r = -1 means stop this branch.
   */
  if (
    execution.error ||
    execution.r === -1
  ) {
    return [];
  }

  const {
    children,
    stepType,
  } = definition;

  /*
   * ----------------------------------------------------------
   * PARALLEL
   * ----------------------------------------------------------
   *
   * For a parallel node, all children are queued.
   *
   * Example:
   *
   * 1: [2, 3, 10]
   *
   * becomes:
   *
   * 2
   * 3
   * 10
   */
  if (stepType === 'nyno-parallel') {
    return children.map(
      (child, index) =>
        createTask({
          node: child,

          context: execution.c,

          branchId:
            `${execution.branchId ?? 'root'}_${index}`,
        })
    );
  }

  /*
   * ----------------------------------------------------------
   * NORMAL NODE
   * ----------------------------------------------------------
   *
   * r selects the child.
   *
   * Example:
   *
   * 1: [2, 3, 10]
   *
   * r = 0 -> 2
   * r = 1 -> 3
   * r = 2 -> 10
   */
  const nextNode =
    children[execution.r];

  /*
   * No child means this branch has finished.
   */
  if (
    nextNode === undefined ||
    nextNode === null
  ) {
    return [];
  }

  return [
    createTask({
      node: nextNode,
      context: execution.c,
      branchId: execution.branchId,
    }),
  ];
}


/**
 * ============================================================
 * LOOP HANDLING
 * ============================================================
 *
 * Loops are scheduler concerns.
 *
 * They are NOT handled by recursive graph traversal.
 */
function shouldLoop({
  definition,
  task,
}) {
  if (!definition.loopCount) {
    return false;
  }

  const loopIndex =
    task.context.LOOP_I ?? 0;

  return loopIndex < definition.loopCount;
}


function createLoopTask({
  definition,
  execution,
  task,
}) {
  const loopIndex =
    task.context.LOOP_I ?? 0;

  const context = {
    ...execution.c,
    LOOP_I: loopIndex + 1,
  };

  return createTask({
    node: definition.node,
    context,
    branchId: task.branchId,
  });
}


/**
 * ============================================================
 * MAIN WORKFLOW ENGINE
 * ============================================================
 */
export async function traverseFullGraph(
  path,
  dynamicFunctions,
  debugLog = [],
  INSECURE_CORE_DEV_MODE = false
) {
  let one_var = null;
  let forceStop = false;
  let total_steps_executed = 0;

  const result = [];

  /*
   * ----------------------------------------------------------
   * INITIAL CONTEXT
   * ----------------------------------------------------------
   */
  const initialContext =
    structuredClone(
      path.context ?? {}
    );

  /*
   * ----------------------------------------------------------
   * QUEUE
   * ----------------------------------------------------------
   *
   * Only the queue knows what work remains.
   */
  const queue = [
    createTask({
      node: path.firstNode,
      context: initialContext,
      branchId: 'root',
    }),
  ];

  /*
   * ----------------------------------------------------------
   * EXECUTION LOOP
   * ----------------------------------------------------------
   *
   * This is the ONLY loop responsible for driving execution.
   */
  while (
    queue.length > 0 &&
    !forceStop
  ) {
    /*
     * Maximum execution protection.
     */
    total_steps_executed++;

    if (
      total_steps_executed >
      MAX_TOTAL_STEPS
    ) {
      forceStop = true;
      break;
    }

    /*
     * Take one task from the queue.
     */
    const task =
      queue.shift();

    /*
     * --------------------------------------------------------
     * DEFINITION
     * --------------------------------------------------------
     */
    const definition =
      getNodeDefinition(
        path,
        task.node
      );

    /*
     * Invalid node.
     */
    if (!definition) {
      if (INSECURE_CORE_DEV_MODE) {
        debugLog.push(
          `node ${task.node} does not exist`
        );
      }

      continue;
    }

    /*
     * Debug.
     */
    if (INSECURE_CORE_DEV_MODE) {
      debugLog.push(
        'executing node: ' +
        JSON.stringify({
          node: task.node,
          branchId: task.branchId,
        })
      );
    }

    /*
     * --------------------------------------------------------
     * EXECUTION
     * --------------------------------------------------------
     */
    const execution =
      await executeNode({
        definition,
        task,
        dynamicFunctions,
      });

    /*
     * --------------------------------------------------------
     * CONTEXT CLEANUP
     * --------------------------------------------------------
     */
    const context =
      execution.c ?? task.context;

    if ('set_context' in context) {
      delete context.set_context;
    }

    /*
     * --------------------------------------------------------
     * ONE VARIABLE
     * --------------------------------------------------------
     */
    if (
      'NYNO_ONE_VAR' in context
    ) {
      const varName =
        context.NYNO_ONE_VAR;

      if (varName in context) {
        one_var =
          context[varName];
      }
    } else {
      /*
       * ------------------------------------------------------
       * RESULT LOG
       * ------------------------------------------------------
       */
      const log = {
        node: task.node,

        branchId:
          task.branchId,

        input: {
          args:
            execution.argsRep,

          context,
        },

        output:
          execution.fullResult ??
          {
            r: execution.r,
            c: execution.c,
          },
      };

      if (execution.error) {
        log.error =
          execution.error;
      }

      result.push(log);
    }

    /*
     * --------------------------------------------------------
     * STOP
     * --------------------------------------------------------
     */
    if (
      execution.error ||
      execution.r === -1
    ) {
      forceStop = true;
      break;
    }

    /*
     * --------------------------------------------------------
     * LOOP
     * --------------------------------------------------------
     *
     * A loop repeats the CURRENT node.
     *
     * We put another task into the queue instead of calling
     * the node recursively.
     */
    if (
      shouldLoop({
        definition,
        task,
      })
    ) {
      queue.push(
        createLoopTask({
          definition,
          execution,
          task,
        })
      );

      continue;
    }

    /*
     * --------------------------------------------------------
     * NEXT NODE(S)
     * --------------------------------------------------------
     *
     * This is the important separation:
     *
     * executeNode()
     *      ↓
     *      r
     *      ↓
     * resolveNextTasks()
     *      ↓
     * queue
     */
    const nextTasks =
      resolveNextTasks({
        definition,
        execution,
      });

    queue.push(...nextTasks);
  }

  /*
   * ----------------------------------------------------------
   * EXIT REASON
   * ----------------------------------------------------------
   */
  let exitReason = 'full_exec';

  if (forceStop) {
    if (
      total_steps_executed >
      MAX_TOTAL_STEPS
    ) {
      exitReason = 'max_steps';
    } else {
      exitReason = 'force_stop';
    }
  }

  /*
   * ----------------------------------------------------------
   * FINAL RESULT
   * ----------------------------------------------------------
   */
  return {
    result,
    one_var,

    exitReason,

    debugLog,

    forceStop,

    total_steps_executed,
  };
}


/**
 * ============================================================
 * EXAMPLE
 * ============================================================
 */
if (
  process.argv[1] ===
  new URL(import.meta.url).pathname
) {
  const path = {
    firstNode: 1,

    loops: {
      3: 2,
    },

    /*
     * Graph definition.
     */
    1: [2, 3, 10],
    2: [4],
    3: [4],
    10: [4],
    4: [],

    /*
     * Node types.
     */
    steps: {
      1: 'nyno-parallel',
      2: 'nyno-wait',
      3: 'nyno-echo',
      10: 'nyno-echo',
      4: 'nyno-wait',
    },

    /*
     * Optional data.
     */
    args: {
      1: {},
      2: {},
      3: {},
      10: {},
      4: {},
    },

    step_context: {},

    context: {},
  };

  const dynamicFunctions = {
    '2': async (
      stepType,
      args,
      context
    ) => ({
      r: 0,

      c: {
        ...context,

        LAST_STEP:
          'nyno-wait',

        prev:
          'Waited 1000ms',
      },
    }),

    '3': async (
      stepType,
      args,
      context
    ) => ({
      r: 0,

      c: {
        ...context,

        LAST_STEP:
          'nyno-echo',

        prev:
          'parallel :)',
      },
    }),

    '10': async (
      stepType,
      args,
      context
    ) => ({
      r: 0,

      c: {
        ...context,

        LAST_STEP:
          'nyno-echo',

        prev:
          'parallel :)',
      },
    }),

    '4': async (
      stepType,
      args,
      context
    ) => ({
      r: 0,

      c: {
        ...context,

        LAST_STEP:
          'nyno-wait',

        prev:
          'Waited 1000ms',
      },
    }),
  };

  const workflowResult =
    await traverseFullGraph(
      path,
      dynamicFunctions,
      [],
      true
    );

  console.dir(
    workflowResult,
    {
      depth: null,
    }
  );
}
