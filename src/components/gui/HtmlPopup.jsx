import { useEffect, useState } from "react";

export default function HtmlPopup() {
  const [visible, setVisible] = useState(false);
  const [content, setContent] = useState("");

  useEffect(() => {
    const handleShow = (event) => {
      setContent(event.detail || "");
      setVisible(true);
    };

    const handleClose = () => {
      setVisible(false);
      setContent("");
    };

    window.addEventListener("showHtmlPopup", handleShow);
    window.addEventListener("closeHtmlPopup", handleClose);

    return () => {
      window.removeEventListener("showHtmlPopup", handleShow);
      window.removeEventListener("closeHtmlPopup", handleClose);
    };
  }, []);

  const copyContent = () => {
    navigator.clipboard.writeText(content);
  };

  if (!visible) return null;

  // ✅ NO markdown conversion — raw HTML only
  const html = content;

  const iframeDoc = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body{
  font-family: system-ui, sans-serif;
  padding:24px;
  background:#111827;
  color:#e5e7eb;
  line-height:1.7;
}
pre{
  background:#1f2937;
  padding:16px;
  border-radius:8px;
  overflow:auto;
}
code{
  background:#1f2937;
  padding:3px 6px;
  border-radius:4px;
}
table{
  border-collapse: collapse;
}
td,th{
  border:1px solid #374151;
  padding:6px 10px;
}
a {
  color: #60a5fa;
}
</style>
</head>
<body>
${html}
</body>
</html>
`;

  return (
    <div
      onClick={() => window.dispatchEvent(new Event("closeHtmlPopup"))}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "720px",
          maxHeight: "80vh",
          background: "#111827",
          borderRadius: "12px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <button
          onClick={copyContent}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "#1f2937",
            border: "1px solid #374151",
            color: "#e5e7eb",
            padding: "6px 10px",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Copy
        </button>

        <iframe
          sandbox=""
          srcDoc={iframeDoc}
          style={{
            width: "100%",
            height: "80vh",
            border: "none",
          }}
        />
      </div>
    </div>
  );
}
