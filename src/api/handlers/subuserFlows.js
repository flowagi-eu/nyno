import { ensureObject } from '../utils/ensureObject.js';
    import fs from "fs";

import { getWorkflowPath} from '../utils/getWorkflowPath.js';


export async function subuserFlows(ctx, req) {
    let filepath = getWorkflowPath(req.params.name ?? null);

const exists = fs.existsSync(filepath);
if(!exists){
	return [404,{"error":"Nyno workflow file does not exist in ./workflows-enabled folder"}];
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
