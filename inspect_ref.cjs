const fs = require('fs');
const html = fs.readFileSync('reference_index.html', 'utf8');
const scripts = [...html.matchAll(/<script[^>]*src=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);
console.log('Scripts:', scripts);
const imports = [...html.matchAll(/import\s+.*?from\s+["']([^"']+)["']/g)].map(m => m[1]);
console.log('Imports:', imports);
const inlineScripts = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi)].length;
console.log('Inline script count:', inlineScripts);
