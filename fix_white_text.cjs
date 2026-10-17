const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // We will split by lines and look for specific dark background classes
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (
      line.includes('bg-indigo-600') ||
      line.includes('bg-slate-900') ||
      line.includes('bg-emerald-500') ||
      line.includes('bg-emerald-600') ||
      line.includes('bg-rose-500') ||
      line.includes('from-indigo-500') ||
      line.includes('bg-[#FCFAF5]/20')
    ) {
      // Replace text-slate-900 with text-white on these lines
      lines[i] = line.replace(/text-slate-900/g, 'text-white');
    }
  }
  
  content = lines.join('\n');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed text colors in ${filePath}`);
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
