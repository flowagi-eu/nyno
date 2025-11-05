import App from '../src/App.js'; // import the singleton

// todo for middleware
//
import { save } from './model/dbDelta.js';

export async function middleware(args,context){
	let pgClient = App.get('db_nyno_log');
	
	console.log('pgclient in middleware',pgClient);
	context['middleware'] = 'lets do a postgres insert of last_result';
	if('last_result' in context) {
		const res = await save(context['last_result']);
		console.log('res',res);
	} else {
		console.log('last_result not found :(((!! ')
	}
}
