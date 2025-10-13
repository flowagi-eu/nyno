// src/pages/flow.jsx
import React, { useCallback } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";

export default function FlowPage() {
  // initial nodes and edges
  const initialNodes = [
    { id: "1", position: { x: 0, y: 0 }, data: { label: "Start" }, type: "input" },
    { id: "2", position: { x: 200, y: 100 }, data: { label: "Process" } },
    { id: "3", position: { x: 400, y: 0 }, data: { label: "End" }, type: "output" },
  ];
  const initialEdges = [{ id: "e1-2", source: "1", target: "2" }];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <h2 style={{ position: "absolute", zIndex: 10, padding: "0.5rem" }}>
        Simple React Flow Demo
      </h2>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}

