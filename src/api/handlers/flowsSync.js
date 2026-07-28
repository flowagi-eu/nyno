import { load, dump } from 'js-yaml';

import { ensureObject } from '../utils/ensureObject.js';

export async function flowsSync(ctx, req) {

  const { text, json } = req.body;
  const context = ensureObject(json.context ?? {});

  console.log(JSON.stringify({t:'req.body',ts: Date.now(), d: {text,context}}));

  let obj = Object.assign({}, load(text));

  text = dump(obj);

  console.log({
    t: 'called "/v1/flows"',
    d: {
      tenant_id: ctx.tenant_id,
      text,
      context: context,
      obj_context: obj.context,
    },
    ts: Date.now()
  });

 try {
  const taskId = ctx.createTask({
    text,
    json, 
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
