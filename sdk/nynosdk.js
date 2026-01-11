import App from '../src/App.js'; // import the singleton

// todo for middleware
//
import { save } from './model/dbDelta.js';
import { NynoClient } from '../drivers/nynoclient.js';
import path from 'path';


let nynoClient;


	

export async function runWorkflowFn(pathWf,data={}){
	if(!nynoClient){
		// todo load envs
		const envVars = App.loadEnvVars('envs/ports.env');
		console.log({envVars});
		nynoClient = await NynoClient.create(envVars.SECRET ?? 'change_me');
		
		
// Load workflows
    const WORKFLOW_DIR = path.join(process.cwd(), "src-nyno");
    nynoClient.loadFolder(WORKFLOW_DIR);
    

    console.log("\nLoaded nyno-src function workflows:");
    
	} else {
	   console.log('already if');
	}
	
	const result1 = await nynoClient.callFromFolder(pathWf,data);
	return result1;
}

export async function runWorkflow(pathWf,data={}){
	if(!nynoClient){
		// todo load envs
		const envVars = App.loadEnvVars('envs/ports.env');
		console.log({envVars});
		nynoClient = await NynoClient.create(envVars.SECRET ?? 'change_me');
		
		
// Load workflows
    const WORKFLOW_DIR = path.join(process.cwd(), "src-nyno");
    nynoClient.loadFolder(WORKFLOW_DIR);
    

    console.log("\nLoaded nyno-src function workflows:");
    
	} else {
	   console.log('already if');
	}

	return nynoClient.runWorkflow(pathWf,data);
}

export async function middleware(args,context){
	let pgClient = App.get('db_nyno_log');
	context['middleware'] = 'postgres insert of last_result';
	if('last_result' in context) {
		const res = await save(context['last_result']);
		console.log('res',res);
	} else {
		console.log('last_result not found :(((!! ')
	}
}
