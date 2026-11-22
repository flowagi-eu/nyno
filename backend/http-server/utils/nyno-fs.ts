import { nyno_file_write } from '../../extensions/nyno-file-write/command.jt';
import { nyno_file_read } from '../../extensions/nyno-file-read/command.jt';
import { createSandboxFs } from '../../sandboxfs.config.ts';

@CheckAtRuntime
export async function nyno_write(tenant_id:string, path:string,content: string){

  const [,sandboxfs_write] = await createSandboxFs(tenant_id); // for reading the workflows here..
  return nyno_file_write([path,content], { SYSTEM: {
      sandboxfs_write
  }});
}

@CheckAtRuntime
export async function nyno_read(tenant_id:string, path:string){

  const [sandboxfs_read,] = await createSandboxFs(tenant_id); // for reading the workflows here..
  return nyno_file_read([path], { SYSTEM: {
     sandboxfs_read,
  }});
}

@CheckAtRuntime
export async function nyno_existsSync(tenant_id:string, path:string){

  const [sandboxfs_read,] = await createSandboxFs(tenant_id); // for reading the workflows here..
  return sandboxfs_read.existsSync(path);
}

/*
// this should directly use our runYamlString,
// but we still need nynoClient via TCP to retrieve the file content 
//// OR we can even use same isolation sandbox fs here directly actually..
////// yeah its just we need good config for that.. 

@CheckAtRuntime
export async function runTaskSync(tenant_id: string, dirs, workflow, context) {
  const [sandboxfs_read,sandboxfs_write] = await createSandboxFs(tenant_id); // for reading the workflows here..
const customContext = {
    SYSTEM: {
      sandboxfs_read,
      sandboxfs_write
    }
  }
*/
