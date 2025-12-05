export async function nyno_http_get(args, context) {
  const url = args[0];
  let output = 1; // default failure

  let setName;
  if("set_context" in context) setName = context['set_context'];
  else setName = 'prev';

  if (!url) {
    context[setName + '.error'] = {"usageError": "No URL provided" };
    return output;
  }

  try {
    const response = await fetch(url);
    const text = await response.text();

    let HTTP_RESPONSE = text;
    let HTTP_STATUS = response.status;
    let HTTP_ERROR = response.ok ? null : `HTTP error ${response.status}`;
    context[setName] = { HTTP_RESPONSE, HTTP_STATUS};
    if(HTTP_ERROR){
	context[setName]['HTTP_ERROR'] = HTTP_ERROR;
    }

    output = response.ok ? 0 : 1; // 0 = success, 1 = failure
  } catch (err) {
    let HTTP_ERROR = err.message;
    context[setName + '.error'] = {HTTP_ERROR};
    output = 1;
  }

  return output;
}


/*
// test
let args = ['https://empowerd.dev'];
let context = {};
let output = await nyno_http_get(args,context);
console.log('output',output);
console.log('context',context);

 //*/
