// singleton.js
import fs from 'fs';

class App {
  constructor() {
    if (App.instance) return App.instance;
    this.store = new Map();
    App.instance = this;
  }

 loadEnvVars(envFilePath) {


  const envContent = fs.readFileSync(envFilePath, 'utf-8');
  const envVars = {};

  envContent.split(/\r?\n/).forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) return;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    // Remove surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Unescape escaped quotes
    value = value.replace(/\\"/g, '"').replace(/\\'/g, "'");

    envVars[key] = value;
  });

  return envVars;
}


  set(key, value) {
    this.store.set(key, value);
  }

  get(key) {
    return this.store.get(key);
  }

  has(key) {
    return this.store.has(key);
  }

  delete(key) {
    return this.store.delete(key);
  }
}

export default new App();

