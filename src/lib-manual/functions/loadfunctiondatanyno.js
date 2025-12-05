import fs from 'fs';
import path from 'path';

export function loadStepCommandLangs(baseDir) {
  const commands = {};

  // Read all directories inside extensions/
  const dirs = fs.readdirSync(baseDir, { withFileTypes: true })
                 .filter(d => d.isDirectory())
                 .map(d => d.name);

  for (const dir of dirs) {
    const fullDir = path.join(baseDir, dir);

    // Read files in each directory
    const files = fs.readdirSync(fullDir);

    // Look for a file named command.<ext>
    const commandFile = files.find(f => f.startsWith('command.'));
    if (!commandFile) continue;

    // Extract extension (js, py, php, rb…)
    const ext = path.extname(commandFile).replace('.', '');

    commands[dir] = ext;
  }

  return commands;
}


//* ---------------------------
// Direct Execution Demo
// ---------------------------
if (process.argv[1] === new URL(import.meta.url).pathname) {
    console.log(loadStepCommandLangs('/home/user/github/nyno/extensions'));
}
//*/