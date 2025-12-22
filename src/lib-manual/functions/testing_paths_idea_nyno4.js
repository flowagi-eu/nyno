
// ---------------------------
// Direct Execution
// ---------------------------
if (process.argv[1] === new URL(import.meta.url).pathname) {
// --- Demo ---
let path = {
  firstNode: 1,
  loops: { 3: 2 }, // node 3 and its first subpath will loop max n times, stops early if any node returns -1
  1: [2],
  2: [3],
  3: [4, 5],
  4: [6],
  5: [7],
  6: [],
  7: [],
};

/*
path = {
  "1": [  2 ],
  "2": [],
  "firstNode": 1,
  "loops": {
    "1": 2
  }, 
  "steps": {
    "1": "demo-step",
    "2": "demo-2"
  },
}
//*/


// these are the functions with requestFunction linked to each workflow step
/// for example 1 could be requestFunction('nyno-http-get',data)
/// so this is generated dynamically based on the steps
const dynamicFunctions = {
   '1': function() { return 0; },
   '2': function() { return 0; },
   '3': function() { return 0; },
   '4': function() { return 0; },
   '5': function() { return 0; },
   '6': function() { return 0; },
   '7': function() { return 0; },
};

const workflowResult = await traverseFullGraph(path, dynamicFunctions);
console.log(workflowResult);
}








const MAX_TOTAL_STEPS = 300;

export async function traverseFullGraph(path, dynamicFunctions) {
  let total_steps_executed = 0;
  const firstNode = path.firstNode;
  const result = [];
  let one_var = null;
  let loopForceStops = false; // -1 status codes
  if(!path.context) path.context = {};

  async function traverseGraph(firstNode,path, dynamicFunctions,looped=false) {

   if(loopForceStops && looped) return;

   async function visit(node) {
    total_steps_executed++;

    // early return security infinite loop prevention
    if(total_steps_executed > MAX_TOTAL_STEPS) return {result,one_var}


    console.log({total_steps_executed,MAX_TOTAL_STEPS})
    // early return if non existing node key id
    if (path[String(node)] === undefined) return; 

    const children = path[String(node)] || [];
    console.log('children',children);

    if(!looped && node in path.loops){
        console.log("-------- START LOOP ------------");
        for(let i =0;i < path.loops[node];i++) {

            path.context['LOOP_I'] = i; // Special context key for loop i counter
            await traverseGraph(node,path, dynamicFunctions,true);
        }
        console.log("-------- END LOOP ------------");  
        loopForceStops = false; // reset

        // after the loop we continue with[1] if defined    
        if(children.length > 0) {
            const nextChild = children[1];
            console.log('next node (from loop):',nextChild);
            await visit(nextChild);

            // early return security infinite loop prevention
            if(total_steps_executed > MAX_TOTAL_STEPS) return {result,one_var}

        }  
    }
    // Normal step: choose next child according to dynamic functions (default index 0)
    else {

      

      const step = path.steps[node];
      const args = path.args[node];
      const context = Object.assign(
    {},
    path.context,
    path.step_context[node] || {}
  );

      
      const fullResult = await dynamicFunctions[node](step,args,(context || {}));
      const resultCode = fullResult.r;

      // also reset the global context
      path.context = fullResult.c;

      // remove set_context special value after each
      if('set_context' in path.context) delete path.context['set_context'];

      let nextIndex = resultCode;

      console.log('result code',resultCode);

      // record this visit
      const log = {node,input:{args,context}, output:fullResult};
      if(looped) log.looped = true;

      if("NYNO_ONE_VAR" in path.context) {
        if(path.context["NYNO_ONE_VAR"] in path.context ) {
          one_var = path.context[path.context["NYNO_ONE_VAR"]];
        }
      } else {
        result.push(log);
      }

      if(nextIndex == -1) {
        console.log('registered force stop loop');
        loopForceStops = true;
      }


      if(children.length > 0) {

        console.log('nextIndex',nextIndex);
        const nextChild = children[nextIndex] ;
        console.log('next node:',nextChild);
        if (nextChild !== undefined) await visit(nextChild);

        // early return security infinite loop prevention
        if(total_steps_executed > MAX_TOTAL_STEPS) return {result,one_var}
      }
    } 
  }

  console.log('first node',firstNode,{looped});
  await visit(firstNode,null);

  // early return security infinite loop prevention
  if(total_steps_executed > MAX_TOTAL_STEPS) return {result,one_var}

}

await traverseGraph(firstNode,path, dynamicFunctions);
return {result,one_var};
}


