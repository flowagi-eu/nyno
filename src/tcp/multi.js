import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { runYamlString } from './../lib-manual/runYamlString.js';


function debugLog(...args) {
  if (process.env.NODE_ENV !== 'production') console.log('[DEBUG]', ...args);
}

/**
 * Multi-tenant NYNO route registration
 */
export default function register(router) {
  router.on('/run-nyno', async (socket, data) => {
    if (!socket.authenticated) return { error: 'Not authenticated' };

    const { yamlContent,context={} } = data;
    if (!yamlContent) return { error: 'No YAML content provided' };
 
	 console.log('got data',data);
    const startTime = Date.now();
    const result = await runYamlString(yamlContent);
	 console.log('got result',result);
	 console.log('got data 2',data);
    const endTime = Date.now();

		return result;

    return {
      route: '/run-nyno',
      status: result.error ? 'error' : 'ok',
      execution_time_seconds: (endTime - startTime) / 1000,
      execution: result.log ?? [],
      context: result.context ?? {},
      error: result.error,
      errorMessage: result.message,
    };
  });


  // load dynamic routes
  const routesDir = path.join(__dirname, '../../workflows-enabled');

  const loadWorkflowsFromDir = (systemPath, systemName) => {
    const workflows = {};
    for (const file of fs.readdirSync(systemPath)) {
      if (!file.endsWith('.nyno')) continue;

      const workflowTextData = fs.readFileSync(path.join(systemPath, file), 'utf-8');
      const workflowData = yaml.load(workflowTextData);
      workflows[file] = workflowData;

      const routePath = workflowData.route || '/' + path.basename(file, '.nyno');
      console.log('[DYNAMIC ROUTE] ',{routePath});
      router.on(routePath, async (socket, data) => {
        if (!socket.authenticated) return { error: 'Not authenticated' };
        const context = { ...data };
        delete context['path'];

        const result = await runYamlString(workflowTextData,context); //  runWorkflow(workflowData, null, context);

        return result;
      }, systemName);
    }
    return workflows;
  };

  // Load default workflows
  loadWorkflowsFromDir(routesDir, 'default');
}
