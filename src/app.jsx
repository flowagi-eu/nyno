import "./styles/global.css";


import { ReactFlowProvider, useNodesState, useEdgesState } from "reactflow";

import React, { useCallback, useState, useEffect,useRef } from "react";


// Style rule: components export themselves by default
import WorkflowCanvas from './components/WorkflowCanvas.jsx';
import CustomNode from './components/CustomNode.jsx';
import RunButton from './components/RunButton.jsx';

// Style rule: super specific extra node components are placed in the nodes/ folder
import NodeModal from './components/node/NodeModal.jsx';

// Style rule: functions are pure (no globals) and use named exports
import { addInputOutputNodes } from "./functions/addInputOutputNodes.js";
import { reactFlowToYaml } from "./functions/reactFlowToYaml.js";
import { saveToFile } from "./functions/saveToFile.js";

// Style rule: GUI components are in gui folder
import FileUploadPopup from '@/components/gui/FileUploadPopup.jsx';
import MarkdownPopup from '@/components/gui/MarkdownPopup.jsx';
import HtmlPopup from '@/components/gui/HtmlPopup.jsx';
import TextareaPopup from '@/components/gui/TextareaPopup.jsx';
import Base64ImagePopup from '@/components/gui/Base64ImagePopup.jsx';
import VoiceRecorderPopup from '@/components/gui/VoiceRecorderPopup.jsx';
import AudioPlayerPopup from '@/components/gui/AudioPlayerPopup.jsx';
import DynamicListForm from '@/components/gui/OutputGuiDynamicListForm.jsx';
import OutputChat from '@/components/gui/OutputChat.jsx';

// Style rule: Hooks are in hooks folder and use named exports
import { useWorkflowLoader } from '@/hooks/useWorkflowLoader.js';

export default function App() {

    const [extensions, setExtensions] = useState({});

  const [selectedNode, setSelectedNode] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([
    {
      id: "1",
      type: "worker",
      position: { x: 100, y: 100 },
      data: {
        label: "Generate Text",
        info: `- step: ai-mistral-text
  args:
    - '\${prev}' # prompt
  context:
    SYSTEM_PROMPT: ""
    MISTRAL_API_KEY: "your Mistral api key"`
      }
    },
  ]);


  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [inputNode, setInputNode] = useState({
    id: "0",
    type: "inputNode",
    data: {
      label: "gui-input-textarea",
      info: "- step: gui-input-textarea"
    },
  });



  const [outputNode, setOutputNode] = useState({
    id: "output",
    type: "outputNode",
    data: {
      label: "gui-output-markdown",
      info: "- step: gui-output-markdown"
    }
  });

  const setFirstNode = setInputNode;
  const setLastNode = setOutputNode;
  



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


  const updateNodeData = (id, changes) => {


    if (id === inputNode.id) {

      setInputNode(prev => ({
        ...prev,
        data:{
          ...prev.data,
          ...changes
        }
      }));

    }


    else if (id === outputNode.id) {

      setOutputNode(prev => ({
        ...prev,
        data:{
          ...prev.data,
          ...changes
        }
      }));

    }


    else {

      setNodes(nds =>
        nds.map(node =>
          node.id === id
          ? {
              ...node,
              data:{
                ...node.data,
                ...changes
              }
            }
          : node
        )
      );

    }



    setSelectedNode(prev =>
      prev && prev.id === id
      ? {
          ...prev,
          data:{
            ...prev.data,
            ...changes
          }
        }
      : prev
    );

  };





  const exportWorkflowStr = () => {


 console.log("nodes", nodes);
  console.log("edges", edges);
  
    const {
      nodes: finalNodes,
      edges: finalEdges

    } = addInputOutputNodes(
      inputNode,
      outputNode,
      nodes,
      edges
    );


    return (
      reactFlowToYaml(
        finalNodes,
        finalEdges
      )
    );

  };

  const exportWorkflow = () => {
    saveToFile(exportWorkflowStr())
    //alert(exportWorkflowStr())
  }


  // Hooks and one time calls go here
  useWorkflowLoader({exportWorkflowStr,setExtensions});

  if("VITE_NYNO_DEV_UNSAFE_AUTO_SET_API_KEY" in import.meta.env) {
	const API_KEY = import.meta.env.VITE_NYNO_DEV_UNSAFE_AUTO_SET_API_KEY;
	useEffect(() => {
	  localStorage.setItem('NYNO_API_KEY',API_KEY);
	},[]);
  }


 // memos
const { templates, visuals } = React.useMemo(() => {
  const templates = {};
  const visuals = {};
  const DEFAULT_STEP_EMOJI = "⚙️";

  for (const [folder, { yaml, emoji, icon, label }] of Object.entries(extensions || {})) {
    if (!yaml) continue;

    templates[folder] = yaml;

    visuals[folder] = {
      icon: icon ? `${icon}` : null,
      emoji: emoji || DEFAULT_STEP_EMOJI,
    };

    if (label) {
      visuals[folder]["label"] = label;
    }
  }

  return { templates, visuals };
}, [extensions]);



const renderedNodes = nodes.map((n) => ({
  ...n,
  className: n.data.active ? "node-active" : "", // Replace `active` with your condition
}));


  return (

    <ReactFlowProvider>
     <TextareaPopup />
    <FileUploadPopup />
    <MarkdownPopup />
    <HtmlPopup />
    <Base64ImagePopup />
    <VoiceRecorderPopup />
    <AudioPlayerPopup />
<DynamicListForm />
<OutputChat />


      <RunButton getText={()=>{
        return exportWorkflowStr();
      }} onExecution={() => {

      }} />

      <div
        style={{
          height:"100vh",
          display:"flex",
          flexDirection:"column",
          overflow:"hidden"
        }}
      >



        <div
          style={{
            flex:"0 0 auto",
            display:"flex",
            flexDirection:"column",
            alignItems:"center"
          }}
        >

          <h3 className='inputH3'>INPUT</h3>

          <div
            onClick={() => setSelectedNode(inputNode)}
          >
            <CustomNode visuals={visuals} data={inputNode.data}/>
          </div>


        </div>





        <div
          style={{
            flex:1,
            minHeight:0
          }}
        >

          <WorkflowCanvas

            nodes={renderedNodes}
            edges={edges}

            visuals={visuals} 
            setNodes={setNodes}
            setEdges={setEdges}
            setFirstNode={setFirstNode}
            setLastNode={setLastNode}

            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}

            selectedNode={selectedNode}
            setSelectedNode={setSelectedNode}

            updateNodeData={updateNodeData}

            exportWorkflow={exportWorkflow}

          />


        </div>






        <div
          style={{
            flex:"0 0 auto",
            display:"flex",
            flexDirection:"column",
            alignItems:"center",
		zIndex: "99",
          }}
        >

          <h3 className='outputH3'>OUTPUT</h3>


          <div
            onClick={() => setSelectedNode(outputNode)}
          >

            <CustomNode visuals={visuals} data={outputNode.data}/>

          </div>


        </div>



      </div>





      <NodeModal
removeNode={removeNode}
templates={templates}
 visuals={visuals}
        node={selectedNode}

        updateNodeData={updateNodeData}

        onClose={() => setSelectedNode(null)}

      />


    </ReactFlowProvider>

  );

}
