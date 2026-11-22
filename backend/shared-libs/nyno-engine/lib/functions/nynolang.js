import yaml from 'js-yaml';

// Hardcoded bidirectional mapping
const STEP_MAP = {
  'nyno-sql': 'sql',
  'nyno-file-read': 'file-read',
  'nyno-echo': 'echo',
};
const REVERSE_STEP_MAP = Object.fromEntries(
  Object.entries(STEP_MAP).map(([longName, shortName]) => [shortName, longName])
);

/**
 * Parse short YAML preserving duplicate top-level keys
 * Returns an array of { key, value } preserving order
 */
function parseShortYamlWithDuplicates(yamlStr) {
  const docs = yaml.loadAll(yamlStr); // in case of multiple documents
  const parsed = [];

  const lines = yamlStr.split(/\r?\n/);
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;

    const match = line.match(/^([^\s:]+):\s*(.+)?$/);
    if (match) {
      const key = match[1];
      let value = match[2] || null;
      // If value is quoted, remove quotes
      value = value?.replace(/^["']|["']$/g, '');
      parsed.push({ key, value });
    }
  }
  return parsed;
}

/**
 * Encode short YAML to long workflow YAML
 */
export function encodeToLongFormat(shortYaml) {
  const workflow = [];
  let idCounter = 0;

  // Parse YAML preserving duplicate top-level keys
  const items = parseShortYamlWithDuplicates(shortYaml);

  let toolSettings = null;
  let actions = {};

  for (const item of items) {
    const { key, value } = item;

    if (key === 'tool-settings') {
      toolSettings = yaml.load(value || '-'); // parse array
    } else if (key === 'ai-mistral-agent') {
      workflow.push({
        id: `${idCounter++}`,
        step: 'ai-mistral-agent',
        args: [value],
        label: 'ai-mistral-agent',
        next: [],
      });
    } else if (key === 'actions') {
      actions = yaml.load(value || '{}');
    } else if (REVERSE_STEP_MAP[key]) {
      workflow.push({
        id: `${idCounter++}`,
        step: REVERSE_STEP_MAP[key],
        args: [value],
        label: REVERSE_STEP_MAP[key],
        next: [],
      });
    }
  }

  // If tool-settings exist, add it as the first step
  if (toolSettings) {
    workflow.unshift({
      id: `${idCounter++}`,
      step: 'tool-settings',
      tools: toolSettings.map(tool => ({
        name: tool.name,
        description: tool.desc,
        input_schema: Object.fromEntries(
          Object.entries(tool.vars || {}).map(([k, desc]) => [k, { description: desc, type: 'string', enum: '' }])
        ),
      })),
      label: 'tool-settings',
      next: [],
    });

    // Add actions steps from `actions` mapping
    for (const [shortKey, argsList] of Object.entries(actions)) {
      const longStep = REVERSE_STEP_MAP[shortKey];
      if (!longStep) throw new Error(`No mapping for short key "${shortKey}"`);
      argsList.forEach(args => {
        workflow.push({
          id: `${idCounter++}`,
          step: longStep,
          args,
          label: longStep,
          next: [],
        });
      });
    }
  }

  return yaml.dump({ nyno: '5.3', workflow });
}

/**
 * Decode long YAML to short YAML
 */
export function decodeToShortFormat(longYaml) {
  const longData = yaml.load(longYaml);
  const shortFormat = [];

  // Use object for tool-settings and actions
  let toolSettings = [];
  let actions = {};

  for (const step of longData.workflow) {
    if (step.step === 'tool-settings') {
      toolSettings = step.tools.map(tool => ({
        name: tool.name,
        desc: tool.description,
        vars: Object.fromEntries(
          Object.entries(tool.input_schema || {}).map(([k, v]) => [k, v.description])
        ),
      }));
    } else if (step.step === 'ai-mistral-agent') {
      shortFormat.push({ key: 'ai-mistral-agent', value: step.args.join(' ') });
    } else if (STEP_MAP[step.step]) {
      const shortKey = STEP_MAP[step.step];
      shortFormat.push({ key: shortKey, value: step.args.join(' ') });
    }
  }

  if (toolSettings.length) {
    shortFormat.push({ key: 'tool-settings', value: toolSettings });
  }

  // Convert back to YAML
  let yamlStr = '';
  for (const item of shortFormat) {
    if (item.key === 'tool-settings') {
      yamlStr += `${item.key}:\n${yaml.dump(item.value).replace(/^/gm, '  ')}\n`;
    } else {
      yamlStr += `${item.key}: "${item.value}"\n`;
    }
  }
  return yamlStr;
}

// ------------------- Example -------------------

const shortYamlExample = `
echo: "hi"
echo: "hi again"
tool-settings:
  - name: read-sql
    desc: read postgres sql query
    vars:
      QUERY: generate query
ai-mistral-agent: "run workflow"
actions:
  sql:
    - ["\${agent.args.QUERY}"]
    - ["\${agent.args.QUERY} again"]
`;

console.log('--- SHORT YAML ---');
console.log(shortYamlExample);

const longYaml = encodeToLongFormat(shortYamlExample);
console.log('--- ENCODED TO LONG FORMAT ---');
console.log(longYaml);

const shortYamlDecoded = decodeToShortFormat(longYaml);
console.log('--- DECODED BACK TO SHORT FORMAT ---');
console.log(shortYamlDecoded);

