const fs = require('fs');
const path = require('path');

const REPLACEMENTS = [
  // html2canvas standard ESM / JS
  ['throw new Error("Attempting to parse an unsupported color function \\"" + value.name + "\\"");', 'return 0;'],
  ['throw new Error("Attempting to parse an unsupported color function \\"" + e.name + "\\"");', 'return 0;'],
  ["throw new Error('Attempting to parse an unsupported color function \"'+e.name+'\"');", 'return 0;'],
  // html2canvas-pro ESM / JS / CJS
  ['throw new Error(`Attempting to parse an unsupported color function "${value.name}"`);', 'return 0;'],
  ['throw new Error(`Attempting to parse an unsupported color function "${t.name}"`);', 'return 0;'],
  ['throw new Error(`Attempting to parse an unsupported color function "${e.name}"`);', 'return 0;'],
];

function patchFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    for (const [search, replace] of REPLACEMENTS) {
      if (content.includes(search)) {
        content = content.split(search).join(replace);
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('[html2canvas-patch] Patched:', filePath);
    }
  } catch (err) {
    console.warn('[html2canvas-patch] Error in file:', filePath, err.message);
  }
}

function walkAndPatch(dir) {
  if (!fs.existsSync(dir)) return;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      walkAndPatch(full);
    } else if (item.isFile() && (item.name.endsWith('.js') || item.name.endsWith('.mjs') || item.name.endsWith('.cjs'))) {
      patchFile(full);
    }
  }
}

walkAndPatch(path.join(__dirname, '../node_modules/html2canvas'));
walkAndPatch(path.join(__dirname, '../node_modules/html2canvas-pro'));
console.log('[html2canvas-patch] Done.');
