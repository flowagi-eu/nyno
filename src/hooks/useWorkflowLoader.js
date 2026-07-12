import { useEffect } from "react";
import { saveWorkflowToFilepath } from '@/endpoints/saveWorkflowToFilepath.js';
import { loadWorkflowByFilepath } from '@/endpoints/loadWorkflowByFilepath.js';
import { loadExtensions } from '@/endpoints/loadExtensions.js';

export function useWorkflowLoader({
  exportWorkflowStr,
  setExtensions,
}) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filepath = params.get("filepath");
    const key = params.get("key");
    const tenant_id = params.get("tenant_id");

    loadExtensions(tenant_id).then((result) => {
      console.log(JSON.stringify({
        t: 'setting extensions',
        d: {result},
        f: 'hooks/useWorkflowLoader.js',
      }));
      setExtensions(result);
    })

    if (!key || !filepath) return;

    localStorage.setItem("NYNO_API_KEY", key);
    console.log({ key, filepath });

    loadWorkflowByFilepath({
      filepath,
      NYNO_API_KEY: key
    });

    const interval = setInterval(async () => {
      saveWorkflowToFilepath({
        text: await exportWorkflowStr(),
        filepath,
        NYNO_API_KEY: key,
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);
}
