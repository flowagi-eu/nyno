import React, { useEffect, useRef, useState } from "react";
import YAML from "js-yaml";

const emptyTool = () => ({
  name: "",
  description: "",
  input_schema: {}, // ✅ object, not array
});

const emptyField = () => ({
  description: "",
  type: "string",
  enum: "",
});

export default function NynoAgentBuilder({
  value = [],
  onChange,
  hideYaml = false,
}) {
  const [tools, setTools] = useState(value);
  const [yamlText, setYamlText] = useState("");

  // 🔒 tells us "this update came from props, don't emit"
  const syncingFromPropsRef = useRef(false);

  // --- sync tools from parent
  useEffect(() => {
    if (JSON.stringify(value) !== JSON.stringify(tools)) {
      syncingFromPropsRef.current = true;
      setTools(value || []);
    }
  }, [value]);

  // --- Build YAML live
  useEffect(() => {
    const yamlObj = {
      nyno: "5.3",
      tools: tools.map((t) => ({
        name: t.name.toLowerCase().replaceAll(" ", "-"),
        description: t.description,
        input_schema: Object.fromEntries(
  Object.entries(t.input_schema).map(([key, f]) => {
    const enumValues = f.enum
      ?.split(",")
      .map(e => e.trim())
      .filter(Boolean); // 🚀 removes empty strings

    return [
      key,
      {
        description: f.description || undefined,
        type: f.type,
        ...(f.type === "array" ? { items: "string" } : {}),
        ...(enumValues?.length ? { enum: enumValues } : {}),
      },
    ];
  })
),
      })),
    };

    const yaml = YAML.dump(yamlObj, { noRefs: true });
    setYamlText(yaml);

    if (syncingFromPropsRef.current) {
      syncingFromPropsRef.current = false;
      return;
    }

    onChange?.(yaml, tools);
  }, [tools, onChange]);

  return (
    <div style={styles.page}>
      <div style={styles.actions}>
        <button onClick={() => setTools([...tools, emptyTool()])}>
          ➕ Add Tool
        </button>
      </div>

      <div style={styles.content}>
        <div style={styles.editor}>
          {tools.map((tool, ti) => (
            <div key={ti} style={styles.tool}>
              <label>Tool name</label>
              <input
                placeholder="Tool name"
                value={tool.name}
                onChange={(e) =>
                  setTools(
                    tools.map((t, i) =>
                      i === ti ? { ...t, name: e.target.value } : t
                    )
                  )
                }
              />

              <label>Tool Intent</label>
              <input
                placeholder="Describe Intent"
                value={tool.description}
                onChange={(e) =>
                  setTools(
                    tools.map((t, i) =>
                      i === ti ? { ...t, description: e.target.value } : t
                    )
                  )
                }
              />

              <div style={styles.input_schema}>
                {Object.entries(tool.input_schema).map(([key, f]) => (
                  <div key={key} style={styles.field}>
                    <label>variable</label>
                    <input
                      placeholder="variable name"
                      value={key}
                      onChange={(e) => {
                        const nextKey = e.target.value;
                        if (!nextKey || tool.input_schema[nextKey]) return;

                        const next = structuredClone(tools);
                        const value = next[ti].input_schema[key];
                        delete next[ti].input_schema[key];
                        next[ti].input_schema[nextKey] = value;
                        setTools(next);
                      }}
                    />

                    <label>value to generate</label>
                    <input
                      placeholder="description"
                      value={f.description}
                      onChange={(e) => {
                        const next = structuredClone(tools);
                        next[ti].input_schema[key].description =
                          e.target.value;
                        setTools(next);
                      }}
                    />

                    <label>type</label>
                    <select
                      value={f.type}
                      onChange={(e) => {
                        const next = structuredClone(tools);
                        next[ti].input_schema[key].type = e.target.value;
                        setTools(next);
                      }}
                    >
                      <option value="string">string</option>
                      <option value="number">number</option>
                      <option value="array">array</option>
                    </select>

                    <input
                      placeholder="enum a,b,c"
                      value={f.enum}
                      onChange={(e) => {
                        const next = structuredClone(tools);
                        next[ti].input_schema[key].enum = e.target.value;
                        setTools(next);
                      }}
                    />

                    <button
                      onClick={() => {
                        const next = structuredClone(tools);
                        delete next[ti].input_schema[key];
                        setTools(next);
                      }}
                    >
                      ❌
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => {
                    const next = structuredClone(tools);

                    let base = "var";
                    let i = 1;
                    while (next[ti].input_schema[`${base}${i}`]) i++;

                    next[ti].input_schema[`${base}${i}`] = emptyField();
                    setTools(next);
                  }}
                >
                  ➕ Add Variable
                </button>
              </div>

              <button
                onClick={() => setTools(tools.filter((_, i) => i !== ti))}
              >
                Remove Tool
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { fontFamily: "sans-serif", padding: 20 },
  actions: { display: "flex", gap: 10, marginBottom: 15 },
  content: { display: "flex", gap: 15 },
  editor: { flex: 1 },
  tool: { border: "1px solid #ccc", padding: 10, marginBottom: 10 },
  input_schema: { marginLeft: 15, marginTop: 10 },
  field: { display: "block", gap: 5, marginBottom: 5 },
};
