import React, { useState } from "react";

// Style rules: components are always default exportable
import TemplateSelect from "@/components/node/TemplateSelect.jsx";

export default function NodeModal({
  node,
  onClose,
  updateNodeData,
  templates,
  visuals,
  removeNode
}) {

  if (!node) return null;

   


 let filteredTemplates = templates;

  if (node.type === "inputNode") {
    filteredTemplates = Object.fromEntries(
      Object.entries(templates).filter(([key]) =>
        key.startsWith("gui-input") || (key.includes('-file') && key.includes('read')) || (key.includes('-sql') && key.includes('read'))
      )
    );
  } else if (node.type === "outputNode") {
    filteredTemplates = Object.fromEntries(
      Object.entries(templates).filter(([key]) =>
        key.startsWith("gui-output") || (key.includes('-file') && key.includes('write')) || (key.includes('-sql') && key.includes('insert'))
      )
    );
  } else {
    filteredTemplates = Object.fromEntries(
      Object.entries(templates).filter(([key]) =>
        !key.startsWith("gui-")
      )
    );
  }



  const [selectedTemplate, setSelectedTemplate] = useState("");

  const handleFieldChange = (updates) => {
    console.log(JSON.stringify({
      t: "handleFieldChange",
      d: {updates, node}
    }));

    updateNodeData(node.id, {
      ...updates
      })
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.5)",
          zIndex: 1000,
        }}
      />

      <div
      className='dialog_content'
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          padding: 20,
          borderRadius: 8,
          width: 400,
          zIndex: 1001,
        }}
      >
        <button
          onClick={onClose}
          style={{
            display: "none",
            float: "right",
            cursor: "pointer",
          }}
        >
          ✕
        </button>


<div>

<input class="nodeTitle"
value={node.data?.label || ""}
            onChange={(e) =>
              updateNodeData(node.id, {
                label: e.target.value,
              })
            }
             style={{
    width: "100%",
    marginBottom: "0.5rem",
    fontSize: "24px",
    color: "white",
    border: "medium",
    paddingLeft: '3px',
  }}
   type="text" />
          
        </div>

        <TemplateSelect
          templates={filteredTemplates}
          visuals={visuals}
          value={selectedTemplate}
          onSelect={(templateKey) => {
            setSelectedTemplate(templateKey);

            const templateYaml = templates[templateKey] || "";
            const visual = visuals[templateKey] || {};

            handleFieldChange({
              info: templateYaml,
              emoji: visual.emoji ?? "⚙️",
              icon: visual.icon ?? null,
              label: (visual.label || templateKey).replace(
                /[🟢🔵🟣]/g,
                ""
              ),
            });
          }}
        />

        

        <div>

        <textarea value={node.data?.info || ""}
            onChange={(e) =>
              updateNodeData(node.id, {
                info: e.target.value,
              })
            } spellcheck="false" 
            style={{
  width: "100%",
  height: "240px",
}}
></textarea>

        </div>


        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
                    <button onClick={removeNode} style={{ padding: "0.5rem 1rem", background: "none", border:"none", color: "white", borderRadius: "4px" }}>Delete Node</button>
                    <button onClick={onClose}  style={{ padding: "0.5rem 1rem" }}>Close</button>
                  </div>


      </div>
    </>
  );
}