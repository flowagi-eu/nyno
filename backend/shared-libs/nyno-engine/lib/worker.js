import fs from "fs";
import path from "path";
import { runPython,loadPython } from './runPython.js';
import { runWasm,loadWasm } from './runWasm.js';


import { pathToFileURL } from 'url';

// singleton
let functions = null;
export async function loadAllExtensions(dirs) {
	if(functions) return functions;
    const FUNCTIONS = {};

    for (const dir of dirs) {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;

            const stepName = entry.name;
            let fnName = stepName.toLowerCase().replace(/-/g, '_');

 	    // exception for reserved keywords
	    if(fnName == 'if') {
               fnName = '_' + fnName;
 	    }

            // first dir that has this step wins
            if (FUNCTIONS[fnName]) continue;

            const stepDir = path.join(dir, stepName);

            const jsFile = ['jt', 'ts', 'js']
                .map(ext => path.join(stepDir, `command.${ext}`))
                .find(fs.existsSync);
            const pyFile   = path.join(stepDir, 'command.py');
            const wasmFile = path.join(stepDir, 'command.wasm');

            try {
                if (jsFile) {
                    const mod = await import(pathToFileURL(jsFile).href);
                    if (typeof mod[fnName] === 'function') {
			if(fnName == '_if') {
			const fnNameClean = fnName.replace(/^_/, '');
                        FUNCTIONS[fnNameClean] = mod[fnName];
			} else {
                        FUNCTIONS[fnName] = mod[fnName];
			}
                    }
                } else if (fs.existsSync(pyFile)) {
                    FUNCTIONS[fnName] = {
                        python: true,
                        instance: await loadPython(fnName)
                    };
                } else if (fs.existsSync(wasmFile)) {
                    FUNCTIONS[fnName] = {
                        wasm: true,
                        instance: await loadWasm(fnName)
                    };
                } 
            } catch (e) {
                console.error('[Worker] Failed loading', stepName, e);
            }
        }
    }

    console.log('loaded ' + FUNCTIONS.length + ' FUNCTIONS',FUNCTIONS);
	functions = FUNCTIONS;
    return FUNCTIONS;
}

export async function processJob(FUNCTIONS,extName,prevArgs,prevContext) {

  // prevent overwriting passed vars
 const args = (prevArgs);
const context = (prevContext);

  const fnName = extName.toLowerCase().replace(/-/g, "_");
  let LAST_WASM;
  try {
    const fn = FUNCTIONS[fnName];
    if (!fn) {
	return [-1, { error: `unknown function: ${fnName}`}];
    }

    let full_result;
    if("wasm" in fn) {

          const instance = fn.instance;
          console.log('wasm fn instance',instance);
	  let result = await runWasm(instance,args,context);
      console.log('wasm instance result',result)
	  full_result = [ result[0], result[1] ];


     } else if("python" in fn) {

          const instance = fn.instance;
          console.log('python fn instance',instance);
	  let result = await runPython(instance,args,context);
      console.log('python instance result',result)
	  full_result = [ result[0], result[1] ];

     } else {
        const result = await fn(args, context);

        full_result = [ result[0], result[1] ];
     }

     return full_result
  } catch (e) {
	return [ -1, { error: (e.message || "worker error")} ];
  };
}

