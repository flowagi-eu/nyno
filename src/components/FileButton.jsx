import { useRef } from "react";

export default function FileButton({ onFile }) {
  const inputRef = useRef(null);

  return (
    <>
      <input
        type="file"
        accept=".nyno"
        ref={inputRef}
        onChange={onFile}
        style={{ display: "none" }}
      />

      <button onClick={() => inputRef.current.click()}>
        Import .nyno
      </button>
    </>
  );
}

