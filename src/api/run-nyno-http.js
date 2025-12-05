import { runYamlString } from './../lib-manual/runYamlString.js';
import fs from 'fs';
const envs = load_nyno_ports();

export default function register(app) {
  app.post('/run-nyno-http', async(req, res) => {
    if(!envs.SECRET) {
      return res.status(401).json({ error: 'Security secret must be set in envs/ports.env' });
    }
    if (req.headers.authorization !== envs.SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const text = req.body.text;
    const result = await runYamlString(text);
    res.json(result);
  });
}

function load_nyno_ports(path = "envs/ports.env") {
  const env = {};
  const lines = fs.readFileSync(path, "utf-8").split("\n");

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.includes("#")) line = line.split("#")[0].trim();
    if (line.includes("=")) {
      let [key, value] = line.split("=", 2);
      key = key.trim();
      value = value.trim();

      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Convert numeric values
      if (!isNaN(value) && value !== "") value = Number(value);

      env[key] = value;
    }
  }
  return env;
}