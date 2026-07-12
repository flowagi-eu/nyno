import { useEffect, useState } from "react";

export default function DynamicListForm() {
  const [items, setItems] = useState([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleShow = (event) => {
      setItems(event.detail || []);
      setVisible(true);
    };

    const handleClose = () => {
      setVisible(false);
      setItems([]);
    };

    window.addEventListener("showDynamicListForm", handleShow);
    window.addEventListener("closeDynamicListForm", handleClose);

    return () => {
      window.removeEventListener("showDynamicListForm", handleShow);
      window.removeEventListener("closeDynamicListForm", handleClose);
    };
  }, []);

  const handleInputChange = (index, key, value) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [key]: value };
    setItems(updatedItems);
  };



  if (!visible) return null;

  return (
    <div
      onClick={() => window.dispatchEvent(new Event("closeDynamicListForm"))}
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
          overflow: "auto",
          padding: "24px",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {items.map((item, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                padding: "12px",
                background: "#1f2937",
                borderRadius: "8px",
                position: "relative",
              }}
            >
              {Object.keys(item).map((key) => (
                <div key={key} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label
                    htmlFor={`${index}-${key}`}
                    style={{ color: "#9ca3af", fontSize: "12px" }}
                  >
                    {key}
                  </label>
                  <input
                    id={`${index}-${key}`}
                    type="text"
                    value={JSON.stringify(item[key] ?? {})}
                    onChange={(e) => handleInputChange(index, key, e.target.value)}
                    className={key}
                    style={{
                      padding: "8px",
                      background: "#111827",
                      border: "1px solid #374151",
                      borderRadius: "4px",
                      color: "#e5e7eb",
                    }}
                  />
                </div>
              ))}
              {Object.keys(item).length === 0 && (
                <div style={{ color: "#6b7280", fontSize: "12px" }}>
                  No fields yet. Add a key to this item.
                </div>
              )}
            </div>
          ))}
          {items.length === 0 && (
            <div style={{ color: "#6b7280", textAlign: "center", padding: "20px" }}>
              No items yet. Click "Add Item" to start.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
