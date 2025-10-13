// src/pages/flow.jsx
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
  const keywordEmojis = { route: "🌐", db: "🗄️", email: "✉️", log: "📜", api: "🔗" };

  const initialNodes = [
    {
      id: "1",
      position: { x: 0, y: 0 },
      data: { label: "route /test1", rawLabel: "route /test1", info: "HTTP route", args: [] },
      type: "input",
    },
  ];

  const initialEdges = [];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

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
    const newEdges = edges.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id);
    setNodes(newNodes);
    setEdges(newEdges);
    setSelectedNode(null);
    setIsOpen(false);
    pushHistory(newNodes, newEdges);
  };

  const exportJSON = () => {
    const phpNodes = nodes.map((n) => ({
      id: n.id,
      func: typeof n.data.rawLabel === "string" ? n.data.rawLabel.replace(/\s+/g, "_") : "node",
      args: n.data.args || [],
      next: edges.find((e) => e.source === n.id)?.target || null,
      position: n.position,
      type: n.type || null,
    }));
    const json = JSON.stringify({ nodes: phpNodes, edges }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "flow.json";
    a.click();
  };

  const importJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (!data.nodes || !data.edges) return alert("Invalid flow JSON");

        const importedNodes = data.nodes.map((n) => ({
          id: n.id,
          position: n.position || { x: 50 * parseInt(n.id), y: 50 * parseInt(n.id) },
          data: { label: n.func || `node ${n.id}`, rawLabel: n.func || `node ${n.id}`, info: n.data?.info || "", args: n.args || [] },
          type: n.type || undefined,
        }));

        setNodes(importedNodes);
        setEdges(data.edges);
        pushHistory(importedNodes, data.edges);
      } catch {
        alert("Error parsing JSON");
      }
    };
    reader.readAsText(file);
  };

  const handleDialogKeyDown = (e) => {
    if (e.key === "Enter") {
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
      // remove the keyword and any leading underscores/spaces
      const cleaned = rawLabel.replace(new RegExp(`^${match}`, "i"), "").replace(/^[_\s]+/, "");
      return (
        <div style={{ textAlign: "center" }}>
          <span style={{ display: "block", fontSize: "21px", marginBottom: "6px" }}>{emoji}</span>
          {cleaned || rawLabel} {/* fallback if text is empty */}
        </div>
      );
    }
    return rawLabel;
  };

  const renderedNodes = nodes.map((n) => ({ ...n, data: { ...n.data, label: renderLabel(n.data.rawLabel) } }));

  return (
    <ReactFlowProvider>
      <div style={{ width: "100%", height: "100vh" }}>
        <h2 style={{ position: "absolute", zIndex: 10, padding: "0.5rem" }}>Flow + Undo (Ctrl+Z)</h2>
        <div style={{ position: "absolute", top: 50, left: 10, zIndex: 20 }}>
          <button onClick={addNode} style={{ marginRight: 5 }}>Add Node</button>
          <button onClick={removeNode} style={{ marginRight: 5 }}>Remove Node</button>
          <button onClick={exportJSON} style={{ marginRight: 5 }}>Export JSON</button>
          <input type="file" onChange={importJSON} />
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
            const updatedNodes = nodes.map((n) => (n.id === node.id ? { ...n, position: node.position } : n));
            setNodes(updatedNodes);
            pushHistory(updatedNodes, edges);
          }}
          fitView
        >
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>
        <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
          <Dialog.Portal>
            <Dialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)" }} />
            <Dialog.Content
              onKeyDown={handleDialogKeyDown}
              style={{
                background: "white",
                borderRadius: "8px",
                padding: "1rem",
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
                  <Dialog.Title>Edit Node: {selectedNode.data.rawLabel}</Dialog.Title>
                  <div style={{ marginTop: "1rem" }}>
                    <label>Label</label>
                    <input
                      type="text"
                      value={selectedNode.data.rawLabel}
                      onChange={(e) => handleFieldChange("label", e.target.value)}
                      style={{ width: "100%", marginBottom: "0.5rem" }}
                    />
                    <label>Info</label>
                    <textarea
                      value={selectedNode.data.info}
                      onChange={(e) => handleFieldChange("info", e.target.value)}
                      style={{ width: "100%", height: "60px" }}
                    />
                  </div>
                  <div style={{ textAlign: "right", marginTop: "1rem" }}>
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

