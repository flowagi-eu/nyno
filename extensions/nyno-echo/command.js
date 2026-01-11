export function nyno_echo(args,context){
    let setName = context['set_context'] ?? 'prev';
    if(args.length == 1) {
	    context[setName] = args[0];
	} else {
	    context[setName] = args;
	}
	
	if (typeof args[0] === "number") return args[0];
    if (typeof args[0] === "boolean") return args[0] ? 1 : 0;
    return 0;
}
