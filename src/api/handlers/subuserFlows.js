import { ensureObject } from '../utils/ensureObject.js';
    import fs from "fs";

export async function subuserFlows(ctx, req) {
    let filepath = './workflows-enabled/' + req.params.name ?? null;

const exists = fs.existsSync(filepath);
if(!exists){
	return [404,{"error":"Nyno workflow file does not exist in ./workflow-enabled folder"}];
}

        try {
          const obj = {
        status: "pending",
        result: null,
      };


      obj.context = ensureObject(req.body ?? {});
      obj.filepath = filepath;

      const taskId = ctx.createTask(obj, ctx);

      return [200, { taskId }];
    } catch(err){
              return [500, { err:String(err) }];

    }
    }
