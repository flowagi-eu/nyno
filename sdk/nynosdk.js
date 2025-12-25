import App from '../src/App.js'; // import the singleton

// todo for middleware
//
import { save } from './model/dbDelta.js';
import { NynoClient } from '../drivers/nynoclient.js';

let nynoClient;
export async function runWorkflow(path,data={}){
	if(!nynoClient){
		// todo load envs
		const envVars = App.loadEnvVars('envs/ports.env');
		console.log({envVars});
		nynoClient = await NynoClient.create(envVars.SECRET ?? 'change_me');
	} else {
	   console.log('already if');
	}

	return nynoClient.runWorkflow(path,data);
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
