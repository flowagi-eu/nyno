import { useState, useEffect } from "react";

/**
 * DynamicKeyValueEditor (very basic)
 *
 * Props:
 *  - value: object from parent component
 *  - onChange: function(updatedObject)
 */
export default function DynamicKeyValueEditor({ value = {}, onChange }) {
  const [rows, setRows] = useState(() => {
    const keys = Object.keys(value);
    return keys.length > 0
      ? keys.map((k) => ({ key: k, value: value[k] }))
      : [{ key: "key1", value: "" }];
  });

  // Push changes back to parent whenever rows change
  useEffect(() => {
    const result = {};
    rows.forEach((r) => {
      if (r.key) result[r.key] = r.value;
    });
    onChange && onChange(result);
  }, [rows, onChange]);

  const updateRow = (index, field, newValue) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, [field]: newValue } : row
      )
    );
  };

  const addRow = () => {
    setRows((prev) => [...prev, { key: "", value: "" }]);
  };

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      {rows.map((row, index) => (
        <div key={index}>
          <input
            placeholder="key"
            value={row.key}
            onChange={(e) => updateRow(index, "key", e.target.value)}
          />
          <input
            placeholder="value"
            value={row.value}
            onChange={(e) => updateRow(index, "value", e.target.value)}
          />
          <button onClick={() => removeRow(index)}>remove</button>
        </div>
      ))}

      <button onClick={addRow}>add</button>
    </div>
  );
}

