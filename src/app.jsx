// src/pages/flow.jsx
import extensions from "@/extension-data.json";
import { YamlFormToggle } from "@/components/YamlFormToggle";
import { RunButton } from "@/components/RunButton";
import { Position } from "reactflow";
import GitHubStarBadge from "@/components/GitHubStarBadge";
import { TemplateSelect } from "@/components/TemplateSelect";
import FileButton from "@/components/FileButton";
import DynamicKeyValueEditor from "@/components/DynamicKeyValueEditor";
import NynoAgentBuilder from "@/components/NynoAgentBuilder";

// --- Template imports (as plain text)
import YAML from 'js-yaml';
import nynoWhite from "./assets/nyno-coin.png";
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

export async function getServerSideProps(context) {
  const pageTitle = "Nyno Workflow"; 
  return { props: { title: pageTitle } };
}

export default function FlowPage() {

const isPro = (import.meta.env.VITE_NYNO_IS_PRO_VERSION ?? false);

console.log({isPro});

  const keywordEmojis = { route: "🌐" };

  const initialNodes = [
   
  ];

  const initialEdges = [];


const [contextVars, setContextVars] = useState({});
const [contextOpen, setContextOpen] = useState(false);


  const [selectedNode, setSelectedNode] = useState(null);
	const [selectedTemplate, setSelectedTemplate] = useState("");

	useEffect(() => {
  if (!selectedNode) return;

  // Optional: infer template from node info
  setSelectedTemplate("");
}, [selectedNode]);


  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
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

  const isAgentConfigStep = (yamlStr) => {
  if (!yamlStr || typeof yamlStr !== "string") return false;
  return /(^|\n)\s*-\s*step:\s*tool-settings\b/i.test(yamlStr);
};


const applyContextToInfo = (infoYaml, contextObj) => {
  let parsed = {};

  try {
    parsed = YAML.load(infoYaml) || {};
  } catch {
    parsed = {};
  }

  // If template is array-wrapped (your current pattern)
  if (Array.isArray(parsed)) {
    parsed = parsed[0] || {};
  }

  parsed.context = contextObj;

  return YAML.dump([parsed], { flowLevel: 3 });
};

const isAgentTemplate = (yamlStr) => {
  if (!yamlStr || typeof yamlStr !== "string") return false;
  // Matches:
  // - step: agent
  // - step: my-agent
  // - step: something-agent
  const re = /(^|\n)\s*-\s*step:\s*[^\n#]*\bagent\b/i;
  return re.test(yamlStr);
};
// Detect if selectedNode already has an upstream tool-settings node
const hasAgentConfigUpstream = (targetNodeId, allNodes, allEdges) => {
  const incoming = allEdges.filter(e => e.target === String(targetNodeId));
  if (incoming.length === 0) return false;

  const incomingSources = new Set(incoming.map(e => e.source));
  for (const n of allNodes) {
    if (!incomingSources.has(n.id)) continue;
    const info = n?.data?.info || "";
    if (typeof info === "string" && /(^|\n)\s*-\s*step:\s*tool-settings\b/i.test(info)) {
      return true;
    }
  }
  return false;
};


  const pushHistory = (newNodes, newEdges) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: newNodes, edges: newEdges });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

	const handleExecution = useCallback((execution) => {
  if (!Array.isArray(execution)) return;

  setNodes((nds) =>
    nds.map((n) => {
      const exec = execution.find((e) => String(e.node) === n.id);

      return {
        ...n,
        data: {
          ...n.data,
          executed: !!exec,
          error: exec?.error || false,
          missing: exec?.output?.c?.missing || [],
        },
      };
    })
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
  // Parse tools from YAML if node is tool-settings
  if (isAgentConfigStep(node?.data?.info)) {
    let parsedTools = [];
    try {
      const parsedYaml = YAML.load(node.data.info);
      if (Array.isArray(parsedYaml)) {
        parsedTools = parsedYaml[0]?.tools || [];
        setContextVars(parsedYaml[0].context || {});  // ✅ Populate editor with existing context
      }

    } catch {}
    node = {
      ...node,
      data: {
        ...node.data,
        tools: parsedTools,
      },
    };
  }

  setSelectedNode(node);
  setIsOpen(true);
};


  const onEdgeDoubleClick = (_, edge) => {
    const newEdges = edges.filter((e) => e.id !== edge.id);
    setEdges(newEdges);
    pushHistory(nodes, newEdges);
  };

 const handleFieldChange = (updates) => {
  if (!selectedNode) return;

  const updatedNodes = nodes.map((n) =>
    n.id === selectedNode.id
      ? { ...n, data: { ...n.data, ...updates, ...(updates.label ? { rawLabel: updates.label } : {}) } }
      : n
  );

  setNodes(updatedNodes);
  setSelectedNode((prev) => ({
    ...prev,
    data: { ...prev.data, ...updates, ...(updates.label ? { rawLabel: updates.label } : {}) },
  }));

  pushHistory(updatedNodes, edges);
};

  
  // --- Normalize workflow: ensure ids + next exist
const normalizeWorkflow = (workflow) => {
  return workflow.map((step, index) => {
    const id = step.id ?? index + 1;

    return {
      ...step,
      id,
      next: Array.isArray(step.next)
        ? step.next
        : index < workflow.length - 1
          ? [workflow[index + 1]?.id ?? index + 2]
          : [],
    };
  });
};


const [nodeCounter, setNodeCounter] = useState(1);
  const addNode = () => {
  const id = nodeCounter.toString();

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
    setNodeCounter((c) => c + 1);
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
    const parsedInfo = Object.assign(
      {},
      node,
      Array.isArray(YAML.load(node.info)) ? YAML.load(node.info)[0] : YAML.load(node.info) || {}
    );

    console.log('parsedInfo',parsedInfo);
    // Skip nodes without a step
    //if (!parsedInfo.step) return;


    // repeatative gui only fields 
    delete parsedInfo.info;
    delete parsedInfo.func
    delete parsedInfo.type;

    parsedInfo.label = node.func || `node ${node.id}`;
    parsedInfo.next = Array.isArray(node.next) ? node.next.map((x) => parseInt(x)) : [];

    console.log('pushing to workflow',parsedInfo);
    workflow.push(parsedInfo);

  } catch (err) {
    console.warn("Failed to parse node info YAML for node", node.id, err);
  }
});

