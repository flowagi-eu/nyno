import React, { useEffect, useState } from "react";
import YAML from "js-yaml";

const emptyTool = () => ({
  name: "",
  description: "",
  fields: [],
});

const emptyField = () => ({
  name: "",
  description: "",
  type: "string",
  enum: "",
});

export default function App() {
  const [tools, setTools] = useState([]);
  const [yamlText, setYamlText] = useState("");

  // --- Build YAML live
  useEffect(() => {
    const yamlObj = {
      nyno: "5.3",
      tools: tools.map((t) => ({
        name: t.name.toLowerCase().replaceAll(' ','-'),
        description: t.description,
        input_schema: Object.fromEntries(
          t.fields
            .filter((f) => f.name)
            .map((f) => [
              f.name,
              {
                description: f.description || undefined,
                type: f.type,
                ...(f.type === "array" ? { items: "string" } : {}),
                ...(f.enum
                  ? { enum: f.enum.split(",").map((e) => e.trim()) }
                  : {}),
              },
            ])
        ),
      })),
    };

    setYamlText(YAML.dump(yamlObj, { noRefs: true }));
  }, [tools]);

  // --- Import YAML
  const importYaml = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = YAML.load(e.target.result);
        if (!parsed?.tools) return alert("Invalid schema");

        setTools(
          parsed.tools.map((t) => ({
            name: t.name || "",
            description: t.description || "",
            fields: Object.entries(t.input_schema || {}).map(([k, v]) => ({
              name: k,
              description: v.description || "",
              type: v.type || "string",
              enum: v.enum ? v.enum.join(",") : "",
            })),
          }))
        );
      } catch {
        alert("Failed to parse YAML");
      }
    };
    reader.readAsText(file);
  };

  // --- Download
  const download = () => {
    const blob = new Blob([yamlText], { type: "application/x-yaml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "data.nynoagent";
    a.click();
  };

  return (
    <div className="page-nynoagent" style={styles.page}>
      <h2>Create Your .nynoagent</h2>

      <div style={styles.actions}>
        <button onClick={() => setTools([...tools, emptyTool()])}>
          ➕ Add Tool
        </button>
        <button onClick={download}>⬇️ Download</button>
        <input
          type="file"
          accept=".nynoagent"
          onChange={(e) => importYaml(e.target.files[0])}
        />
      </div>

      <div style={styles.content}>
        <div style={styles.editor}>
          {tools.map((tool, ti) => (
            <div key={ti} style={styles.tool}>
              <input
                placeholder="Intent name (ex. send email)"
                value={tool.name}
                onChange={(e) =>
                  setTools(
                    tools.map((t, i) =>
                      i === ti ? { ...t, name: e.target.value } : t
                    )
                  )
                }
              />
              <input
                placeholder="intent description"
                value={tool.description}
                onChange={(e) =>
                  setTools(
                    tools.map((t, i) =>
                      i === ti ? { ...t, description: e.target.value } : t
                    )
                  )
                }
              />

              <div style={styles.fields}>
                {tool.fields.map((f, fi) => (
                  <div key={fi} style={styles.field}>
                    <input
                      placeholder="variable name"
                      value={f.name}
                      onChange={(e) => {
                        const next = [...tools];
                        next[ti].fields[fi].name = e.target.value;
                        setTools(next);
                      }}
                    />
                    <input
                      placeholder="describe value to generate"
                      value={f.description}
                      onChange={(e) => {
                        const next = [...tools];
                        next[ti].fields[fi].description = e.target.value;
                        setTools(next);
                      }}
                    />
                    <select
                      value={f.type}
                      onChange={(e) => {
                        const next = [...tools];
                        next[ti].fields[fi].type = e.target.value;
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
                        const next = [...tools];
                        next[ti].fields[fi].enum = e.target.value;
                        setTools(next);
                      }}
                    />
                    <button
                      onClick={() => {
                        const next = [...tools];
                        next[ti].fields.splice(fi, 1);
                        setTools(next);
                      }}
                    >
                      ❌
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => {
                    const next = [...tools];
                    next[ti].fields.push(emptyField());
                    setTools(next);
                  }}
                >
                  ➕ Add Variable
                </button>
              </div>

              <button
                onClick={() =>
                  setTools(tools.filter((_, i) => i !== ti))
                }
              >
                Remove Tool
              </button>
            </div>
          ))}
        </div>

        <textarea
          style={styles.output}
          value={yamlText}
          readOnly
        />
      </div>
    </div>
  );
}

const styles = {
  page: {
    fontFamily: "sans-serif",
    padding: 20,
  },
  actions: {
    display: "flex",
    gap: 10,
    marginBottom: 15,
  },
  content: {
    display: "flex",
    gap: 15,
  },
  editor: {
    flex: 1,
  },
  tool: {
    border: "1px solid #ccc",
    padding: 10,
    marginBottom: 10,
  },
  fields: {
    marginLeft: 15,
    marginTop: 10,
  },
  field: {
    display: "flex",
    gap: 5,
    marginBottom: 5,
    flexWrap: "wrap",
  },
  output: {
    flex: 1,
    height: "80vh",
    fontFamily: "monospace",
        display: "none",

  },
};

