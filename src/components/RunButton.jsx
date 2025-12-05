import React, { useState, useEffect } from "react";

export function RunButton({ getText }) {
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
      const textToSend = getText ? getText() : "";
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
    } catch (err) {
      setResult("Error: " + err.message);
    } finally {
      setLoading(false);
    }
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
              <pre className="rnh_result whitespace-pre-wrap text-sm">{result}</pre>
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
                <button 
                  onClick={handleSaveFile}
                  className="rnh_btn_save px-4 py-2 bg-blue-600 text-white rounded-2xl shadow hover:bg-blue-700"
                >
                  Save as File
                </button>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
