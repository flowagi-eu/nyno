// singleton.js
import fs from 'fs';

class App {
  constructor() {
    if (App.instance) return App.instance;
    this.store = new Map();
    App.instance = this;
  }

  loadEnvVars(envFilePath){
// --- Parse .env manually ---
const envContent = fs.readFileSync(envFilePath, 'utf-8');
const envVars = {};
envContent.split(/\r?\n/).forEach(line => {
  line = line.trim();
  if (!line || line.startsWith('#')) return;
  const [key, ...rest] = line.split('=');
  envVars[key] = rest.join('=').trim();
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

