// extensions/core/http_post/command.js
export async function nyno_http_post(args, context) {
  const url = args[0];
  const body = args[1] ?? null;
  const headers = args[2] ?? {};

	let setName;
  if("set_context" in context) setName = context['set_context'];
  else setName = 'prev';


  let output = 1; // default failure


  context['last_http_method'] = 'post';
  if (!url) {
    context.HTTP_LAST_RESPONSE = null;
    context.HTTP_LAST_STATUS = null;
    context.HTTP_LAST_ERROR = "No URL provided";
    return output;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: body ? JSON.stringify(body) : null,
    });

    const text = await response.text();

    context[setName] = { HTTP_RESPONSE:text, HTTP_STATUS: response.status, HTTP_ERROR: response.ok ? null : `HTTP error ${response.status}`};
    return 0
  } catch (err) {
    context[setName] = { HTTP_RESPONSE:"", HTTP_STATUS: "", HTTP_ERROR: err.message};
    return -1;
  }

}

/*
// test
let args = [
  'https://empowerd.dev/api',
  { name: "Alice" },
  { "X-Custom-Header": "MyValue" }
];
let context = {};
let output = await nyno_http_post(args, context);
console.log('output', output);
console.log('context', context);
//*/

