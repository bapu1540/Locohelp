const fs = require('fs');
const path = require('path');

const replacements = {
  'bg-slate-50': 'bg-[#F4F1EA]',
  'bg-white': 'bg-[#FCFAF5]',
  'bg-stone-50': 'bg-[#F4F1EA]',
  'bg-[#FDFBF7]': 'bg-[#F4F1EA]',
  'bg-[#FAFAF8]': 'bg-[#FCFAF5]',
  'bg-slate-100': 'bg-[#EAE6DC]',
  'bg-stone-100': 'bg-[#EAE6DC]',
  'border-slate-100': 'border-[#EAE6DC]',
  'border-slate-200': 'border-[#DFDBCF]',
  'border-stone-200': 'border-[#DFDBCF]',
  // Let's also tone down the gradients in App.tsx
  'from-[#F8FAFC]': 'from-[#F4F1EA]',
  'via-[#FDFBF7]': 'via-[#FCFAF5]',
  'to-[#F1F5F9]': 'to-[#F4F1EA]',
  'bg-[#FDF8F5]': 'bg-[#F4F1EA]', // Roadmap
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
    console.log(`Updated ${filePath}`);
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
