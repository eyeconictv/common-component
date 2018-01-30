const fs = require("fs");
const path = require("path");
const nodeExe = path.basename(process.execPath);
const scriptName = path.basename(__filename);
const filePath = process.argv[2];
const componentName = process.argv[3];
const version = process.argv[4];
const pct = Number(process.argv[5]) ? Number(process.argv[5]) : null;

if (!filePath || !filePath.endsWith(".json")) {return err();}
if (!version || !version.startsWith("2")) {return err();}
if (!componentName) {return err();}

try {
  let json = JSON.parse(fs.readFileSync(filePath));
  json.components = json.components.map(component=>component.name === componentName ? Object.assign({}, component, {version}) : component);

  json.rolloutPct = (pct || pct === 0) ? pct : json.rolloutPct;
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2));
} catch(e) {
  return err(e);
}

function err(e) {
  console.error(`usage: ${nodeExe} ${scriptName} [path-to${path.sep}manifest-file.json] [componentName] [version] [pct]`);
  if (e) console.error(e);
}
