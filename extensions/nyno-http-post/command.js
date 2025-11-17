// extensions/core/http_post/command.js
export async function nyno_http_post(args, context) {
  const url = args[0];
  const body = args[1] ?? null;
  const headers = args[2] ?? {};
  let output = 1; // default failure

  context['body'] = body;

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

    context.HTTP_LAST_RESPONSE = text;
    context.HTTP_LAST_STATUS = response.status;
    context.HTTP_LAST_ERROR = response.ok ? null : `HTTP error ${response.status}`;

    output = response.ok ? 0 : 1; // 0 = success, 1 = failure
  } catch (err) {
    context.HTTP_LAST_RESPONSE = null;
    context.HTTP_LAST_STATUS = null;
    context.HTTP_LAST_ERROR = err.message;
    output = 1;
  }

  return output;
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

