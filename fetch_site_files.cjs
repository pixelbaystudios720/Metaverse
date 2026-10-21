const https = require('https');
const fs = require('fs');
const path = require('path');

const baseUrl = 'https://attentionagents.fun/';
const queue = [
  'screenview.js',
  'agents3d.js',
  'world3d.js',
  'game.js',
  'person3d.js',
  'sdf.js',
  'halls3d.js'
];
const visited = new Set();

function download(file) {
  if (visited.has(file)) return Promise.resolve();
  visited.add(file);

  return new Promise((resolve) => {
    const url = baseUrl + file.replace(/^\.?\//, '');
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        console.log(`Failed to fetch ${url} (status ${res.statusCode})`);
        resolve();
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const outPath = path.join('ref_src', file.replace(/^\.?\//, ''));
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, data, 'utf8');
        console.log(`Saved ${file} (${data.length} bytes)`);

        // Find more imports or assets
        const imports = [...data.matchAll(/(?:import|from)\s+["'](\.[^"']+)["']/g)].map(m => m[1]);
        const assets = [...data.matchAll(/["']([^"']+\.(?:png|jpg|jpeg|svg|webp|glb|gltf|mp3|wav|ogg))["']/gi)].map(m => m[1]);
        
        for (const imp of imports) {
          const resolved = path.normalize(path.join(path.dirname(file), imp)).replace(/\\/g, '/');
          if (!visited.has(resolved)) {
            queue.push(resolved);
          }
        }
        for (const asset of assets) {
          if (!asset.startsWith('http') && !asset.startsWith('data:') && !visited.has(asset)) {
            queue.push(asset);
          }
        }
        resolve();
      });
    }).on('error', err => {
      console.error(`Error downloading ${url}:`, err.message);
      resolve();
    });
  });
}

async function run() {
  while (queue.length > 0) {
    const next = queue.shift();
    await download(next);
  }
  console.log('Finished fetching reference files. Total visited:', visited.size);
}

run();
