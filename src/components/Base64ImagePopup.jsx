import { useEffect, useState } from "react";

export default function Base64ImagePopup() {
  const [visible, setVisible] = useState(false);
  const [src, setSrc] = useState("");

  useEffect(() => {
    const handleShow = async (event) => {
      let value = event.detail;

      if (!value) return;

      try {
        // 1. If already base64 (very loose check)
        if (typeof value === "string" && value.length > 100 && !value.startsWith("http")) {
          setSrc(`data:image/*;base64,${value}`);
        } else {
          alert("Invalid base64");
        }

        setVisible(true);
      } catch (err) {
        console.error("Failed to load image:", err);
      }
    };

    const handleClose = () => {
      setVisible(false);
      setSrc("");
    };

    window.addEventListener("showImagePopup", handleShow);
    window.addEventListener("closeImagePopup", handleClose);

    return () => {
      window.removeEventListener("showImagePopup", handleShow);
      window.removeEventListener("closeImagePopup", handleClose);
    };
  }, []);

  if (!visible) return null;

  const iframeDoc = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body {
  margin:0;
  background:#111827;
  display:flex;
  justify-content:center;
  align-items:center;
  height:100vh;
}
img {
  width:100%;
  max-height:70dvh;
  object-fit:contain;
  display:block;
  margin:auto;
}
</style>
</head>
<body>
  <img src="${src}" />
</body>
</html>
`;

  return (
    <div
      onClick={() => window.dispatchEvent(new Event("closeImagePopup"))}
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
        }}
      >
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