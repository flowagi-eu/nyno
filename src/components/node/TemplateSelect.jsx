import React, { useMemo, useState, useRef, useEffect } from "react";

export default function TemplateSelect({
  templates,
  visuals = {},
    value,
  onSelect,
}) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const itemRefs = useRef([]);

  // Keep input in sync with parent value
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Multi-word search (order independent)
  const filteredKeys = useMemo(() => {
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    return Object.keys(templates) .sort((a, b) => {
    const aParts = a.split("-");
    const bParts = b.split("-");

    // First word alphabetically
    const first = aParts[0].localeCompare(bParts[0], undefined, {
      sensitivity: "base",
    });
    if (first !== 0) return first;

    // Shorter (fewer words) first
    if (aParts.length !== bParts.length) {
      return aParts.length - bParts.length;
    }

    // Finally full alphabetical
    return a.localeCompare(b, undefined, {
      sensitivity: "base",
    });
  }).filter((key) => {
    const label = visuals[key]?.label || "";
    const haystack = `${key} ${label}`.toLowerCase(); // 👈 combine

    return words.every((w) => haystack.includes(w));
  });
  
  }, [query, templates,visuals]);

  // Reset active index when list changes
  useEffect(() => {
    setActiveIndex(filteredKeys.length > 0 ? 0 : -1);
  }, [filteredKeys]);

  const handleSelect = (key) => {
    setQuery(key);
    setOpen(false);
    setActiveIndex(-1);
    onSelect(key);
  };

  const handleKeyDown = (e) => {
    // Open dropdown on arrow keys if closed
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setOpen(true);
      return;
    }

    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) =>
        Math.min(i + 1, filteredKeys.length - 1)
      );
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredKeys[activeIndex]) {
        handleSelect(filteredKeys[activeIndex]);
      }
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0) {
      itemRefs.current[activeIndex]?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [activeIndex]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Input + dropdown arrow */}
      <div style={{ display: "flex" }}>
        <input
          ref={inputRef}
          value={query}
          placeholder="Change node to…"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            background: "black",
            color: "white",
            border: "none",
            padding: "9px",
            fontSize: "1rem",
            boxShadow: "none",
            outline: "none",
          }}
        />

        <button
          type="button"
          onClick={() => {
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
          style={{
            background: "black",
            color: "white",
            border: "none",
            padding: "0 10px",
            cursor: "pointer",
            margin: 0,
          }}
        >
          ▾
        </button>
      </div>

      {/* Dropdown */}
      {open && filteredKeys.length > 0 && (
        <div
          onMouseDown={() => inputRef.current?.focus()}
          style={{
            position: "absolute",
            zIndex: 100,
            width: "100%",
            background: "#111",
            borderRadius: 4,
            marginTop: 4,
            maxHeight: 200,
            overflowY: "auto",
            boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
          }}
        >
          {filteredKeys.map((key, index) => (
            <div
              key={key}
              ref={(el) => (itemRefs.current[index] = el)}
              onClick={() => handleSelect(key)}
              onMouseDown={(e) => e.preventDefault()}
              style={{
                padding: "8px 10px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                background:
                  index === activeIndex ? "#222" : "transparent",
              }}
            >
              
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
  {visuals[key]?.icon ? (
    <img
      src={visuals[key].icon}
      alt=""
      style={{ width: 16, height: 16, objectFit: "contain" }}
    />
  ) : (
    <span>{visuals[key]?.emoji || "⚙️"}</span>
  )}

  <div style={{ display: "flex", flexDirection: "column" }}>
    <span style={{ fontSize: 13, opacity: 0.6 }}>
      {key}
    </span>
    <span style={{ fontSize: 10 }}>
      {visuals[key]?.label || key}
    </span>
  </div>
</div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
