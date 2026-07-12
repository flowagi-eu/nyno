import { Handle, Position } from "reactflow";
import YAML from 'js-yaml';

export default function CustomNode({ visuals, data }) {

  const getStepFromYaml = (yamlStr) => {
    if (!yamlStr) return null;

    try {
      const parsed = YAML.load(yamlStr);

      // your format: array with one object
      if (Array.isArray(parsed)) {
        return parsed[0]?.step || null;
      }

      return parsed?.step || null;
    } catch {
      return null;
    }
  };

  const renderNodeVisual = (node) => {
    const DEFAULT_STEP_EMOJI = "⚙️";
    const step = getStepFromYaml(node?.info);
    const visual = visuals[step];

    if (visual?.icon) {
      return (
        <img
          src={visual.icon}
          alt=""
          style={{ width: 42, height: 42, objectFit: "contain" }}
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      );
    }

    return visual?.emoji || DEFAULT_STEP_EMOJI;
  };

  return (
    <div className="customNode">
      <Handle type="target" position={Position.Top} />

      <div>
        {data.coverImage && (
          <div>{data.coverImage}</div>
        )}
      </div>

      <div className="wjei_block">
        <div className="wjei_emoji">
          {renderNodeVisual(data)}
        </div>

        <div className="wjei_text">
          <div>
            <div>{data.label}</div>

            {data?.missing?.length > 0 && (
              <div
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  color: "#ff6b6b",
                }}
              >
                Missing:{" "}
                {data.missing.map((k) => `\${${k}}`).join(", ")}
              </div>
            )}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}