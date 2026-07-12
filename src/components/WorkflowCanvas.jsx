import React, { useCallback, useMemo,useState, useEffect } from "react";
import ReactFlow, {
  Background,
  addEdge,
} from "reactflow";

import "reactflow/dist/style.css";

import CustomNode from "./CustomNode";

import { importYaml } from "../functions/importYaml.js";

//yamlToReactFlow




export default function WorkflowCanvas({

visuals,
  nodes,
  edges,

  setNodes,
  setEdges,

  setFirstNode,
  setLastNode,

  onNodesChange,
  onEdgesChange,

  selectedNode,
  setSelectedNode,

  exportWorkflow

}) {

  const [rf, setRf] = useState(null);
useEffect(() => {
  if (!rf) return;

  rf.zoomTo(1.5, { duration: 500 });
}, [rf]);


const nodeTypes = useMemo(() => ({
  worker: (props) => (
    <CustomNode
      {...props}
      visuals={visuals}
    />
  ),
}), [visuals]);


const onEdgeDoubleClick = useCallback((event, edge) => {

  setEdges((eds) =>
    eds.filter((e) => e.id !== edge.id)
  );

}, [setEdges]);







const onConnect = useCallback((connection) => {

  setEdges((eds) =>
    addEdge(connection, eds)
  );

}, [setEdges]);






const onNodeClick = useCallback((event, node) => {

  console.log("Clicked node:", node);

  setSelectedNode(node);

}, [setSelectedNode]);







const addNode = () => {


  const lastId = nodes.reduce(

    (max,node) =>
      Math.max(
        max,
        Number(node.id) || 0
      ),

    0

  );


  const id = String(lastId + 1);



  setNodes(nds => [

    ...nds,


    {
      id,

      type:"worker",

      position:{
        x:100 + nds.length * 80,
        y:100 + nds.length * 80
      },


      data:{
        label:`Generate Text`,
        info:`- step: ai-mistral-text 
  args: ["\${prev}"]`
      }

    }

  ]);

};








const clearWorkflow = () => {

  setNodes([]);

  setEdges([]);

  setSelectedNode(null);

};








return (

<div
  style={{
    height:"100%",
    width:"100%"
  }}
>


<div
style={{
  position: "fixed",
  zIndex: 9910,
  width: "280px",
  right: 0,
  bottom: 0,
}}
>

<button onClick={addNode}>
Add Node
</button>


<button onClick={clearWorkflow}>
Clear
</button>


<button onClick={exportWorkflow}>
Export
</button>



<button>

<label
style={{
 cursor:"pointer"
}}
>

Import YAML


<input

type="file"

accept=".yaml,.yml,.nyno"

hidden

  onChange={(event) => importYaml(event, setNodes, setEdges,setFirstNode,setLastNode)}
/>


</label>

</button>



</div>






<ReactFlow


onInit={setRf}

nodeTypes={nodeTypes}


nodes={nodes}


edges={edges}


onNodesChange={onNodesChange}


onEdgesChange={onEdgesChange}


onConnect={onConnect}


onNodeClick={onNodeClick}

  onEdgeDoubleClick={onEdgeDoubleClick}

fitView



>


<Background />

</ReactFlow>



</div>


);


}
