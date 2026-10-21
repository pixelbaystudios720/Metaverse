const fs = require('fs');
let code = fs.readFileSync('ref_src/world3d.js', 'utf8');
if (!code.includes("id: 'hotpotato'")) {
  code = code.replace(
    "{ id: 'rooftop',",
    "{ id: 'hotpotato', title: 'Hot Potato', zone: 'arcade', kind: 'mini', x: -39.0, z: -10.6, ry: 0, spot: { x: -39.0, z: -8.9 }, color: '#ff3838', body: '#932020', icon: 'world/hotpotato.png', art: 'world/poster-hotpotato.jpg', blurb: 'Pass the ticking bomb before it explodes! Tag players and survive the shrinking arena.' },\n  { id: 'rooftop',"
  );
}
fs.writeFileSync('src/aa/world3d.js', code, 'utf8');
console.log('Restored world3d.js successfully!');
