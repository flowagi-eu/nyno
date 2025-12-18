import React from "react";

export function SimpleOutputToggle({ value, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      Simple Output
    </label>
  );
}
