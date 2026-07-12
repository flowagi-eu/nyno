import fs from "fs";
import path from "path";



export async function flows(ctx, req) {
      const { text, json, filepath, context } = req.body;

      console.log({
            t: 'called  "/v1/flows/async"', 
            d: {
                tenant_id : ctx.tenant_id,
                text,
                filepath,
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
      } else if(filepath) {
          obj.filepath = filepath;
      } 

      if(context) {
        obj.context = context;
      }


      const taskId = ctx.createTask(obj, ctx);

      return [200, { taskId }];
    } catch(err){
              return [500, { err:String(err) }];

    }
    }