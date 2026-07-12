import { useEffect, useRef, useState } from "react";

export default function AudioPlayerPopup() {
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");

  const audioCtxRef = useRef(null);
  const bufferRef = useRef(null);
  const sourceRef = useRef(null);

  const lastAudioKey = useRef(null);

  // ---------------------------
  // POLLING
  // ---------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      const shouldShow = window.SHOW_AUDIO_PLAYER_POPUP === true;
      setVisible(shouldShow);

      if (!shouldShow) return;

      const audioData = window.LAST_AUDIO_TO_PLAY;
      if (!audioData) return;

      const base64 =
        typeof audioData === "object" ? audioData.base64 : audioData;

      if (!base64) return;

      const key = base64.slice(0, 60);
      if (lastAudioKey.current === key) return;

      lastAudioKey.current = key;

      loadAudio(base64, audioData?.mime || "audio/mpeg");
    }, 150);

    return () => clearInterval(interval);
  }, []);

  // ---------------------------
  // LOAD AUDIO
  // ---------------------------
  const loadAudio = async (base64, mime) => {
    try {
      stopSource();

      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext ||
          window.webkitAudioContext)();
      }

      const ctx = audioCtxRef.current;

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const binary = atob(base64);
      const bytes = new Uint8Array([...binary].map(c => c.charCodeAt(0)));

      const blob = new Blob([bytes], { type: mime });
      const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());

      bufferRef.current = buffer;

      setError("");

      // 🔥 AUTOPLAY ON LOAD
      play();
    } catch (e) {
      console.error(e);
      setError("Failed to load audio");
    }
  };

  // ---------------------------
  // PLAY / REPLAY
  // ---------------------------
  const play = () => {
    if (!bufferRef.current || !audioCtxRef.current) return;

    const ctx = audioCtxRef.current;

    stopSource();

    const source = ctx.createBufferSource();
    source.buffer = bufferRef.current;
    source.connect(ctx.destination);

    source.start(0);

    source.onended = () => {
      sourceRef.current = null;
    };

    sourceRef.current = source;
  };

  // ---------------------------
  // STOP CURRENT SOURCE ONLY
  // ---------------------------
  const stopSource = () => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {}
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
  };

  // ---------------------------
  // CLOSE
  // ---------------------------
  const close = () => {
    window.SHOW_AUDIO_PLAYER_POPUP = false;
    stopSource();
    setVisible(false);
    setError("");
  };

  if (!visible) return null;

  return (
    <div className="plwe_overlay">
      <div className="plwe_modal">
        <h2 className="plwe_title">Audio Message</h2>

        {error && <div className="plwe_error">{error}</div>}

        <button className="plwe_playButton" onClick={play}>
          ▶ Play
        </button>

        <button className="plwe_closeButton" onClick={close}>
          Close
        </button>
      </div>
    </div>
  );
}
