// src/pages/flow.jsx
import React, { useCallback, useState } from "react";
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
  const initialNodes = [
    { id: "1", position: { x: 0, y: 0 }, data: { label: "Start", info: "entry point" }, type: "input" },
    { id: "2", position: { x: 200, y: 100 }, data: { label: "Process", info: "does something" } },
    { id: "3", position: { x: 400, y: 0 }, data: { label: "End", info: "finish" }, type: "output" },
  ];
  const initialEdges = [{ id: "e1-2", source: "1", target: "2" }];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const onNodeClick = (_, node) => {
    setSelectedNode(node);
    setIsOpen(true);
  };

  const onEdgeDoubleClick = (_, edge) => {
    // remove the double-clicked edge
    setEdges((eds) => eds.filter((e) => e.id !== edge.id));
  };

  const handleFieldChange = (field, value) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id
          ? { ...n, data: { ...n.data, [field]: value } }
          : n
      )
    );
    setSelectedNode((prev) => ({ ...prev, data: { ...prev.data, [field]: value } }));
  };

  const addNode = () => {
    const id = (nodes.length + 1).toString();
    const newNode = {
      id,
      position: { x: 50 * nodes.length, y: 50 * nodes.length },
      data: { label: `Node ${id}`, info: "" },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const removeNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
    setIsOpen(false);
  };

  const exportJSON = () => {
    const data = { nodes, edges };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
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
        if (data.nodes && data.edges) {
          setNodes(data.nodes);
          setEdges(data.edges);
        } else {
          alert("Invalid flow JSON");
        }
      } catch (err) {
        alert("Error parsing JSON");
      }
    };
    reader.readAsText(file);
  };

  return (
    <ReactFlowProvider>
      <div style={{ width: "100%", height: "100vh" }}>
        <h2 style={{ position: "absolute", zIndex: 10, padding: "0.5rem" }}>
          Flow + Node Info Popup
        </h2>

        <div style={{ position: "absolute", top: 50, left: 10, zIndex: 20 }}>
          <button onClick={addNode} style={{ marginRight: 5 }}>Add Node</button>
          <button onClick={removeNode} style={{ marginRight: 5 }}>Remove Node</button>
          <button onClick={exportJSON} style={{ marginRight: 5 }}>Export JSON</button>
          <input type="file" onChange={importJSON} />
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeDoubleClick={onEdgeDoubleClick} // 🆕 double-click to remove edge
          fitView
        >
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>

        {/* Dialog for node info */}
        <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
          <Dialog.Portal>
            <Dialog.Overlay
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.3)",
              }}
            />
            <Dialog.Content
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
                  <Dialog.Title>Edit Node: {selectedNode.data.label}</Dialog.Title>
                  <div style={{ marginTop: "1rem" }}>
                    <label>Label</label>
                    <input
                      type="text"
                      value={selectedNode.data.label}
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

