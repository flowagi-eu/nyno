export function addInputOutputNodes(inputNode, outputNode, nodes, edges) {
  const realNodes = [...nodes];

  const lastId = realNodes.reduce(
    (max, node) => Math.max(max, Number(node.id) || 0),
    0
  );

  const finalInputNode = {
    ...inputNode,
    id: "0",
  };

  const finalOutputNode = {
    ...outputNode,
    id: String(lastId + 1),
  };


  const finalNodes = [
    finalInputNode,
    ...realNodes,
    finalOutputNode,
  ];


  const finalEdges = [
    ...edges,
  ];


  // connect INPUT -> first node
  if (realNodes.length > 0) {
    finalEdges.push({
      id: `e0-${realNodes[0].id}`,
      source: "0",
      target: realNodes[0].id,
    });


    // connect last node -> OUTPUT
    finalEdges.push({
      id: `e${realNodes[realNodes.length - 1].id}-${finalOutputNode.id}`,
      source: realNodes[realNodes.length - 1].id,
      target: finalOutputNode.id,
    });
  }


  return {
    nodes: finalNodes,
    edges: finalEdges,
  };
}
