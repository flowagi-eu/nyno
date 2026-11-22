import { replaceNynoVariables } from './blabla.js';

const MAX_TOTAL_STEPS = 300;


/**
 * ============================================================
 * WORKFLOW DEFINITION
 * ============================================================
 *
 * Describes WHAT the workflow looks like.
 *
 * It knows nothing about the queue or execution.
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
 * The queue contains TASKS.
 *
 * A normal task = one node.
 *
 * A parallel task = ONE group containing multiple nodes.
 *
 * The queue itself is always a single queue.
 */
function createTask({
  node,
  context,
  branchId = null,
}) {
  return {
    type: 'node',

    node,

context: {
      ...context ?? {},
    }, // new context object while preserving classes

    branchId,
  };
}


function createParallelTask({
  tasks,
  branchId = null,
}) {
  return {
    type: 'parallel',

    tasks,

    branchId,
  };
}


/**
 * ============================================================
 * EXECUTION
 * ============================================================
 *
 * Executes exactly ONE NODE.
 *
 * It does NOT decide what comes next.
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
   * Parallel is only a control-flow definition.
   *
   * It should never actually execute a dynamic function.
   *
   * The resolver will use its children to create
   * the next parallel group.
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

      fullResult: {
        r: 0,

        c: {
          ...context,
          LAST_STEP: 'nyno-parallel',
        },
      },

      error: false,
    };
  }


  /*
   * ----------------------------------------------------------
   * VARIABLE REPLACEMENT
   * ----------------------------------------------------------
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

      fullResult: {
        r: -1,
        c: contextRep,
      },

      error,
    };
  }


  /*
   * ----------------------------------------------------------
   * DYNAMIC FUNCTION
   * ----------------------------------------------------------
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

  for (
    const key of Object.keys(fullResult.c)
  ) {
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
 * Resolves the next NODE TASKS for one completed node.
 *
 * IMPORTANT:
 *
 * This function does NOT create a parallel queue item.
 *
 * The scheduler decides whether the returned tasks should
 * remain inside a parallel group.
 *
 *
 * Normal:
 *
 *   r -> one child
 *
 * Parallel control node:
 *
 *   all children
 */
