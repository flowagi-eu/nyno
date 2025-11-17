// src/pages/flow.jsx
import extensions from "@/extension-data.json";
import { YamlFormToggle } from "@/components/YamlFormToggle";

// --- Template imports (as plain text)
import YAML from 'js-yaml';

import React, { useCallback, useState, useEffect } from "react";
import ReactFlow, {
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from "reactflow";
import * as Dialog from "@radix-ui/react-dialog";
import "reactflow/dist/style.css";

export default function FlowPage() {
  const keywordEmojis = { route: "🌐" }; // , db: "🗄️", email: "✉️", log: "📜", api: "🔗"

  const initialNodes = [
    {
      id: "1",
      position: { x: 0, y: 0 },
      data: { label: "route /test_nyno", rawLabel: "route /test_nyno", info: "", args: [] },
      type: "input",
    },
  ];

  const initialEdges = [];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  // --- Templates for textarea
const templates = {
};

const emojis = {};

// --- Get existing extensions

for (const [folder, { yaml, emoji }] of Object.entries(extensions)) {
  if (!yaml) continue; // skip empty entries
  const command = folder.toLowerCase().replace(/\s+/g, "-");
  templates[folder] = yaml; // set yaml in templates

  if(emoji){
    emojis[folder] = emoji;
  }
}

  // --- Undo history
  const [history, setHistory] = useState([{ nodes: initialNodes, edges: initialEdges }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const pushHistory = (newNodes, newEdges) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: newNodes, edges: newEdges });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const prevIndex = historyIndex - 1;
    setNodes(history[prevIndex].nodes);
    setEdges(history[prevIndex].edges);
    setHistoryIndex(prevIndex);
  }, [history, historyIndex, setNodes, setEdges]);

  useEffect(() => {
    const listener = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [handleUndo]);

  const onConnect = useCallback(
    (connection) => {
      const updatedEdges = addEdge(connection, edges);
      setEdges(updatedEdges);
      pushHistory(nodes, updatedEdges);
    },
    [edges, nodes]
  );

  const onNodeClick = (_, node) => {
    setSelectedNode(node);
    setIsOpen(true);
  };

  const onEdgeDoubleClick = (_, edge) => {
    const newEdges = edges.filter((e) => e.id !== edge.id);
    setEdges(newEdges);
    pushHistory(nodes, newEdges);
  };

  const handleFieldChange = (field, value) => {
    const updatedNodes = nodes.map((n) =>
      n.id === selectedNode.id
        ? {
            ...n,
            data: {
              ...n.data,
              [field]: value,
              ...(field === "label" ? { rawLabel: value } : {}),
            },
          }
        : n
    );
    setNodes(updatedNodes);
    setSelectedNode((prev) => ({
      ...prev,
      data: { ...prev.data, [field]: value, ...(field === "label" ? { rawLabel: value } : {}) },
    }));
    pushHistory(updatedNodes, edges);
  };

  const addNode = () => {
    const id = (nodes.length + 1).toString();
    const newNode = {
      id,
      position: { x: 50 * nodes.length, y: 50 * nodes.length },
      data: { label: `node ${id}`, rawLabel: `node ${id}`, info: "", args: [] },
    };
    const newNodes = [...nodes, newNode];
    setNodes(newNodes);
    pushHistory(newNodes, edges);
  };

  const removeNode = () => {
    if (!selectedNode) return;
    const newNodes = nodes.filter((n) => n.id !== selectedNode.id);
    const newEdges = edges.filter(
      (e) => e.source !== selectedNode.id && e.target !== selectedNode.id
    );
    setNodes(newNodes);
    setEdges(newEdges);
    setSelectedNode(null);
    setIsOpen(false);
    pushHistory(newNodes, newEdges);
  };

const exportYAML = () => {
  // --- Prepare guidata first
  const guidataNodes = nodes.map((n) => ({
    id: n.id,
    func:
      typeof n.data.rawLabel === "string"
        ? n.data.rawLabel
        : "node",
    info: n.data.info || "",
    next: edges.filter((e) => e.source === n.id).map((e) => e.target),
    position: n.position,
    type: n.type || null,
  }));

  const guidata = { nodes: guidataNodes, edges };

  // --- Build workflow using guidata
  const workflow = [];

  guidata.nodes.forEach((node) => {
    if (!node.info) return;

    try {
      const parsedInfo = YAML.load(node.info);

      let steps = [];

      if (Array.isArray(parsedInfo)) {
        steps = parsedInfo;
      } else if (parsedInfo && typeof parsedInfo === "object") {
        steps = Object.entries(parsedInfo).map(([stepName, stepData]) => ({
          step: stepName,
          args: stepData?.args || [],
        }));
      }

      steps.forEach((step) => {
        workflow.push({
          id: parseInt(node.id),
          step: step.step,
          args: step.args || [],
          next: node.next.map((x) => parseInt(x)),
        });
      });
    } catch (err) {
      console.warn("Failed to parse node info YAML for node", node.id, err);
    }
  });

  // --- Extract first node's route if present
  let firstNodeRoute = null;
  const firstNodeLabel = nodes[0]?.data?.rawLabel || "";
  if (firstNodeLabel.toLowerCase().startsWith("route")) {
    firstNodeRoute = firstNodeLabel.replace(/^route\s*/i, "").trim();
  }

  // --- Dump YAML: workflow first, then route, then guidata
  let yamlStr = YAML.dump({ workflow }, { noRefs: true, flowLevel: -1 });

  if (firstNodeRoute) {
    yamlStr += `route: ${firstNodeRoute}\n`;
  }

  yamlStr += `guidata: '${JSON.stringify(guidata)}'\n`;

  // --- Trigger download
  const blob = new Blob([yamlStr], { type: "application/x-yaml" });
  const a = document.createElement("a");
  let firstNodeCleanTitle = firstNodeRoute
    ? firstNodeRoute.replace(/[\/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_")
    : "export";
    firstNodeCleanTitle = firstNodeCleanTitle.replace(/^_+/, ""); // replace prefix _
  a.href = URL.createObjectURL(blob);
  a.download = firstNodeCleanTitle + ".nyno";
  a.click();
};





const clearAll = () => {
  setNodes([]);
  setEdges([]);
  setSelectedNode(null);
  setIsOpen(false);
  pushHistory([], []);
};



  // --- Import YAML including guidata
const importYAML = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      // Parse full YAML
      const yamlContent = YAML.load(evt.target.result);

      if (!yamlContent?.guidata) return alert("Invalid YAML: missing guidata");

      // Parse guidata JSON string
      const guidata = JSON.parse(yamlContent.guidata);
      if (!guidata.nodes || !guidata.edges)
        return alert("Invalid guidata format");

      // Map nodes
      const importedNodes = guidata.nodes.map((n) => ({
        id: n.id,
        position: n.position || { x: 50 * parseInt(n.id), y: 50 * parseInt(n.id) },
        data: {
          label: n.func || `node ${n.id}`,
          rawLabel: n.func || `node ${n.id}`,
          info: n.info || "",
          args: n.args || [],
        },
        type: n.type || undefined,
      }));

      // Restore nodes and edges
      setNodes(importedNodes);
      setEdges(guidata.edges);
      pushHistory(importedNodes, guidata.edges);
    } catch (err) {
      console.error(err);
      alert("Error parsing YAML");
    } finally {
      // ✅ Clear the file input
      e.target.value = "";
    }
  };
  reader.readAsText(file);
};



