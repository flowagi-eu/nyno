import { useEffect, useRef, useState } from "react";

export default function VoiceRecorderPopup() {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState("");
  const [statusColor, setStatusColor] = useState("black");
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(window.SHOW_VOICE_POPUP === true);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });

        // Preview
        const url = URL.createObjectURL(blob);
        setAudioURL(url);

        // Convert to Base64
        const reader = new FileReader();
        reader.onloadend = () => {
          window.LAST_AUDIO = reader.result.split(",")[1];

          console.log(
            "Base64 audio stored:",
            window.LAST_AUDIO.slice(0, 50) + "..."
          );

          setStatus("Recording saved successfully");
          setStatusColor("green");
        };

        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      setRecording(true);
      setStatus("Recording...");
      setStatusColor("red");
    } catch (err) {
      console.error(err);
      setStatus("Microphone access denied");
      setStatusColor("red");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
    setTimeout(function(){
        window.SHOW_VOICE_POPUP = false;
        setVisible(false);
    },1000);
  };

  const closePopup = () => {
    window.SHOW_VOICE_POPUP = false;
    setVisible(false);
    setStatus("");
    setAudioURL(null);
  };

  if (!visible) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2>Record Voice</h2>

        {!recording ? (
          <button onClick={startRecording} style={buttonStyle}>
            🎤 Start Recording
          </button>
        ) : (
          <button onClick={stopRecording} style={stopButtonStyle}>
            ⏹ Stop Recording
          </button>
        )}

        {audioURL && (
          <audio controls style={{ marginTop: "10px" }}>
            <source src={audioURL} />
          </audio>
        )}

        <p style={{ color: statusColor }}>{status}</p>

        <button onClick={closePopup} style={closeStyle}>
          Close
        </button>
      </div>
    </div>
  );
}

const overlayStyle = {
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
};

const modalStyle = {
  background: "#111827",
  padding: "20px",
  borderRadius: "8px",
  width: "300px",
  textAlign: "center",
};

const buttonStyle = {
  padding: "10px",
  background: "green",
  color: "white",
  border: "none",
  borderRadius: "5px",
};

const stopButtonStyle = {
  padding: "10px",
  background: "red",
  color: "white",
  border: "none",
  borderRadius: "5px",
};

const closeStyle = {
  marginTop: "10px",
  padding: "8px",
};