function resolveNextTasks({
  definition,
  execution,
}) {
  /*
   * r = -1 stops this branch.
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
   * PARALLEL CONTROL NODE
   * ----------------------------------------------------------
   *
   * All children become node tasks.
   *
   * The caller decides whether these tasks belong to a
   * parallel group.
   *
   * Example:
   *
   *   1: [2, 3, 10]
   *
   * becomes:
   *
   *   [2, 3, 10]
   */
  if (stepType === 'nyno-parallel') {
    return children.map(
      (child, index) =>
        createTask({
          node: child,

          context:
            execution.c,

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
   * r selects ONE child.
   */
  const nextNode =
    children[execution.r];


  /*
   * No child means this branch is finished.
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

      context:
        execution.c,

      branchId:
        execution.branchId,
    }),
  ];
}


/**
 * ============================================================
 * LOOP HANDLING
 * ============================================================
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

    LOOP_I:
      loopIndex + 1,
  };

  return createTask({
    node:
      definition.node,

    context,

    branchId:
      task.branchId,
  });
}


/**
 * ============================================================
 * RESULT HANDLING
 * ============================================================
 */
function recordExecution({
  execution,
  task,
  result,
}) {
  const context =
    execution.c ?? task.context;


  /*
   * Clean temporary context value.
   */
  if ('set_context' in context) {
    delete context.set_context;
  }


  /*
   * NYNO_ONE_VAR.
   */
  if (
    'NYNO_ONE_VAR' in context
  ) {
    const varName =
      context.NYNO_ONE_VAR;

    if (varName in context) {
      return {
        context,
        oneVar: context[varName],
        logged: false,
      };
    }
  }


  /*
   * Normal result.
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
      execution.fullResult ?? {
        r: execution.r,
        c: execution.c,
      },
  };


  if (execution.error) {
    log.error =
      execution.error;
  }


  result.push(log);


  return {
    context,
    oneVar: undefined,
    logged: true,
  };
}


/**
 * ============================================================
 * EXECUTE PARALLEL GROUP
 * ============================================================
 *
 * IMPORTANT:
 *
 * The queue contains ONE parallel item.
 *
 * That item contains multiple node tasks.
 *
 * Promise.all() executes those node tasks concurrently.
 */
async function executeParallelGroup({
  group,
  path,
  dynamicFunctions,
  debugLog,
  INSECURE_CORE_DEV_MODE,
}) {
  return await Promise.all(
    group.tasks.map(
      async task => {
        const definition =
          getNodeDefinition(
            path,
            task.node
          );

        if (!definition) {
          return {
            task,
            definition: null,
            execution: null,
          };
        }


        if (INSECURE_CORE_DEV_MODE) {
          debugLog.push(
            'executing parallel node: ' +
            JSON.stringify({
              node:
                task.node,

              branchId:
                task.branchId,
            })
          );
        }


        const execution =
          await executeNode({
            definition,
            task,
            dynamicFunctions,
          });


        return {
          task,
          definition,
          execution,
        };
      }
    )
  );
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
    {
      ...path.context ?? {},
    }; // new context object while preserving classes


  /*
   * ----------------------------------------------------------
   * SINGLE QUEUE
   * ----------------------------------------------------------
   */
  const queue = [
    createTask({
      node:
        path.firstNode,

      context:
        initialContext,

      branchId:
        'root',
    }),
  ];


  /*
   * ----------------------------------------------------------
   * MAIN SCHEDULER
   * ----------------------------------------------------------
   */
  while (
    queue.length > 0 &&
    !forceStop
  ) {
    const queueItem =
      queue.shift();


    /**
     * ========================================================
     * NORMAL NODE
     * ========================================================
     */
    if (
      queueItem.type === 'node'
    ) {
      total_steps_executed++;


      if (
        total_steps_executed >
        MAX_TOTAL_STEPS
      ) {
        forceStop = true;
        break;
      }


      const task =
        queueItem;


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
            node:
              task.node,

            branchId:
              task.branchId,
          })
        );
      }


      /*
       * --------------------------------------------------------
       * EXECUTE ONE NODE
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
       * RECORD RESULT
       * --------------------------------------------------------
       */
      const recorded =
        recordExecution({
          execution,
          task,
          result,
        });


      if (
        recorded.oneVar !== undefined
      ) {
        one_var =
          recorded.oneVar;
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
       * NEXT TASK
       * --------------------------------------------------------
       */
      const nextTasks =
        resolveNextTasks({
          definition,
          execution,
        });


      queue.push(
        ...nextTasks
      );


      continue;
    }


    /**
     * ========================================================
     * PARALLEL GROUP
     * ========================================================
     *
     * The queue sees this as ONE item.
     *
     * Internally:
     *
     *   Promise.all(
     *     node A,
     *     node B,
     *     node C
     *   )
     *
     * After ALL branches finish, their next tasks are
     * collected into ANOTHER parallel group.
     *
     * This is what keeps parallel mode alive.
     */
    if (
      queueItem.type === 'parallel'
    ) {
      /*
       * Check total execution limit.
       */
      if (
        total_steps_executed +
          queueItem.tasks.length >
        MAX_TOTAL_STEPS
      ) {
        forceStop = true;
        break;
      }


      total_steps_executed +=
        queueItem.tasks.length;


      /*
       * --------------------------------------------------------
       * RUN CURRENT PARALLEL GENERATION
       * --------------------------------------------------------
       */
      const executions =
        await executeParallelGroup({
          group:
            queueItem,

          path,

          dynamicFunctions,

          debugLog,

          INSECURE_CORE_DEV_MODE,
        });


      /*
       * --------------------------------------------------------
       * COLLECT NEXT PARALLEL GENERATION
       * --------------------------------------------------------
       *
       * IMPORTANT:
       *
       * We do NOT push these tasks individually onto the queue.
       *
       * We first collect ALL next tasks.
       *
       * Then we put ONE new parallel group onto the queue.
       *
       * Example:
       *
       *   parallel(2, 3, 10)
       *
       * becomes:
       *
       *   parallel(4, 4, 4)
       *
       * which then becomes:
       *
       *   parallel(...)
       *
       * etc.
       */
      const nextParallelTasks = [];


      for (
        const item of executions
      ) {
        if (
          !item.definition ||
          !item.execution
        ) {
          continue;
        }


        const {
          task,
          definition,
          execution,
        } = item;


        /*
         * Record result.
         */
        const recorded =
          recordExecution({
            execution,
            task,
            result,
          });


        if (
          recorded.oneVar !== undefined
        ) {
          one_var =
            recorded.oneVar;
        }


        /*
         * A branch can finish without producing
         * another parallel task.
         */
        if (
          execution.error ||
          execution.r === -1
        ) {
          continue;
        }


        /*
         * ------------------------------------------------------
         * LOOP
         * ------------------------------------------------------
         *
         * The loop task remains inside the parallel generation.
         */
        if (
          shouldLoop({
            definition,
            task,
          })
        ) {
          nextParallelTasks.push(
            createLoopTask({
              definition,
              execution,
              task,
            })
          );

          continue;
        }


        /*
         * ------------------------------------------------------
         * NEXT TASK
         * ------------------------------------------------------
         *
         * resolveNextTasks() can return one or multiple tasks.
         *
         * A parallel control node returns all of its children.
         *
         * Normal nodes return one child.
         */
        const nextTasks =
          resolveNextTasks({
            definition,
            execution,
          });


        nextParallelTasks.push(
          ...nextTasks
        );
      }


      /*
       * --------------------------------------------------------
       * KEEP PARALLEL MODE ALIVE
       * --------------------------------------------------------
       *
       * This is the important part.
       *
       * Instead of:
       *
       *   queue.push(4)
       *   queue.push(4)
       *   queue.push(4)
       *
       * we do:
       *
       *   queue.push(
       *     parallel(4, 4, 4)
       *   )
       *
       * Therefore the next generation is also executed
       * concurrently.
       */
      if (
        nextParallelTasks.length > 0
      ) {
        queue.push(
          createParallelTask({
            tasks:
              nextParallelTasks,

            branchId:
              queueItem.branchId,
          })
        );
      }


      continue;
    }


    /*
     * Unknown queue item type.
     */
    throw new Error(
      `Unknown queue item type: ${queueItem.type}`
    );
  }


  /*
   * ----------------------------------------------------------
   * EXIT REASON
   * ----------------------------------------------------------
   */
  let exitReason =
    'full_exec';


  if (forceStop) {
    if (
      total_steps_executed >
      MAX_TOTAL_STEPS
    ) {
      exitReason =
        'max_steps';
    } else {
      exitReason =
        'force_stop';
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
     *
     * 1 starts parallel mode.
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
     * Optional args.
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