const handleDialogKeyDown = (e) => {
  // Do nothing if user is typing in a textarea
  if (e.key === "Enter" && document.activeElement?.tagName !== "TEXTAREA") {
    e.preventDefault();
    setIsOpen(false);
  }
};



  // --- Render label for UI (emoji + clean text)
  const renderLabel = (rawLabel) => {
    if (typeof rawLabel !== "string") return rawLabel;
    const lower = rawLabel.toLowerCase();
    const match = Object.keys(keywordEmojis).find(
      (k) => lower.startsWith(k) || lower.match(new RegExp(`\\b${k}`))
    );
    const emoji = match ? keywordEmojis[match] : null;
    if (emoji) {
      const cleaned = rawLabel
        .replace(new RegExp(`^${match}`, "i"), "")
        .replace(/^[_\s]+/, "")
        .trim();
      return (
        <div style={{ textAlign: "center" }}>
          <span style={{ display: "block", fontSize: "21px", marginBottom: "6px" }}>{emoji}</span>
          {cleaned || rawLabel}
        </div>
      );
    }
    return rawLabel;
  };

  const renderedNodes = nodes.map((n) => ({
    ...n,
    data: { ...n.data, label: renderLabel(n.data.rawLabel) },
  }));

  return (
    <ReactFlowProvider>
      <div style={{ width: "100%", height: "100vh" }}>
        <div style={{ position: "absolute", bottom: 9, right: 9, zIndex: 20 }}>
          
          <button onClick={addNode} style={{ marginRight: 5 }}>
            Add Node
          </button>
          <button onClick={exportYAML} style={{ marginRight: 5 }}>
            Export File
          </button>
          <button onClick={clearAll}>
    Clear All
  </button>
          <input type="file"  accept=".nyno"  onChange={importYAML} />

          

        </div>

        <ReactFlow
          nodes={renderedNodes}
          edges={edges}
          onNodesChange={(changes) => {
            onNodesChange(changes);
            pushHistory(nodes, edges);
          }}
          onEdgesChange={(changes) => {
            onEdgesChange(changes);
            pushHistory(nodes, edges);
          }}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeDoubleClick={onEdgeDoubleClick}
          onNodeDragStop={(_, node) => {
            const updatedNodes = nodes.map((n) =>
              n.id === node.id ? { ...n, position: node.position } : n
            );
            setNodes(updatedNodes);
            pushHistory(updatedNodes, edges);
          }}
          fitView
        >
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>

        <Dialog.Root className="dialog_root" open={isOpen} onOpenChange={setIsOpen}>
          <Dialog.Portal>
            <Dialog.Overlay
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)" }}
            />
           <Dialog.Content
  className="dialog_content"
  onKeyDown={handleDialogKeyDown}
  style={{
    background: "#171717",
    borderRadius: "8px",
    padding: "1rem 3rem",
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "300px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
  }}
