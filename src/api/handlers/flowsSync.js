import fs from "fs";
import path from "path";
import { load, dump } from 'js-yaml';
import { file } from "zod";

function ensureObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

export async function flowsSync(ctx, req) {

  let { text,json,  filepath, context } = req.body;

  console.log(JSON.stringify({t:'req.body',ts: Date.now(), d: {text,filepath,context}}));

let obj = Object.assign({}, load(text));

  // handle both context methods, if POST .context is use it, otherwise use YAML context
  if(context) obj.context = ensureObject(context);
  else if(!obj.context) obj.context = {};

  obj.context['NYNO_API_KEY'] = ctx.NYNO_API_KEY;

  text = dump(obj);

  console.log({
    t: 'called "/v1/flows"',
    d: {
      tenant_id: ctx.tenant_id,
      text,
      filepath,
      context: context,
      obj_context: obj.context,
    },
    ts: Date.now()
  });

 try {
  const taskId = ctx.createTask({
    text,
    json, 
    filepath,
    context,
    status: "pending",
    result: null,
  }, ctx);


  for (;;) {

    const task = ctx.getTask(taskId);


    if (!task) {
      return [
        404,
        {
          error: "task not found"
        }
      ];
    }


    if (task.status === "done") {
      return [
        200,
        {
          status: "done",
          result: task.result
        }
      ];
    }


    if (task.status === "error") {
      return [
        500,
        {
          error: task.error ?? "task failed"
        }
      ];
    }


    await new Promise(resolve =>
      setTimeout(resolve, 250)
    );
  }
} catch(err){
              return [500, { err:String(err) }];

    }
}
