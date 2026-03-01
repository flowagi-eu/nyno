import React, { useState, useMemo } from "react";

function highlight(text, query) {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <span key={i} style={{ backgroundColor: "yellow", color: "black" }}>
        {part}
      </span>
    ) : (
      part
    )
  );
}

function JsonNode({ jkey, data, query, level = 0 }) {
  const [open, setOpen] = useState(level < 1);

  const isObject = typeof data === "object" && data !== null;
  const isArray = Array.isArray(data);
  const entries = isArray ? data.map((v, i) => [i, v]) : isObject ? Object.entries(data) : [];

  const hasMatch = useMemo(() => {
    if (!query) return false;
    if (!isObject) return String(data).toLowerCase().includes(query.toLowerCase());
    return entries.some(([key, value]) =>
      String(key).toLowerCase().includes(query.toLowerCase()) ||
      (typeof value === 'object'
        ? JSON.stringify(value).toLowerCase().includes(query.toLowerCase())
        : String(value).toLowerCase().includes(query.toLowerCase()))
    );
  }, [data, query, entries, isObject]);

  const isOpen = hasMatch || open;

  if (!isObject) {
    const color =
      typeof data === "string"
        ? "#22c55e"
        : typeof data === "number"
        ? "#60a5fa"
        : typeof data === "boolean"
        ? "#f97316"
        : "#e5e7eb";

    if(jkey && String(jkey).includes('API')) {
    return (
      <span className='explorer_blur' style={{ color }}>
        {typeof data === "string" ? '"' : ""}
        {highlight(String(data), query)}
        {typeof data === "string" ? '"' : ""}
      </span>
    );
    } else {
    return (
      <span style={{ color }}>
        {typeof data === "string" ? '"' : ""}
        {highlight(String(data), query)}
        {typeof data === "string" ? '"' : ""}
      </span>
    );
    }
  }

  return (
    <div style={{ marginLeft: 3 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ cursor: "pointer", userSelect: "none", color: "#9ca3af" }}
      >
        {isOpen ? "▼" : "▶"} {isArray ? "[" : "{"}
      </div>

      {isOpen && (
        <div>
          {entries.map(([key, value]) => (
            <div key={key} style={{ display: "flex", gap: 3 }}>
              <span style={{ color: "#3b82f6" }}>{highlight(String(key), query)}:</span>
              <JsonNode jkey={key} data={value} query={query} level={level + 1} />
            </div>
          ))}
          <div style={{ color: "#9ca3af" }}>{isArray ? "]" : "}"}</div>
        </div>
      )}
    </div>
  );
}

export default function SimpleJsonExplorer({ data, query = "" }) {
  return (
    <div
      style={{
        maxHeight: 600,
        overflow: "auto",
        background: "#111827",
        padding: 10,
        borderTop: "1px solid #374151",
        fontFamily: "monospace",
        color: "#e5e7eb",
      }}
    >
      {data ? <JsonNode jkey='' data={data} query={query} /> : <div style={{ color: "#ef4444" }}>No JSON Data</div>}
    </div>
  );
}

