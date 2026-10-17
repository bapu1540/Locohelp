const fs = require('fs');
const path = require('path');

const replacements = {
  'bg-slate-50': 'bg-slate-950',
  'bg-white': 'bg-slate-900',
  'text-slate-900': 'text-white',
  'text-slate-800': 'text-slate-100',
  'text-slate-700': 'text-slate-200',
  'text-slate-600': 'text-slate-300',
  'text-slate-500': 'text-slate-400',
  'text-slate-400': 'text-slate-500',
  'bg-slate-100': 'bg-slate-800',
  'bg-slate-200': 'bg-slate-800/50',
  'border-slate-100': 'border-slate-800',
  'border-slate-200': 'border-slate-700',
  'border-slate-300': 'border-slate-700',
  'bg-[#FDF8F5]': 'bg-slate-950',
  'from-[#F8FAFC]': 'from-slate-950',
  'via-[#FDFBF7]': 'via-slate-900',
  'to-[#F1F5F9]': 'to-slate-950',
  'bg-stone-50': 'bg-slate-950',
  'bg-stone-100': 'bg-slate-900',
  'shadow-sm': 'shadow-none',
  'shadow-md': 'shadow-none',
  'shadow-lg': 'shadow-none',
};

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  for (const [key, value] of Object.entries(replacements)) {
    // We use a regex to match the exact class name and not a substring
    const regex = new RegExp(`(?<=[\\s"'\\\`])` + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + `(?=[\\s"'\\\`])`, 'g');
    content = content.replace(regex, value);
  }
  
  // Custom replaces
  content = content.replace(/border-slate-200\/50/g, 'border-slate-700/50');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

processDirectory('./src');
