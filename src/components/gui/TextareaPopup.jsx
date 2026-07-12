import { useEffect, useState } from "react";

export default function TextareaPopup() {
  const [visible, setVisible] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(window.SHOW_TEXTAREA_POPUP === true);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const handleSend = () => {
    if (!text.trim()) return;

    // Store text globally (similar to your file example)
    window.LAST_TEXT = text;

    setStatus("Sent ✅");

    // Optional: close popup after short delay
    setTimeout(() => {
      window.SHOW_TEXTAREA_POPUP = false;
      setVisible(false);
      setText("");
      setStatus("");
    }, 1000);
  };

  if (!visible) return null;

  return (
    <div
    className='popup-txt'
      style={{
        
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
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
          padding: "16px",
          borderRadius: "10px",
          width: "400px",
          position: "relative",
        }}
      >
        <h3 style={{ marginBottom: "10px", color: "white" }}>
          Enter your text
        </h3>

        {/* Textarea */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type something..."
          style={{
            width: "100%",
            height: "150px",
            resize: "none",
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #374151",
            outline: "none",
            background: "#0b1220",
            color: "white",
            boxSizing: "border-box",
          }}
        />

        {/* Send button (right center of textarea container) */}
        <button
          onClick={handleSend}
           style={{
    position: "absolute",
    top: "auto",
    height: "36px",
    borderRadius: "9px",
    border: "medium",
    cursor: "pointer",
    background: "rgb(37, 99, 235)",
    fontSize: "18px",
    bottom: "24px",
    right: "18px",
    textAlign: "center",
    fontWeight: 500,
    color: "black",
  }}
          title="Send"
        >
          →
        </button>

        {/* Status */}
        {status && (
          <p style={{ position:"absolute", bottom:0,left:0,right:0, marginTop: "10px", color: "lightgreen" }}>{status}</p>
        )}
      </div>
    </div>
  );
}