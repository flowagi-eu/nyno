import YAML from "js-yaml";


export function yamlToReactFlow(yamlText) {
  const parsed = typeof yamlText === "string"
    ? YAML.load(yamlText)
    : yamlText;


  const workflow = parsed?.workflow || [];


  const nodes = workflow.map((item, index) => {

    const {
      id,
      label,
      next,
      position,
      type,
      ...workflowData
    } = item;


    return {
      id: String(id ?? index + 1),

      type: type || "worker",

      position: position || {
        x: index * 200,
        y: 100,
      },

      data: {
        label: label || `Worker ${id}`,

        // store workflow item data back into node.info
        info: YAML.dump(
          [
            workflowData
          ],
          {
            flowLevel: 3,
          }
        ),
      },
    };
  });



  const edges = [];


  workflow.forEach((item) => {

    if (!Array.isArray(item.next)) return;


    item.next.forEach((targetId) => {

      edges.push({
        id: `e${item.id}-${targetId}`,

        source: String(item.id),

        target: String(targetId),
      });

    });

  });



  return {
    nodes,
    edges,
  };
}
