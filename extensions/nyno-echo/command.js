export function nyno_echo(args,context){
	context['NYNO_ECHO_ARGS'] = args;
	return args[0];
}
