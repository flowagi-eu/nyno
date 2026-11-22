// extensions/core/http_post/command.js
export async function http_post(args, context) {
  const url = args[0];
  const body = args[1] ?? null;
  const headers = args[2] ?? {};

	let setName;
  if("set_context" in context) setName = context['set_context'];
  else setName = 'prev';


  let output = 1; // default failure

  const newContext = {};

  newContext['last_http_method'] = 'post';
  if (!url) {
    newContext.HTTP_LAST_RESPONSE = null;
    newContext.HTTP_LAST_STATUS = null;
    newContext.HTTP_LAST_ERROR = "No URL provided";
    return [output,newContext];
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: body ? JSON.stringify(body) : null,
    });

    const text = await response.text();

    newContext[setName] = text;
    newContext[setName + "_meta"] = { HTTP_STATUS: response.status, HTTP_ERROR: response.ok ? null : `HTTP error ${response.status}`};

    // _meta: try to parse response as json, , default true
    let json = {};
    if((context.POST_PARSE_JSON ?? true) === true) {
      try {
        json = JSON.parse(text);
         newContext[setName + "_meta"]['json'] = json;
      } catch(err){
        // 
      }
    }


    output = response.ok ? 0 : 1; // 0 = success, 1 = failure
    return [output,newContext];
  } catch (err) {
    newContext[setName] = { HTTP_RESPONSE:"", HTTP_STATUS: "", HTTP_ERROR: err.message};
    newContext[setName + "_error"] = { HTTP_ERROR: err.message};
    return [-1,newContext];
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
