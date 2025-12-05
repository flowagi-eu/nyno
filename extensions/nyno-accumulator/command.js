export function nyno_accumulator(args,context){
  const incoming = args[0] || {};

	    let setName = context.set_context || 'prev';

	console.log('context in nyno acc',context);
  // Ensure prev exists and is an object
  if (typeof context[setName] !== "object" || context[setName] === null) {
    context[setName] = {};
  }

  // Accumulate numeric fields; overwrite the rest
  for (const key in incoming) {
    const value = incoming[key];

    if (typeof value === "number") {
      context[setName][key] = (context[setName][key] || 0) + value;
    } else {
      context[setName][key] = value;
    }
  }

  return 0;
}


// ------------------
// Example usage
// ------------------
if (process.argv[1] === new URL(import.meta.url).pathname) {
const context = {
  prev: { count_something: 1 }
};

nyno_accumulator([{ count_something: 2, other: 5 }], context);
console.log(context);
// → { count_something: 3, other: 5 }

  nyno_accumulator([{ count_something: 10 }], context);
console.log(context);
// → { count_something: 13, other: 5 }


}
