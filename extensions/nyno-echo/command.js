export function nyno_echo(args,context){
    if(args.length == 1) {
	    context['prev'] = args[0];
	} else {
	    context['prev'] = args;
	}
	
	return args[0];
}
