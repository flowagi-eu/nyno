export function nyno_echo(args,context){
	context['prev'] = args;
	return args[0];
}
