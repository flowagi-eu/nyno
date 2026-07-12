import { yamlToReactFlow } from "../functions/yamlToReactFlow.js";


import YAML from "js-yaml";

export function importYaml(
  event,
  setNodes,
  setEdges,
  setFirstNode,
  setLastNode
) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (e) => {
    let { nodes, edges } = yamlToReactFlow(e.target.result);

    const getStep = (node) => {
      try {
        return YAML.load(node.data?.info)?.[0]?.step;
      } catch {
        return undefined;
      }
    };

    const nodesToRemove = new Set();

    const firstNode = nodes[0];
    if (firstNode) {
      firstNode.type = "inputNode"; // ! used to filter for specific input node options later
      nodesToRemove.add(firstNode.id);
      setFirstNode(firstNode);
    } else {
      setFirstNode(null);
    }

    const lastNode = nodes.at(-1);
    if (
      lastNode &&
      lastNode.id !== firstNode?.id
    ) {
      nodesToRemove.add(lastNode.id);

      lastNode.type = "outputNode"; // ! used to filter for specific output node options later
      setLastNode(lastNode);
    } else {
      setLastNode(null);
    }

    if (nodesToRemove.size) {
      nodes = nodes.filter((node) => !nodesToRemove.has(node.id));
      edges = edges.filter(
        (edge) =>
          !nodesToRemove.has(edge.source) &&
          !nodesToRemove.has(edge.target)
      );
    }

    setNodes(nodes);
    setEdges(edges);
  };

  reader.readAsText(file);
}