const fs = require('fs');
const path = require('path');

const replacements = {
  'bg-slate-950': 'bg-slate-50',
  'bg-slate-900': 'bg-white',
  'text-white': 'text-slate-900',
  'text-slate-100': 'text-slate-800',
  'text-slate-200': 'text-slate-700',
  'text-slate-300': 'text-slate-600',
  'text-slate-400': 'text-slate-500',
  'text-slate-500': 'text-slate-400',
  'bg-slate-800': 'bg-slate-100',
  'bg-slate-800/50': 'bg-slate-200',
  'border-slate-800': 'border-slate-100',
  'border-slate-700': 'border-slate-200',
  'border-slate-700/50': 'border-slate-200/50',
  'shadow-none': 'shadow-sm', // we lost specificity, but it's okay for now. Let's just fix colors.
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(`(?<=[\\s"'\\\`])` + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + `(?=[\\s"'\\\`])`, 'g');
    content = content.replace(regex, value);
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Reverted ${filePath}`);
  }
}

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

processDirectory('./src');
