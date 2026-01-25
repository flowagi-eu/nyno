import React, { useState, useEffect } from "react";
import { SimpleOutputToggle } from "@/components/SimpleOutputToggle";

export function RunButton({ getText, onExecution }) {

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

  const [needsOpenAIKey, setNeedsOpenAIKey] = useState(false);
const [OpenAIKey, setOpenAIKey] = useState(() => {
  try {
    return localStorage.getItem("OPEN_AI_API_KEY") || "";
  } catch {
    return "";
  }
});

useEffect(() => {
  if (OpenAIKey) {
    try {
      localStorage.setItem("OPEN_AI_API_KEY", OpenAIKey);
    } catch {}
  }
}, [OpenAIKey]);


  const [oneVarMode, setOneVarMode] = useState(false);
const [oneVarText, setOneVarText] = useState(`context:
  key1: "value1"`);

    const [simpleOutput, setSimpleOutput] = useState(true);
  
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

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
const oneVarPrefix = oneVarMode ? oneVarText : "";

let textToSend = [oneVarPrefix, baseText]
  .filter(Boolean)
  .join("\n\n")
  .trim();


const usesMistral = textToSend.includes("mistral") && textToSend.includes("ai");
const usesOpenAI = textToSend.includes("openai") && textToSend.includes("ai");

if (usesMistral && !mistralKey) {
  setNeedsMistralKey(true);
  setLoading(false);
  return;

}
if (usesMistral && mistralKey) {
  const mistralContext = `context:\n  MISTRAL_API_KEY: "${mistralKey}"\n`;
  if(textToSend.startsWith('context:')) {
    textToSend = textToSend.replace('context:',mistralContext);
  } else {
    textToSend = [mistralContext, textToSend].join("\n\n");
  }
}
if (usesOpenAI && !OpenAIKey) {
  setNeedsOpenAIKey(true);
  setLoading(false);
  return;

}
if (usesOpenAI && OpenAIKey) {
  const OpenAIContext = `context:\n  OPEN_AI_API_KEY: "${OpenAIKey}"\n`;
  if(textToSend.startsWith('context:')) {
    textToSend = textToSend.replace('context:',OpenAIContext);
  } else {
    textToSend = [OpenAIContext, textToSend].join("\n\n");
  }
}

      if(textToSend.includes('workflow: []')) {
        alert("Please use \"Add Node\" to add at least one node.")
        return;
      }
      console.log('textToSend',textToSend);
      const res = await fetch("/run-nyno-http", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: overrideToken || token,
        },
        body: JSON.stringify({ text: textToSend }),
      });

      // try to parse JSON safely
      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        data = null;
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

  // avoid duplicating resizer
  if (popup.querySelector('.rnh_resizer')) return;

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
    const srcDoc = `
      <html>
        <head>
          <style>
            body { background-color: #2a2d33; color: white; padding: 16px; font-family: sans-serif; }
          </style>
        </head>
        <body>Invalid response</body>
      </html>
    `;
    return (
      <iframe
        sandbox="allow-scripts allow-same-origin"
        style={{ width: "100%", border: "none", minHeight: "80dvh" }}
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

    const error = context["prev.error"];
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
            background-color: #2a2d33;
            color: white;
            padding: 16px;
            font-family: sans-serif;
            white-space: pre-wrap;
          }
        </style>
      </head>
      <body>${content}</body>
    </html>
  `;

  return (
    <iframe
      sandbox="allow-scripts allow-same-origin"
      style={{ width: "100%", border: "none", minHeight: "80dvh" , borderRadius: '9px','marginTop': '1rem'}}
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
    setOpen(true);
    await runFetch();
  };

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
          zIndex: 999999,
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
{needsOpenAIKey && (
  <div className="mb-4">
    <label className="block text-sm font-medium mb-1">
      OpenAI API Key required
    </label>
    <input
      type="password"
      value={OpenAIKey}
      onChange={(e) => setOpenAIKey(e.target.value)}
      placeholder="sk-..."
      className="w-full px-3 py-2 border rounded mb-2"
    />
    <button
      onClick={() => setNeedsOpenAIKey(false)}
      disabled={!OpenAIKey}
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
    {result}
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
