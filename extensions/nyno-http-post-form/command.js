export async function nyno_http_post_form(args, context) {
  const url = args[0];
  const body = args[1] ?? null;
  const headers = args[2] ?? {};
  const cookies = args[3] ?? null;

  let setName;
  if ("set_context" in context) setName = context["set_context"];
  else setName = "prev";

  let output = 1;

  context["last_http_method"] = "post_form";

  if (!url) {
    context.HTTP_LAST_RESPONSE = null;
    context.HTTP_LAST_STATUS = null;
    context.HTTP_LAST_ERROR = "No URL provided";
    return output;
  }

  try {
    // ---- build form body ----
    const formBody =
      body && typeof body === "object"
        ? new URLSearchParams(body).toString()
        : body;

    // ---- build cookie header ----
    let cookieHeader = null;
    if (cookies && typeof cookies === "object") {
      cookieHeader = Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        ...headers,
      },
      body: formBody || null,
    });

    const text = await response.text();

    context[setName] = text;
    context[setName + "_meta"] = {
      HTTP_STATUS: response.status,
      HTTP_ERROR: response.ok ? null : `HTTP error ${response.status}`,
    };

    let json = {};
    if ((context.POST_PARSE_JSON ?? true) === true) {
      try {
        json = JSON.parse(text);
        context[setName + "_meta"]["json"] = json;
      } catch (err) {
        // ignore
      }
    }

    return 0;
  } catch (err) {
    context[setName] = {
      HTTP_RESPONSE: "",
      HTTP_STATUS: "",
      HTTP_ERROR: err.message,
    };
    context[setName + "_error"] = { HTTP_ERROR: err.message };
    return -1;
  }
}
