import path from "node:path";

export function getWorkflowPath(name) {
  const baseDir = path.resolve(process.cwd(), "workflows-enabled");
  const filepath = path.resolve(baseDir, name ?? "");

  if (!filepath.startsWith(baseDir + path.sep)) {
    throw new Error("Invalid workflow name");
  }

  return filepath;
}
