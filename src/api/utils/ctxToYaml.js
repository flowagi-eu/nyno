import YAML from 'js-yaml';
import fs from 'fs';

export function ctxToYaml(input) {
let yamlString;
    if(input.filepath ?? false){
      //console.log('debug::i chose .filepath',input.filepath);
      yamlString = fs.readFileSync(input.filepath);
      let obj = YAML.load(yamlString);
      obj.context = input.context ?? {};
      yamlString = YAML.dump(obj);
    } else if (input.json ?? false) {
      //console.log('debug::i chose .json',input.json);
      input.json.context = input.context ?? {};
      yamlString = YAML.dump(input.json);
    } else if (input.text ?? false) {
      //console.log('debug::i chose .text',input.text);
      yamlString = input.text;
      let obj = YAML.load(yamlString);
      obj.context = input.context ?? {};
      yamlString = YAML.dump(obj);
    } else {
      //console.log('debug::i chose nothing',JSON.stringify({input}));
    }

    //console.log('debug::yamlString',yamlString);
    return yamlString;
}
