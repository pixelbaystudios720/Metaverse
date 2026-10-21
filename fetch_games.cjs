const https = require('https');
const fs = require('fs');
const path = require('path');

const games = [
  'coincatch',
  'cardclash',
  'rooftop',
  'fishing',
  'boatrace',
  'getaway',
  'royale',
  'obby',
  'roadster'
];

async function fetchGame(id) {
  const url = `https://attentionagents.fun/games/${id}.js`;
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        console.log(`Failed to fetch ${url} (status ${res.statusCode})`);
        resolve();
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const outPath = path.join('src', 'aa', 'games', `${id}.js`);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, data, 'utf8');
        console.log(`Saved ${id}.js (${data.length} bytes)`);
        resolve();
      });
    }).on('error', err => {
      console.error(`Error downloading ${url}:`, err.message);
      resolve();
    });
  });
}

async function run() {
  for (const g of games) {
    await fetchGame(g);
  }
  console.log('All minigames processed!');
}

run();