>
  {selectedNode && (
    <>
      <div style={{ marginTop: "1rem" }}>
        <input
          type="text"
          value={selectedNode.data.rawLabel}
          onChange={(e) => handleFieldChange("label", e.target.value)}
          style={{
            width: "100%",
            marginBottom: "0.5rem",
            fontSize: "24px",
            background: "none",
            color: "white",
            border: "none",
          }}
        />
        <label>Template</label>
        <select
          onChange={(e) => handleFieldChange("info", templates[e.target.value] || "")}
          style={{ background:"black",color:"white","border":"none",width: "100%", marginBottom: "0.5rem", "padding":"9px","fontSize": "1rem" }}
        >
          {Object.keys(templates).map((t) => (
            <option key={t} value={t}>
              {emojis[t] || ""} {t || "None"}
            </option>
          ))}
        </select>

        <YamlFormToggle
          value={selectedNode.data.info}
          onChange={(val) => handleFieldChange("info", val)}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
        <button
          onClick={removeNode}
          style={{ padding: "0.5rem 1rem", background: "none", border:"none", color: "white", borderRadius: "4px" }}
        >
          Delete Node
        </button>

        <Dialog.Close asChild>
          <button style={{ padding: "0.5rem 1rem" }}>Close</button>
        </Dialog.Close>
      </div>
    </>
  )}
</Dialog.Content>

          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </ReactFlowProvider>
  );
}

