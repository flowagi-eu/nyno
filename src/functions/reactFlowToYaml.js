import YAML from "js-yaml";


function parseFunc(func) {
  if (!func) return {};

  try {
    const parsed = YAML.load(func);

    if (Array.isArray(parsed)) {
      return parsed[0] || {};
    }

    let ret = parsed || {};

    if ('type' in ret) delete ret.type;

    return ret;

  } catch (e) {
    console.warn("Invalid func YAML", e);
    return {};
  }
}



export function reactFlowToWorkflow(nodes, edges) {


  return {

    nyno: "8.0",


  // we sort only the middle nodes (not first,last, because they are gui nodes)
    workflow: [
  nodes[0],
  ...nodes
    .slice(1, -1)
    .sort((a, b) => (a.position?.y ?? 0) - (b.position?.y ?? 0)),
  nodes[nodes.length - 1],
].map((node) => {


      return {


        id: Number(node.id),


        ...parseFunc(node.data?.info),



        label: node.data?.label || "",
        position: node?.position || {x:0,y:0},



        next: edges

          .filter(
            e => e.source === node.id
          )

          .sort((a, b) => {


            const nodeA = nodes.find(
              n => n.id === a.target
            );


            const nodeB = nodes.find(
              n => n.id === b.target
            );


            return (
  (nodeA?.position?.x ?? 0) -
  (nodeB?.position?.x ?? 0)
);

          })


          .map(
            e => Number(e.target)
          ),





      };


    }),


  };

}




export function reactFlowToYaml(nodes, edges) {

  const obj = reactFlowToWorkflow(nodes, edges);

  return YAML.dump(obj, {
    noRefs: true,
    flowLevel: 3,
  });

}
