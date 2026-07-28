import { ensureObject } from '../utils/ensureObject.js';
import { runYamlString } from './../../lib-manual/runYamlString.js';
import { ctxToYaml} from '../utils/ctxToYaml.js';
import fs from "fs";



export async function subuserFlowsSync(ctx, req) {

  let filepath = './workflows-enabled/' + req.params.name ?? null;

const exists = fs.existsSync(filepath);
if(!exists){
	return [404,{"error":"Nyno workflow file does not exist in ./workflow-enabled folder"}];
}



  const context = ensureObject(req.body ?? {});
  //console.log(JSON.stringify({t:'subuserFlowsSync req.body',ts: Date.now(), d: {filepath,context}}));

  const obj = {
    context, 
    filepath,
  };

  const yamlString = await ctxToYaml(obj);
  //console.log('debug::subuser_yamlString',yamlString);
  const res = await runYamlString(yamlString);
  return [200,res];
}
