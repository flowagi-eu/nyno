import { useEffect, useState } from "react";

export default function FileUploadPopup() {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState("");
  const [statusColor, setStatusColor] = useState("black"); // For message color

  useEffect(() => {
    const interval = setInterval(() => {
      if (window.SHOW_FILE_UPLOAD_POPUP === true) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setStatus(`Reading ${file.name}...`);
    setStatusColor("black");

    const reader = new FileReader();

    reader.onload = () => {
      window.LAST_FILE = reader.result.split(",")[1];
      console.log(
        "Base64 stored in window.LAST_FILE",
        window.LAST_FILE.slice(0, 50) + "..."
      );

      // Show green success message
      setStatus(`Uploaded Successfully: ${file.name}`);
      setStatusColor("green");

      // Close popup after 2 seconds
      setTimeout(() => {
        window.SHOW_FILE_UPLOAD_POPUP = false;
        setVisible(false);
        setStatus(""); // reset status
      }, 2000);
    };

    reader.onerror = () => {
      setStatus("Error reading file");
      setStatusColor("red");
      console.error(reader.error);
    };

    reader.readAsDataURL(file);
  };

  if (!visible) return null;

  return (
    <div
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
          padding: "20px",
          borderRadius: "8px",
          width: "300px",
          textAlign: "center",
        }}
      >
        <h2>Upload a File</h2>
        <input type="file" onChange={handleFileChange} />
        <p style={{ color: statusColor }}>{status}</p>
      </div>
    </div>
  );
}
