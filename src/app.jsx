// src/pages/flow.jsx
import extensions from "@/extension-data.json";
import { YamlFormToggle } from "@/components/YamlFormToggle";
import { RunButton } from "@/components/RunButton";
import { Position } from "reactflow";

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
  const keywordEmojis = { route: "🌐" };

  const initialNodes = [
   
  ];

  const initialEdges = [];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  // --- Templates for textarea
  const templates = {};
  const emojis = {};

  // --- Get existing extensions
  for (const [folder, { yaml, emoji }] of Object.entries(extensions)) {
    if (!yaml) continue;
    templates[folder] = yaml;
    if (emoji) emojis[folder] = emoji;
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

	const handleExecution = useCallback((execution) => {
  if (!Array.isArray(execution)) return;

  const executedIds = new Set(
    execution.map((e) => String(e.node))
  );

  setNodes((nds) =>
    nds.map((n) => ({
      ...n,
      data: {
        ...n.data,
        executed: executedIds.has(n.id),
      },
    }))
  );
}, [setNodes]);



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
        ? { ...n, data: { ...n.data, [field]: value, ...(field === "label" ? { rawLabel: value } : {}) } }
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
      data: { label: `node ${id}`, rawLabel: `node ${id}`, info: `- step: nyno-http-get
  args:
    - \${URL}`, args: [], emoji: "🌐" },
    //   sourcePosition: Position.Right,
    //targetPosition: Position.Left,
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

  const getDynamicText = (includeGuiData=false) => {
    const guidataNodes = nodes.map((n) => ({
      id: n.id,
      func: typeof n.data.rawLabel === "string" ? n.data.rawLabel : "node",
      info: n.data.info || "",
      next: edges.filter((e) => e.source === n.id).map((e) => e.target),
      position: n.position,
      type: n.type || null,
    }));
    const guidata = { nodes: guidataNodes, edges };

    let workflow = [];
    guidata.nodes.forEach((node) => {
      if (!node.info) return;
      try {
        const parsedInfo = YAML.load(node.info);
        let steps = [];
        if (parsedInfo && typeof parsedInfo === "object") {
          steps = Object.entries(parsedInfo).map(([stepName, stepData]) => ({
            step: stepData?.step || '',
            args: stepData?.args || [],
            context: stepData?.context || {},
            position: node?.position || {},
          }));
        }
        steps.forEach((step) => {
          workflow.push({ id: parseInt(node.id), position:step.position, step: step.step, args: step.args,context: step.context || [], next: node.next.map((x) => parseInt(x)) });
        });
      } catch (err) {
        console.warn("Failed to parse node info YAML for node", node.id, err);
      }
    });

    const sortedNodes = [...workflow].sort(
            (a, b) => a.position.y - b.position.y
          );
          workflow = sortedNodes;


    let firstNodeRoute = null;
    const firstNodeLabel = nodes[0]?.data?.rawLabel || "";
    if (firstNodeLabel.toLowerCase().startsWith("route")) firstNodeRoute = firstNodeLabel.replace(/^route\s*/i, "").trim();


    const yamlObj = { workflow };
    if (firstNodeRoute) yamlObj.route = firstNodeRoute;
    if(includeGuiData)  yamlObj.guidata = JSON.stringify(guidata);

    let yamlStr = YAML.dump(yamlObj, { noRefs: true, flowLevel: -1 });
    return yamlStr;
  };

  const exportYAML = () => {
    const includeGuiData = true;
    const yamlStr = getDynamicText(includeGuiData);

    const blob = new Blob([yamlStr], { type: "application/x-yaml" });
    const a = document.createElement("a");
    let obj = YAML.load(yamlStr);
    let firstNodeRoute = obj.route;

    let firstNodeCleanTitle = firstNodeRoute ? firstNodeRoute.replace(/[\/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_") : "flow";
    firstNodeCleanTitle = firstNodeCleanTitle.replace(/^_+/, "");
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

  const importYAML = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const yamlContent = YAML.load(evt.target.result);
        if (!yamlContent?.guidata) return alert("Invalid YAML: missing guidata");
        const guidata = JSON.parse(yamlContent.guidata);
        if (!guidata.nodes || !guidata.edges) return alert("Invalid guidata format");

        const importedNodes = guidata.nodes.map((n) => ({
          id: n.id,
          position: n.position || { x: 50 * parseInt(n.id), y: 50 * parseInt(n.id) },
          data: { label: n.func || `node ${n.id}`, rawLabel: n.func || `node ${n.id}`, info: n.info || "", args: n.args || [], emoji: n.emoji || "" },
          type: n.type || undefined,
        }));

        setNodes(importedNodes);
        setEdges(guidata.edges);
        pushHistory(importedNodes, guidata.edges);
      } catch (err) {
        console.error(err);
        alert("Error parsing YAML");
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleDialogKeyDown = (e) => {
    if (e.key === "Enter" && document.activeElement?.tagName !== "TEXTAREA") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const renderLabel = (rawLabel, node) => (
    <div style={{ textAlign: "center" }}>
      {node?.data?.emoji && <span className="node-emoji">{node.data.emoji}</span>}
      {rawLabel}
    </div>
  );

  const renderedNodes = nodes.map((n) => ({
    ...n,
	    className: n.data.executed ? "node-executed" : "",
    data: { ...n.data,  
	    label: renderLabel(n.data.rawLabel, n) },
  }));

  return (
    <ReactFlowProvider>
	  <RunButton getText={getDynamicText} onExecution={handleExecution} />
      <div style={{ width: "100%", height: "100vh" }}>
        <div style={{ position: "absolute", bottom: 9, right: 9, zIndex: 20 }}>
          <button onClick={addNode} style={{ marginRight: 5 }}>Add Node</button>
          <button onClick={exportYAML} style={{ marginRight: 5 }}>Export File</button>
          <button onClick={clearAll}>Clear All</button>
          <input type="file" accept=".nyno" onChange={importYAML} />
        </div>

        <ReactFlow
          nodes={renderedNodes}
          edges={edges}
          onNodesChange={(changes) => { onNodesChange(changes); pushHistory(nodes, edges); }}
          onEdgesChange={(changes) => { onEdgesChange(changes); pushHistory(nodes, edges); }}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeDoubleClick={onEdgeDoubleClick}
          onNodeDragStop={(_, node) => { 
            const updatedNodes = nodes.map((n) => n.id === node.id ? { ...n, position: node.position } : n); 

          // Sort nodes by y (descending) to get the highest first
          const sortedNodes = [...updatedNodes].sort(
            (a, b) => b.position.y - a.position.y
          );

            setNodes(sorted_nodes); pushHistory(sorted_nodes, edges); }}
          fitView
        >
          <Background variant="dots" gap={9} size={0.81} />
        </ReactFlow>

        <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
          <Dialog.Portal>
            <Dialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)" }} />
            <Dialog.Content
              className="dialog_content"
              onKeyDown={handleDialogKeyDown}
              style={{ background: "#171717", borderRadius: "8px", padding: "1rem 3rem", position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "300px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
            >
              {selectedNode && (
                <>
                  <div style={{ marginTop: "1rem" }}>
                    <input type="text" value={selectedNode.data.rawLabel} onChange={(e) => handleFieldChange("label", e.target.value)}
                      style={{ width: "100%", marginBottom: "0.5rem", fontSize: "24px", background: "none", color: "white", border: "none" }} />
                    <label>Template</label>
                    <select
                      onChange={(e) => {
                        const templateYaml = templates[e.target.value] || "";
                        const templateEmoji = emojis[e.target.value] || "";

                        handleFieldChange("info", templateYaml);

                        setNodes((nds) =>
                          nds.map((n) => n.id !== selectedNode.id ? n : { ...n, data: { ...n.data, emoji: templateEmoji } })
                        );
                      }}
                      style={{ background: "black", color: "white", border: "none", width: "100%", marginBottom: "0.5rem", padding: "9px", fontSize: "1rem" }}
                    >
                      {Object.keys(templates).map((t) => (
                        <option key={t} value={t}>{emojis[t] || ""} {t || "None"}</option>
                      ))}
                    </select>

                    <YamlFormToggle value={selectedNode.data.info} onChange={(val) => handleFieldChange("info", val)} />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
                    <button onClick={removeNode} style={{ padding: "0.5rem 1rem", background: "none", border:"none", color: "white", borderRadius: "4px" }}>Delete Node</button>
                    <Dialog.Close asChild><button style={{ padding: "0.5rem 1rem" }}>Close</button></Dialog.Close>
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

