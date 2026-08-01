import { useEffect, useState } from "react";

export default function KeyValuePopup() {
  const [visible, setVisible] = useState(false);
  const [rows, setRows] = useState([
    { key: "", value: "" },
    { key: "", value: "" },
    { key: "", value: "" },
  ]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(window.SHOW_KVS_POPUP === true);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const updateRow = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      )
    );
  };

  const addRow = () => {
    setRows((prev) => [...prev, { key: "", value: "" }]);
  };

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    const kvs = rows.filter(
      (r) => r.key.trim() !== "" || r.value.trim() !== ""
    );

    const kvObj = {};
    const list = JSON.parse(JSON.stringify(kvs));
    for(const item of list) {
	const { key,value } = item;
	kvObj[key] = value;
    }
    window.LAST_KVS = kvObj;

    setStatus("Sent ✅");

    setTimeout(() => {
      window.SHOW_KVS_POPUP = false;
      setVisible(false);
      setRows([
        { key: "", value: "" },
        { key: "", value: "" },
        { key: "", value: "" },
      ]);
      setStatus("");
    }, 1000);
  };

  if (!visible) return null;

  return (
    <div
      className="popup-txt"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "#111827",
          padding: 16,
          borderRadius: 10,
          width: 500,
          position: "relative",
        }}
      >
        <h3 style={{ color: "white", marginBottom: 12 }}>
          Enter Key / Value Pairs
        </h3>

        <div
          style={{
            maxHeight: 300,
            overflowY: "auto",
            marginBottom: 12,
          }}
        >
          {rows.map((row, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 8,
                alignItems: "center",
              }}
            >
              <input
                placeholder="Key"
                value={row.key}
                onChange={(e) =>
                  updateRow(i, "key", e.target.value)
                }
                style={{
                  flex: 1,
                  padding: 8,
                  borderRadius: 6,
                  border: "1px solid #374151",
                  background: "#0b1220",
                  color: "white",
                }}
              />

              <input
                placeholder="Value"
                value={row.value}
                onChange={(e) =>
                  updateRow(i, "value", e.target.value)
                }
                style={{
                  flex: 1,
                  padding: 8,
                  borderRadius: 6,
                  border: "1px solid #374151",
                  background: "#0b1220",
                  color: "white",
                }}
              />

              <button
                onClick={() => removeRow(i)}
                style={{
                  width: 32,
                  height: 32,
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addRow}
          style={{
            marginBottom: 12,
            padding: "8px 12px",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          + Add Row
        </button>

        <button
          onClick={handleSend}
          style={{
            position: "absolute",
            bottom: 20,
            right: 18,
            height: 36,
            borderRadius: 9,
            border: "none",
            cursor: "pointer",
            background: "#2563eb",
            fontSize: 18,
            fontWeight: 500,
            color: "black",
            padding: "0 16px",
          }}
        >
          →
        </button>

        {status && (
          <p
            style={{
              position: "absolute",
              left: 16,
              bottom: 0,
              color: "lightgreen",
            }}
          >
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
