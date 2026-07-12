import React, { useState, useEffect } from "react";
import SimpleJsonExplorer from "@/components/sidebar/JsonNode.jsx";
import YAML from "js-yaml";

export default function RunButton({ getText, onExecution }) {


console.log("RunButton render",getText());

  const getYamlSteps = (yamlText) => {
  let doc = {};

  try {
    doc = YAML.load(yamlText) || {};
  } catch (e) {
    console.error("Invalid YAML:", e);
    doc = {};
  }

  let steps = [];
  for(const step of doc.workflow) {
	steps.push(step.step);
  }

  return steps;
};
  const updateYamlContext = (yamlText, updater) => {
  let doc = {};

  try {
    doc = YAML.load(yamlText) || {};
  } catch (e) {
    console.error("Invalid YAML:", e);
    doc = {};
  }

  if (!doc.context) doc.context = {};

  // allow custom mutation logic
  updater(doc.context, doc);

  return YAML.dump(doc);
};

const getLastExecutionVar = (execution, varName) => {
  const context = execution?.at(-1)?.output?.c || {};
  return context[varName] ?? null;
};

  const [needsMistralKey, setNeedsMistralKey] = useState(false);
const [mistralKey, setMistralKey] = useState(() => {
  try {
    return localStorage.getItem("MISTRAL_API_KEY") || "";
  } catch {
    return "";
  }
});

useEffect(() => {
  if (mistralKey) {
    try {
      localStorage.setItem("MISTRAL_API_KEY", mistralKey);
    } catch {}
  }
}, [mistralKey]);





  const [oneVarMode, setOneVarMode] = useState(false);
const [oneVarText, setOneVarText] = useState(`context:
  key1: "value1"`);

    const [simpleOutput, setSimpleOutput] = useState(true);
  
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");

    const waitForTextInput = async (timeoutMs = 30000, intervalMs = 500) => {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      if (window.LAST_TEXT) {
        resolve(window.LAST_TEXT);
      } else if (Date.now() - start >= timeoutMs) {
        reject(new Error("Text input timed out after 30 seconds."));
      } else {
        setTimeout(check, intervalMs);
      }
    };
    check();
  });
};

const waitForVoiceInput = async (timeoutMs = 30000, intervalMs = 500) => {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      if (window.LAST_AUDIO) {
        resolve(window.LAST_AUDIO);
      } else if (Date.now() - start >= timeoutMs) {
        reject(new Error("Voice input timed out after 30 seconds."));
      } else {
        setTimeout(check, intervalMs);
      }
    };
    check();
  });
};

