
import { replaceNynoVariables } from './blabla.js';
import * as jsYaml from "js-yaml";
import fs from "node:fs";


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



export async function traverseFullGraph(path, dynamicFunctions,debugLog=[],INSECURE_CORE_DEV_MODE=false) {
  const debugMode = true; // needs process.arg
  let total_steps_executed = 0;
  const firstNode = path.firstNode;
  const result = [];
  let one_var = null;
  let forceStop = false;
   
  //let stLog = []; // simple testing log

  if (!path.context) path.context = {};

  const globalContexts = {}; // branch-specific contexts for parallel paths
  const branchLogs = {}; // separate logs for each branch

  async function traverseGraph(node, path, dynamicFunctions, looped = false, branchId = null, visitContext = null) {
   // if (forceStop && looped) return;
    if(forceStop) return;

    async function visit(node, visitContext, branchId = null) {
      total_steps_executed++;

      if(INSECURE_CORE_DEV_MODE) debugLog.push('visiting node: ' + JSON.stringify(node));
      if(forceStop){
        if(INSECURE_CORE_DEV_MODE) debugLog.push('forceStop detected in visit()');
        return;
      }
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

      //
      //
      // 1. Execute step
      //
      //
      let fullResult;
      let error,argsRep,contextRep;
      if (stepType === 'nyno-parallel') {
        // 1.1.1 (rare) if nyno-parallel, only set LAST_STEP, this node executes nothing
        fullResult = { r: 0, c: { ...context, LAST_STEP: 'nyno-parallel' } };
        [ error, argsRep, contextRep ] = [false, [], context];
      } else if (stepType === 'tool-settings') {
        // 1.1.2 (uncommon) if tool-settings, only set TOOL_SETTINGS if defined, this node executes nothing
        if(path.tools[node] && Array.isArray(path.tools[node]) && (path.tools[node]).length != 0) {
          context['TOOL_SETTINGS'] = path.tools[node];
        }
        
        fullResult = { r: 0, c: { ...context, LAST_STEP: 'tool-settings' } };
        [ error, argsRep, contextRep ] = [false, [], context];
      } else {
        // 1.1.3 (normal) node executes

        // 1.1.3.1 Extract raw arguments that may include ${variables}
	      const rawArgs = path.args?.[node];
	      const stepContext = path.step_context?.[node];

        // 1.1.3.2 Replace raw arguments with values of ${variables} if defined in context. Also replace any ${variables} in context if not replaced already (based on __renderedKeys)
        [ error, argsRep, contextRep ] = replaceNynoVariables({ step:stepType, args: rawArgs, context: stepContext }, context);
	      if(error){
            // 1.1.3.2.1.1 Early exit if theres a error while replacing variables
                if(INSECURE_CORE_DEV_MODE) debugLog.push('error is detected in else: ' + JSON.stringify({forceStop}));
		            // early exit
      		      forceStop = true;
		            fullResult = { c:contextRep, r:-1};
	      } else {
            // 1.1.3.2.1.2 Execute node with replaced variables (argsRep = replaced args, contextRep = replaced context)
        		fullResult = await dynamicFunctions[node](stepType, argsRep, contextRep);

            if(INSECURE_CORE_DEV_MODE) debugLog.push('fullResult: ' + JSON.stringify(fullResult));

            // 1.1.3.2.1.3 Define & Deal with __renderedKeys (mechanism to avoid double replacing ${variables})
        		if(fullResult.c && !("__renderedKeys" in fullResult.c)){
        		    fullResult.c.__renderedKeys = [];
        		}
        		for(const key of Object.keys(fullResult.c)){
        		    if(!fullResult.c.__renderedKeys.includes(key)) {
        		        fullResult.c.__renderedKeys.push(key); // add new keys 
        		    }
        		}
	      }
      }
      
      // 1.2 Deal with special context keys
      // 1.2.1 Store the updated context
      if (branchId) {
        fullResult.c['branchId'] = branchId;
      }

      // 1.2.2 Clean up special 'set_context' key that determines output variable names
      if (fullResult.c && "set_context" in fullResult.c) delete fullResult.c.set_context;

      // 1.3 Handle Output Log
      if (fullResult.c && "NYNO_ONE_VAR" in fullResult.c) {
        // 1.3.1.1 Handle (rare) NYNO_ONE_VAR mode, putting everything in one var
        const varName = fullResult.c.NYNO_ONE_VAR;
        if (varName in fullResult.c) one_var = fullResult.c[varName];
      } else {
        // 1.3.1.2 Handle (normal) Log the step for .execution output if not NYNO_ONE_VAR mode
        const rawArgs = path.args?.[node];
        const log = { node, input: { args: argsRep, context }, output: fullResult };
        if(error){
          log.error = error;
        }

        if (looped) log.looped = true;

        result.push(log);
      }

      // 1.4 Handle Early Exits
      if(error) {
          // 1.4.1 Handle missing variables case (from replaceNynoVariables functions)
          console.log("EARLY EXIT: MISSING");
      		return { result, one_var, error, errorMsg:'missing', exitReason: "missing_vars" };
      }

      // 1.5 Handle returnCode -1 to prepare for forceStop later in next visit
      if (fullResult.r === -1) {
        forceStop = true;
      }

      // 1.6 Handle loops
      if (!looped && node in path.loops) {
        for (let i = 0; i < path.loops[node]; i++) {
          const loopBranchId = branchId ? `${branchId}_loop${i}` : `loop${i}`;
          const loopContext = JSON.parse(JSON.stringify(fullResult.c));
          loopContext['LOOP_I'] = i;
          await traverseGraph(node, path, dynamicFunctions, true, loopBranchId, loopContext);
        }
      }

      //
      //
      // 2. Execute Child Steps
      //
      //
      if (children.length > 0) {
        // 2.1.1 (rare) Parallel children execution mode
        if (stepType === 'nyno-parallel') {
          const promises = [];
          for (const child of children) {
            const childBranchId = `child_${child}`;
            const childContext = JSON.parse(JSON.stringify(fullResult.c));
            promises.push(visit(child, childContext, childBranchId));
          }

          await Promise.all(promises);
        } 
        
        
        else {
          // (uncommon) 2.1.2.1.1 Handle agent children
          if(stepType.includes('-agent')) {
            // use ?prev.toolName for match
            if(INSECURE_CORE_DEV_MODE) debugLog.push('agent fullResult previous')

	    const agent = fullResult.c.agent ?? {};
            const toolName = agent.toolName ?? null;
            let matchingIndex = null;

            // read agents args and tools file
            const agentYamlArgs = path.args[node];
            console.log('agentYamlArgs',agentYamlArgs);

            const toolObjRaw = agentYamlArgs[1];

            // Replace the ${TOOL_SETTINGS} using replaceNynoVariables (only toolObjRaw), no need for step context here because we only care about the tools
            const [ errorAgent, argsRepAgent, contextRepAgent ] = replaceNynoVariables({ step:stepType, args: [toolObjRaw] }, fullResult.c);


            const tools = argsRepAgent[0];
            console.log('tools',tools);

            for(let i=0;i<tools.length;i++){
              const valueToMatch = tools[i].name;
              console.log({valueToMatch,i,toolName});
              if(valueToMatch == toolName) {
                matchingIndex = i;
                console.log('found match');
                console.log('children ', children);
                console.log('children matching', children[matchingIndex]);
              }
            }

            if(matchingIndex !== null && children[matchingIndex]){
              const nextChild = children[matchingIndex];
              if (nextChild !== undefined) {
                const nextContext = JSON.parse(JSON.stringify(fullResult.c));
                await visit(nextChild, nextContext, branchId);
              }
	          }  
	        } else {
            // (normal) 2.1.2.1.2 Handle all node children
            const nextChild = children[fullResult.r];
            if (nextChild !== undefined) {
              const nextContext = JSON.parse(JSON.stringify(fullResult.c));
              await visit(nextChild, nextContext, branchId);
            }
          }
        }
      }
    } // end of visit function
    
    // this is inside traverseGraph
    const currentContext = JSON.parse(JSON.stringify(visitContext ?? path.context));
    //console.log('currentContext', currentContext);
    if(INSECURE_CORE_DEV_MODE) debugLog.push('currentContext: ' + JSON.stringify({currentContext}));

    await visit(node, currentContext, branchId);
  }

  await traverseGraph(firstNode, path, dynamicFunctions);


  //return { result, one_var, stLog };
  return { result, one_var, exitReason: "full_exec", debugLog };
}