console.log('before sortedNodes workflow',workflow);

    const sortedNodes = [...workflow].sort(
            (a, b) => a.position.y - b.position.y
          );
          workflow = sortedNodes;


    let firstNodeRoute = null;
    const firstNodeLabel = nodes[0]?.data?.rawLabel || "";
    if (firstNodeLabel.toLowerCase().startsWith("route")) firstNodeRoute = firstNodeLabel.replace(/^route\s*/i, "").trim();



    const yamlObj = { nyno: "5.3", workflow };
    if (firstNodeRoute) yamlObj.route = firstNodeRoute;

    let yamlStr = YAML.dump(yamlObj, { noRefs: true, flowLevel: 3 });
    return yamlStr;
  };

  const exportYAML = () => {
    const includeGuiData = true;
    const yamlStr = getDynamicText(includeGuiData);

    const blob = new Blob([yamlStr], { type: "application/x-yaml" });
    const a = document.createElement("a");
    let parsed = YAML.load(yamlStr);
    
    const obj = {
  nyno: "5.1.0",
  ...parsed
};


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
      


      if (!yamlContent?.workflow) return alert("Invalid YAML: missing workflow");
      
      
      yamlContent.workflow = normalizeWorkflow(yamlContent.workflow);

      // Minimal spacing
      const spacingX = 200;
      const spacingY = 100;

      const importedNodes = yamlContent.workflow.map((step, index) => ({
        id: (step.id || index + 1).toString(),
        position: {
          x: step.position?.x || spacingX * index,
          y: step.position?.y || spacingY * index,
        },
        data: {
          label: step.label || `node ${index + 1}`,
          rawLabel: step.label || `node ${index + 1}`,
          func: step.label || `node ${index + 1}`,
          info: YAML.dump([
  {
    step: step.step || "",
          ...(step.tools ? { tools: step.tools } : {}),
    ...(step.args && step.args.length > 0 ? { args: step.args } : {}),
    ...(step.context && Object.keys(step.context).length > 0 ? { context: step.context } : {}),
}
],{ flowLevel: 3 }),
          emoji: emojis[step.step] || "🌐",
        },
        type: step.type || undefined,
      }));

      // Create edges based on `next` array
      const importedEdges = [];
      yamlContent.workflow.forEach((step) => {
        if (!step.next) return;
        step.next.forEach((targetId) => {
          importedEdges.push({
            id: `e${step.id}-${targetId}`,
            source: step.id.toString(),
            target: targetId.toString(),
          });
        });
      });

      setNodes(importedNodes);
      setEdges(importedEdges);
      pushHistory(importedNodes, importedEdges);
      
      
// Update nodeCounter to avoid duplicates
const maxId = Math.max(...importedNodes.map(n => parseInt(n.id)));
setNodeCounter(maxId + 1);

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
  if (e.key !== "Enter") return;

  const active = document.activeElement;

  // Only close when pressing Enter on the node title input
  if (active?.classList?.contains("nodeTitle")) {
    e.preventDefault();
    setIsOpen(false);
  }
};

  const renderLabel = (rawLabel, node) => (
  <div style={{ textAlign: "center" }}>
    {node?.data?.emoji && <span className="node-emoji">{node.data.emoji}</span>}
    <div>{rawLabel}</div>

    {node?.data?.missing?.length > 0 && (
      <div style={{
        marginTop: 4,
        fontSize: 11,
        color: "#ff6b6b"
      }}>
        Missing: {node.data.missing.map(k => `\${${k}}`).join(", ")}
      </div>
    )}
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
    <div style={{ position: "absolute", top: 15, left:15 }} ><img style={{ height: 24,margin:'0px 0px -6px 1px' }} src={nynoWhite} /> <span style={{color:'white','opacity':isPro ? 1 : 0.81}}>
    
          
       
    
    Nyno{isPro && <span style={{ color: "cyan" }}> Pro</span>}</span></div>
      <GitHubStarBadge />
	  <RunButton getText={getDynamicText} onExecution={handleExecution} />
      <div style={{ width: "100%", height: "100vh" }}>
        <div style={{ position: "absolute", bottom: 9, right: 300, zIndex: 20 }}>
          <button onClick={addNode} style={{ marginRight: 5 }}>Add Node</button>
          <button onClick={exportYAML} style={{ marginRight: 5 }}>Export File</button>
          <button onClick={clearAll}>Clear All</button>
          
          <FileButton onFile={importYAML} />
        </div>

        <ReactFlow
          nodes={renderedNodes}
          edges={edges}
          onNodesChange={(changes) => { 
            onNodesChange(changes); 
            //pushHistory(nodes, edges);
           }}
          onEdgesChange={(changes) => { 
            onEdgesChange(changes); 
            //pushHistory(nodes, edges);
           }}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeDoubleClick={onEdgeDoubleClick}
          onNodeDragStop={(_, node) => { 
            const updatedNodes = nodes.map((n) => n.id === node.id ? { ...n, position: node.position } : n); 

          // Sort nodes by y (descending) to get the highest first
          const sortedNodes = [...updatedNodes].sort(
            (a, b) => b.position.y - a.position.y
          );

            setNodes(sortedNodes); pushHistory(sortedNodes, edges); }}
          fitView
        >
          <Background variant="dots" gap={9} size={0.81} />
        </ReactFlow>
        
        <Dialog.Root open={contextOpen} onOpenChange={setContextOpen}>
  <Dialog.Portal>
    <Dialog.Overlay
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)" }}
    />
    <Dialog.Content
      style={{
        background: "#111",
        padding: "1rem",
        borderRadius: 6,
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 360,
      }}
    >
      <h3 style={{ color: "white", marginBottom: 8 }}>Context Variables</h3>

      <DynamicKeyValueEditor
        value={contextVars}
        onChange={setContextVars}
      />

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
        <button
          onClick={() => {
            const newInfo = applyContextToInfo(
              selectedNode.data.info,
              contextVars
            );
            handleFieldChange({"info": newInfo});
            setContextOpen(false);
          }}
        >
          Save
        </button>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>


        <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
          <Dialog.Portal>
            <Dialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)" }} />
            <Dialog.Content
              className="dialog_content"
              onKeyDown={handleDialogKeyDown}
              style={{ background: "#171717", borderRadius: "8px", padding: "1rem 3rem", position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "402px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
            >
              {selectedNode && (
                <>
                  <div style={{ marginTop: "1rem" }}>
                    <input className="nodeTitle" type="text" value={selectedNode.data.rawLabel} onChange={(e) => handleFieldChange({"label": e.target.value})}
                      style={{ width: "100%", marginBottom: "0.5rem", fontSize: "24px", background: "none", color: "white", border: "none" }} />

                      {isAgentConfigStep(selectedNode?.data?.info) ? (
                        <div>
<NynoAgentBuilder
  value={selectedNode.data.tools || []}
  onChange={(yaml, newTools) => {
  const oldTools = selectedNode.data.tools || [];
  if (JSON.stringify(oldTools) === JSON.stringify(newTools)) return;

  // persist tools
  handleFieldChange({"tools": newTools});

  // persist yaml
  const yamlObj = [
    {
      step: "tool-settings",
      tools: newTools,
    },
  ];
  handleFieldChange({"info": YAML.dump(yamlObj, { flowLevel: 3 })});
}}

/>

  

  </div>
) : (
  <div>
		      <TemplateSelect
  templates={templates}
  emojis={emojis}
  value={selectedTemplate}
  onSelect={(templateKey) => {
    setSelectedTemplate(templateKey);

    const templateYaml = templates[templateKey] || "";
    const templateEmoji = emojis[templateKey] || "";

    handleFieldChange({"info": templateYaml, "emoji": templateEmoji});

/*
    setNodes((nds) =>
      nds.map((n) =>
        n.id !== selectedNode.id
          ? n
          : {
              ...n,
              data: {
                ...n.data,
                emoji: templateEmoji,
              },
            }
      )
    );*/




// If this template includes an agent step, insert an tool-settings node above it
    if (isAgentTemplate(templateYaml)) {
      // Avoid duplicates if a config already exists
      if (hasAgentConfigUpstream(selectedNode.id, nodes, edges)) {
        return;
      }

      // Create a new node id
      const newId = String(nodeCounter);
      const agentNode = nodes.find((n) => n.id === String(selectedNode.id));
      const baseX = agentNode?.position?.x ?? 0;
      const baseY = agentNode?.position?.y ?? 0;

      const configNode = {
        id: newId,
        position: { x: baseX, y: baseY - 120 },
        data: {
              tools: [], // 
          label: "tool-settings",
          rawLabel: "tool-settings",
          info: YAML.dump([{ step: "tool-settings" }], { flowLevel: 3 }),
          emoji: "🧰",
        },
      };

      const newNodes = [...nodes, configNode];
      const newEdge = {
        id: `e${newId}-${selectedNode.id}`,
        source: newId,
        target: String(selectedNode.id),
      };
      const newEdges = [...edges, newEdge];

      //setNodes(newNodes);
      //setEdges(newEdges);
      //pushHistory(newNodes, newEdges);


    handleFieldChange({"info": templateYaml,"emoji": templateEmoji});

      setNodes((nds) => {
        const updated = [...nds, configNode];
        pushHistory(updated, [...edges, newEdge]);
        return updated;
      });

      setEdges((eds) => [...eds, newEdge]);

      setNodeCounter((c) => c + 1);
    }

  }}

  
/>

<YamlFormToggle value={selectedNode.data.info} onChange={(val) => handleFieldChange({"info": val})} />
                    
                    <button
  onClick={() => setContextOpen(true)}
  style={{ marginTop: 8 }}
>
  Edit Variables
</button>

</div>


)}


                    

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

