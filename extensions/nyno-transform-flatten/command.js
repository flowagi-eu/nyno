// nyno_transform_flatten.js
// Simple ES6 transformer that extracts nested arrays by path and flattens one level

export function nyno_transform_flatten(args, context) {
  let list = args[0];
	if(!Array.isArray(list)){
list = [list];
	}

	console.log('EXTENSION DEBUG! transform flatten list or JSON sr?',list);
  
  const path = args[1]; // e.g., "data" or "items.children"


  const setName = context["set_context"] ?? "prev";
  if (!Array.isArray(list)) {
    context[setName+".error"] = { error: "args[0] must be an array" };
    return 0;
  }

  if (!path || typeof path !== "string") {
    context[setName+".error"] = { error: "args[1] must be a path string" };
    return 0;
  }

  // Helper to get nested value by dot-path
  const getPath = (obj, path) =>
    path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);

  // Extract and flatten one level
	const output = [];
for (const item of list) {
  const arr = getPath(item, path);
  if (Array.isArray(arr)) {
    output.push(...arr); // flatten one level on the fly
  } else if (arr != null) {
    output.push(arr);
  }
}



  context[setName] = output;

  return 0;
}

/*
// Demo if executed directly in ES6
if (import.meta.url === `file://${process.argv[1]}`) {
  const examples = [
    {
      desc: "1-level flatten",
      input: [{ id: 1, data: [1, 2] }, { id: 2, data: [3, 4] }],
      path: "data"
    },
    {
      desc: "1-level flatten (non array data)",
      input: [{ id: 1, data: "test1" }, { id: 2, data: "test2" }],
      path: "data"
    },
    {
      desc: "2-level flatten",
      input: [{ id: 1, items: { children: [1, 2] } }, { id: 2, items: { children: [3] } }],
      path: "items.children"
    },
    {
      desc: "2-level flatten (non array data)",
      input: [{ id: 1, items: { children: "test3" } }, { id: 2, items: { children: "test4" } }],
      path: "items.children"
    },
    {
      desc: "3-level flatten",
      input: [
        { group: { items: { values: [1, 2] } } },
        { group: { items: { values: [3, 4] } } }
      ],
      path: "group.items.values"
    }
  ];

  examples.forEach(ex => {
    const context = {};
    nyno_transform_flatten([ex.input, ex.path], context);
    console.log(ex.desc);
    console.log("Input:", JSON.stringify(ex.input));
    console.log("Path:", ex.path);
    console.log("Output:", context["nyno_transform_flatten"]);
    console.log("----");
  });
}
//*/
