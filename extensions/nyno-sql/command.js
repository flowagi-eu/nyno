import App from '../../src/App.js'; // import the singleton

export async function nyno_sql(args, context) {
    
    // Assume setup.sh has been run, directly connect using generated .env file
    let pgClient = App.get('db_nyno_log');

    const queryInput = args[0];
    const queryArgs = args[1] ?? [];

    let setName = 'prev';
    if('set_context' in context) {
	    setName = context['set_context'];
    }

    
    const result = await pgClient.query(queryInput, queryArgs);
    context[setName] = result['rows'];

    return result.rows.length > 0 ? 0 : 1; // 0 = success, 1 = failure/no data
}