const waitForFileUpload = async (timeoutMs = 30000, intervalMs = 500) => {
  const start = Date.now();
  
  return new Promise((resolve, reject) => {
    const check = () => {
      if (window.LAST_FILE) {
        resolve(window.LAST_FILE); // File is ready
      } else if (Date.now() - start >= timeoutMs) {
        reject(new Error("File upload timed out after 30 seconds."));
      } else {
        setTimeout(check, intervalMs); // check again
      }
    };
    check();
  });
};

  const [token, setToken] = useState(() => {
    const defaultPw = 'change_me';
    try {
      return localStorage.getItem("rnh_token") || defaultPw;
    } catch (e) {
      return defaultPw;
    }
  });
  const [unauthorized, setUnauthorized] = useState(false);
  const [rememberToken, setRememberToken] = useState(() => {
    try {
      return localStorage.getItem("rnh_remember") === "true";
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
      try {
        localStorage.setItem("rnh_token", token);
        localStorage.setItem("rnh_remember", "true");
      } catch (e) {}
  }, [token, rememberToken]);

  const runFetch = async (overrideToken) => {
    setLoading(true);
    setResult(null);
    setUnauthorized(false);





    try {

const baseText = getText ? getText() : "";
console.log('baseText',baseText);
const oneVarPrefix = oneVarMode ? oneVarText : "";

let textToSend = [oneVarPrefix, baseText]
  .filter(Boolean)
  .join("\n\n")
  .trim();

  // IF rnh_token exists, we automatically add it to the context
  let rnh_token = localStorage.getItem("rnh_token") ?? null;
  if(rnh_token) {
    textToSend = updateYamlContext(textToSend, (ctx) => {
      ctx.rnh_token = rnh_token;
    });
  }

  // check GUI input blocks before workflow (refactor later)
  
  //SHOW_VOICE_POPUP

  if (textToSend.includes('gui-input-voice')) {
  window.SHOW_VOICE_POPUP = true;

  try {
    const userText = await waitForVoiceInput();

    console.log("Text input received:", userText);

    // attach to YAML context
    textToSend = updateYamlContext(textToSend, (ctx) => {
      ctx.prev = userText;
    });

    delete window.LAST_AUDIO;
  } catch (err) {
    alert(err.message);
    setLoading(false);
    return;
  }
}

if(window.CONTEXT_outputChatSubmit ?? false) {
  const { prev, MISTRAL_MESSAGES } = window.CONTEXT_outputChatSubmit;
   textToSend = updateYamlContext(textToSend, (ctx) => {
      ctx.prev = prev;
      ctx.MISTRAL_MESSAGES = MISTRAL_MESSAGES;
    });
    delete window.CONTEXT_outputChatSubmit;
} else if (textToSend.includes('gui-input-textarea') && !("CONTEXT_outputChatSubmit" in window)) {
  window.SHOW_TEXTAREA_POPUP = true;

  try {
    const userText = await waitForTextInput();

    console.log("Text input received:", userText);

    // attach to YAML context
    textToSend = updateYamlContext(textToSend, (ctx) => {
      ctx.prev = userText;
    });

    delete window.LAST_TEXT;
  } catch (err) {
    alert(err.message);
    setLoading(false);
    return;
  }
}

  if(textToSend.includes('gui-input-file-upload')){
  	window.SHOW_FILE_UPLOAD_POPUP = true;
  	try {
    const uploadedFile = await waitForFileUpload();

    console.log("File uploaded:", uploadedFile);
    
     // append file to context as key ${prev} is set via the GUI
     textToSend = updateYamlContext(textToSend, (ctx) => {
      ctx.prev = window.LAST_FILE;
     });
	delete window.LAST_FILE;
  } catch (err) {
    alert(err.message); // Show timeout alert
    setLoading(false);
    return;
  }
  
  }

     

      if(textToSend.includes('workflow: []')) {
        alert("Please use \"Add Node\" to add at least one node.")
        return;
      }
      console.log('textToSend',textToSend);


   let basedir = import.meta.env.VITE_BASE ?? '/';
if(!basedir)  throw new Error("Missing VITE_BASE environment variable");
	if(basedir != '/') basedir += '/';


     const stepsToLog = getYamlSteps(textToSend);
     console.log('stepsToLog',stepsToLog);




	let data,res; 

{


const HTTP_EXECUTOR_URL = import.meta.env.VITE_HTTP_EXECUTOR_URL;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));


const pollTask = async (taskId, { timeoutMs = 5 * 60 * 1000, intervalMs = 300 } = {}) => {
  const start = Date.now();

  while (true) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Polling timed out after 5 minutes");
    }

    res = await fetch(`${HTTP_EXECUTOR_URL}/polling/${taskId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("rnh_token") ?? "change_me",
      },
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    // Adjust this condition based on your API (e.g. status === "done")
    if ((data?.status === "done" || data?.status === "error") || data?.result) {
      return data.result;
    }
 
    //console.log('res',res);
    if(res.status == 401) {
	alert('Unauthorized');
	break;
    }

    await sleep(intervalMs);
  }
};

const run = async (textToSend) => {
  const res = await fetch(import.meta.env.VITE_HTTP_EXECUTOR_URL + '/flows/async', {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: localStorage.getItem("rnh_token") ?? "change_me",
    },
    body: JSON.stringify({ json: YAML.load(textToSend) }),
  });

  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  const taskId = data?.taskId;

  if (!taskId) {
    throw new Error("No taskId returned from server");
  }

  return await pollTask(taskId);
};


data = await run(textToSend);

}


// hardcoded test for markdown popup

// OUTPUT LAYER GUI (refactor later)
if("execution" in data) {
  console.log('data.execution',data.execution);

const lastStep = data.execution[data.execution.length-1].output.c.LAST_STEP;
console.log('lastStep',lastStep);


// AFTER THE WORKFLOW GUI

//SHOW_AUDIO_PLAYER_POPUP === true) {
   // (window.LAST_AUDIO_TO_PLAY) {

   if (lastStep === "gui-output-audio") {
    const b64audio = getLastExecutionVar(data.execution, "prev");
    window.LAST_AUDIO_TO_PLAY = b64audio;
    window.SHOW_AUDIO_PLAYER_POPUP = true;
  }


// Rule: Use event dispatch to trigger GUI output wherever feasible
if (lastStep === "gui-output-chat-history-form") {
const detail = getLastExecutionVar(data.execution, "prev");
window.dispatchEvent(
    new CustomEvent("showOutputChat", {
      detail,
    })
  );
}

if (lastStep === "gui-output-list") {
const detail = getLastExecutionVar(data.execution, "prev");
window.dispatchEvent(
    new CustomEvent("showDynamicListForm", {
      detail,
    })
  );
}
if (lastStep === "gui-output-html") {
const detail = getLastExecutionVar(data.execution, "prev");
window.dispatchEvent(
    new CustomEvent("showHtmlPopup", {
      detail,
    })
  );
}
if (lastStep === "gui-output-markdown") {
const markdown = getLastExecutionVar(data.execution, "prev");
window.dispatchEvent(
    new CustomEvent("showMarkdownPopup", {
      detail: markdown,
    })
  );
}

if (lastStep === "gui-output-image") {
  const value = getLastExecutionVar(data.execution, "prev");

  window.dispatchEvent(
    new CustomEvent("showImagePopup", {
      detail: value,
    })
  );
}



}


      // Detect unauthorized by HTTP status or by JSON body containing an "Unauthorized" error
      const isUnauthorized = res.status === 401 || (data && (data.error === "Unauthorized" || data.message === "Unauthorized"));
      if (isUnauthorized) {
        setUnauthorized(true);
        setResult(data ? JSON.stringify(data, null, 2) : `Unauthorized (status ${res.status})`);
      } else {
        setResult(data ? JSON.stringify(data, null, 2) : `Status ${res.status}`);
      }

      // also highlight executed nodes in the gui
      onExecution?.(data?.execution);
    } catch (err) {
      setResult("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

	useEffect(() => {
  if (!open) return;

  const popup = document.querySelector('.rnh_popup');
  if (!popup) return;

  // set initial width
  popup.style.width = '432px';

  // avoid duplicating resizer (for now disabled)
  if (false && popup.querySelector('.rnh_resizer')) return;

  const resizer = document.createElement('div');
  resizer.className = 'rnh_resizer';

  Object.assign(resizer.style, {
    position: 'absolute',
    left: '0',
    top: '0',
    width: '3px',
    height: '100%',
    cursor: 'ew-resize',
    zIndex: '1000000',
    background: 'transparent',
  });

  popup.appendChild(resizer);

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  const onMouseMove = (e) => {
    if (!isResizing) return;

    const delta = startX - e.clientX;
    const newWidth = Math.max(250, startWidth + delta);

    popup.style.width = newWidth + 'px';
  };

  const onMouseUp = () => {
    isResizing = false;
    document.body.style.userSelect = '';
  };

  resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = popup.offsetWidth;
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  return () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    resizer.remove();
  };
}, [open]);


const renderSimpleChat = () => {
  if (!result) return null;

  let parsed;
  try {
    
    parsed = JSON.parse(result);
  } catch {
    console.log('invalid result',result);
    const srcDoc = `
      <html>
        <head>
          <style>
            body { background-color: #2a2d33;  background:none;color: white; padding: 16px; font-family: sans-serif; }
            img,video { max-width:100%;}
          </style>
        </head>
        <body>Invalid response</body>
      </html>
    `;
    return (
      <iframe
        sandbox="allow-scripts allow-same-origin"
        className='preview-iframe'
        style={{  width: "100%", border: "none", minHeight: "60dvh",'border': '1px solid rgb(55, 65, 81)',background: '#00050d' }}
        srcDoc={srcDoc}
      />
    );
  }

  const execution = parsed?.execution;

  let content = "";

  // Case 1: execution is a string
  if (typeof execution === "string") {
    content = execution;
  }
  // Case 2: execution is an array
  else if (Array.isArray(execution) && execution.length > 0) {
    const lastStep = execution[execution.length - 1];
    const context = lastStep?.output?.c || {};

	let error;
	if("prev_error" in context && JSON.stringify(context.prev_error) !== '{}') {
		error = context.prev_error;
	}
	if("error" in context && JSON.stringify(context.error) !== '') {
		error = context.error;
	}
    const prev = context["prev"];

    if (error) {
      content = typeof error === "string" ? error : JSON.stringify(error);
    } else if (prev) {
      content = typeof prev === "string" ? prev : JSON.stringify(prev);
    } else {
      content = JSON.stringify(context);
    }
  } else {
    content = "No execution data";
  }

  const srcDoc = `
    <html>
      <head>
        <style>
          body {
            background-color: rgb(17, 24, 39);
             background:none;
            color: white;
            padding: 16px;
            font-family: sans-serif;
            white-space: pre-wrap;
          }
          img,video { max-width:100%;}
        </style>
      </head>
      <body>${content}</body>
    </html>
  `;

  return (
    <iframe
      sandbox="allow-scripts allow-same-origin"
      className='preview-iframe'
      style={{ width: "100%", border: "none", minHeight: "60dvh" , borderRadius: '9px','marginTop': '1rem', 'border': '1px solid rgb(55, 65, 81)', background: '#00050d'}}
      srcDoc={srcDoc}
    />
  );
};




  const handleSaveFile = async() => {

const blob = new Blob([(result)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "output-nyno-workflow.json";
    a.click();
  };

  const handleRun = async () => {
      console.log("RUN", Date.now());
    setOpen(true);
    await runFetch();
  };

  // from chat history form
  useEffect(() => {
  const handler = (e) => {
    window.CONTEXT_outputChatSubmit = {"prev": e.detail.text, "MISTRAL_MESSAGES": e.detail.items };
    handleRun();
  };

  window.addEventListener("outputChatSubmit", handler);

  return () => {
    window.removeEventListener("outputChatSubmit", handler);
  };
}, [handleRun]);

  const handleRetry = async () => {
    // If user edited token in the input, it will be used as `token` (or you can pass an override)
    await runFetch(token);
  };

  return (
    <div className="rnh_container p-4">
      <div
        style={{
          textAlign: "right",
          position: "fixed",
          right: 0,
          zIndex: 9989,
        }}
      >
        <button
          onClick={handleRun}
          className="rnh_button px-4 py-2 bg-blue-600 text-white rounded-2xl shadow hover:bg-blue-700"
        >
          Run Workflow
        </button>
      </div>

      {open && (
        <div className="rnh_popup fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="rnh_popup_inner bg-white p-6 rounded-2xl shadow w-96">

{needsMistralKey && (
  <div className="mb-4">
    <label className="block text-sm font-medium mb-1">
      Mistral API Key required
    </label>
    <input
      type="password"
      value={mistralKey}
      onChange={(e) => setMistralKey(e.target.value)}
      placeholder="sk-..."
      className="w-full px-3 py-2 border rounded mb-2"
    />
    <button
      onClick={() => setNeedsMistralKey(false)}
      disabled={!mistralKey}
      className="px-3 py-1 bg-green-600 text-white rounded-2xl hover:bg-green-700"
    >
      Save & Continue
    </button>
  </div>
)}



            {/* If unauthorized, show an input to change the token */}
            {unauthorized && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Authorization token</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full px-3 py-2 border rounded mb-2"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                   
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRetry}
                      disabled={loading}
                      className="px-3 py-1 bg-green-600 text-white rounded-2xl hover:bg-green-700"
                    >
                      Save & Retry
                    </button>
                    
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="rnh_loading flex flex-col items-center">
                <div className="rnh_spinner animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                <p className="rnh_loading_text mt-4">Loading...</p>
              </div>
            ) : (
              <div>
                <div style={{textAlign:'right'}}>
<input
  type="checkbox"
  className="rnh_checkbox"
  checked={oneVarMode}
  onChange={(e) => setOneVarMode(e.target.checked)}
 />{" "}
Custom Context
                </div>
                <div>
{oneVarMode && (
  <textarea
  spellCheck={false}
    className="rnh_textarea w-full mt-3 p-2 border rounded text-sm"
    placeholder="Enter single variable value..."
    value={oneVarText}
    onChange={(e) => setOneVarText(e.target.value)}
              style={{ width: "100%", height: 120 }}

  />
)}

                </div>
{simpleOutput ? (
  <div className="chat">
    {renderSimpleChat()}
  </div>
) : (
  <pre className="rnh_result whitespace-pre-wrap text-sm">
    <div style={{ maxHeight: 400, overflow: 'auto' }}>
     		<input className='explorerSearch'
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                {(() => {
        try {
          return (
            <SimpleJsonExplorer
              data={JSON.parse(result)}
              query={searchQuery}
            />
          );
        } catch (e) {
          return <div>Invalid JSON</div>;
        }
      })()}

              </div>
  </pre>
)}

              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setOpen(false);
                }}
                className="rnh_close px-4 py-2 bg-gray-300 rounded-2xl hover:bg-gray-400"
              >
                Close
              </button>

              {!unauthorized && (
                <div>
                  <label className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={simpleOutput}
    onChange={(e) => setSimpleOutput(e.target.checked)}
  />
  Simple Chat Output
</label>

                <button 
                  onClick={handleSaveFile}

                >
                  Save Output as File
                </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
