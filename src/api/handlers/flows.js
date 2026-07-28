import { ensureObject } from '../utils/ensureObject.js';


export async function flows(ctx, req) {
      const { text, json } = req.body;
      const context = ensureObject(json.context ?? {});

      console.log({
            t: 'called  "/v1/flows/async"', 
            d: {
                tenant_id : ctx.tenant_id,
                text,
                json,
                context
            }, 
            ts:Date.now()
        });

        try {
          const obj = {
        status: "pending",
        result: null,
      };

      if(json) {
          obj.json = json;
      } else if(text) {
          obj.text = text;
      } 

      obj.context = context;
      const taskId = ctx.createTask(obj, ctx);

      return [200, { taskId }];
    } catch(err){
              return [500, { err:String(err) }];

    }
    }