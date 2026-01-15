
const MAX_TOTAL_STEPS = 300; // protection for infinite loops

// ---------------------------
// Test if Direct Execution
// ---------------------------
if (process.argv[1] === new URL(import.meta.url).pathname) {
  let path = {
    firstNode: 1,
    loops: { 3: 2 },
    1: [2, 3, 10],
    2: [4],
    3: [4],
    10: [4],
    4: [],
  };

  const dynamicFunctions = {
    '1': async () => ({ r: 0, c: { LAST_STEP: 'nyno-parallel' } }),
    '2': async () => ({ r: 0, c: { LAST_STEP: 'nyno-wait', prev: 'Waited 1000ms' } }),
    '3': async () => ({ r: 0, c: { LAST_STEP: 'nyno-echo', prev: 'parallel:)' } }),
    '10': async () => ({ r: 0, c: { LAST_STEP: 'nyno-echo', prev: 'parallel:)' } }),
    '4': async () => ({ r: 0, c: { LAST_STEP: 'nyno-wait', prev: 'Waited 1000ms' } }),
  };

  const workflowResult = await traverseFullGraph(path, dynamicFunctions);
  //console.log(workflowResult);
}



export async function traverseFullGraph(path, dynamicFunctions) {
  let total_steps_executed = 0;
  const firstNode = path.firstNode;
  const result = [];
  let one_var = null;
  let loopForceStops = false;

  if (!path.context) path.context = {};

  const globalContexts = {}; // branch-specific contexts for parallel paths
  const branchLogs = {}; // separate logs for each branch

  async function traverseGraph(node, path, dynamicFunctions, looped = false, branchId = null, visitContext = null) {
    if (loopForceStops && looped) return;

    async function visit(node, visitContext, branchId = null) {
      total_steps_executed++;
      if (total_steps_executed > MAX_TOTAL_STEPS) return { result, one_var };
      if (path[String(node)] === undefined) return;

      const stepType = path.steps?.[node] || 'normal';
      const children = path[String(node)] || [];

      // Use the provided visitContext
      let context = visitContext;

      //console.log('context visitContext node',node);
      //console.log('context visitContext',visitContext);
      
      // Apply step-specific context if available
      if (path.step_context?.[node]) {
        context = { ...context, ...path.step_context[node] };
      }

      // Execute step
      let fullResult;
      if (stepType === 'nyno-parallel') {
        fullResult = { r: 0, c: { ...context, LAST_STEP: 'nyno-parallel' } };
      } else {
        //console.log('calling dynamic function for node', node);
        fullResult = await dynamicFunctions[node](stepType, path.args?.[node], context);
      }
      
      //console.log('node + fullResult',node, fullResult);


      // Store the updated context
      if (branchId) {
        fullResult.c['branchId'] = branchId;
      }

      // Clean up special keys
      if (fullResult.c && "set_context" in fullResult.c) delete fullResult.c.set_context;

      // Handle NYNO_ONE_VAR
      if (fullResult.c && "NYNO_ONE_VAR" in fullResult.c) {
        const varName = fullResult.c.NYNO_ONE_VAR;
        if (varName in fullResult.c) one_var = fullResult.c[varName];
      }

      // Log the step
      const log = { node, input: { args: path.args?.[node], context }, output: fullResult };
      if (looped) log.looped = true;

      // Store the log
      if (branchId) {
        if (!branchLogs[branchId]) branchLogs[branchId] = [];
        branchLogs[branchId].push(log);
      } else {
        result.push(log);
      }

      if (fullResult.r === -1) loopForceStops = true;

      // Handle loops
      if (!looped && node in path.loops) {
        for (let i = 0; i < path.loops[node]; i++) {
          const loopBranchId = branchId ? `${branchId}_loop${i}` : `loop${i}`;
          const loopContext = JSON.parse(JSON.stringify(fullResult.c));
          loopContext['LOOP_I'] = i;
          await traverseGraph(node, path, dynamicFunctions, true, loopBranchId, loopContext);
        }
      }

      // Handle children
      if (children.length > 0) {
        if (stepType === 'nyno-parallel') {
          const promises = [];
          for (const child of children) {
            const childBranchId = `child_${child}`;
            //console.log('walking childBranchId',childBranchId);

                const childContext = JSON.parse(JSON.stringify(fullResult.c));
            //console.log('walking childContext',childContext);
            promises.push(visit(child, childContext, childBranchId));
          }
          await Promise.all(promises);
        } else {
          const nextChild = children[fullResult.r];
          if (nextChild !== undefined) {
            const nextContext = JSON.parse(JSON.stringify(fullResult.c));
            await visit(nextChild, nextContext, branchId);
          }
        }
      }
    } // end of visit function
    
    // this is inside traverseGraph
    const currentContext = JSON.parse(JSON.stringify(visitContext ?? path.context));
    //console.log('currentContext', currentContext);
    await visit(node, currentContext, branchId);
  }

  await traverseGraph(firstNode, path, dynamicFunctions);

  // Merge branch logs into the main result
  for (const branchId in branchLogs) {
    result.push(...branchLogs[branchId]);
  }

  return { result, one_var };
}

