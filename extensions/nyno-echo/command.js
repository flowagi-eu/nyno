export function nyno_echo(args,context){
    if(args.length == 1) {
	    context['prev'] = args[0];
	} else {
	    context['prev'] = args;
	}
	
	if (typeof args[0] === "number") return args[0];
    if (typeof args[0] === "boolean") return args[0] ? 1 : 0;
    return 0;
}
