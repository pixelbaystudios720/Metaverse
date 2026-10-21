// Attention Agents 3D Mascot & Visitor Avatars (Musebot, Plush, Felt, Orb)
// Exactly matching attentionagents.fun trailer mascots and cyber-cafe visitors.
import * as THREE from 'three';

export const MUSE_KINDS = {
  mint:   { c: '#d6f2d2', root: '#a3c49f', s: .92, leaf: true, name: 'Sprout Mint' },
  cream:  { c: '#fbf6ee', root: '#d8c9b6', s: 1,   leaf: false, name: 'Vanilla Cream' },
  pink:   { c: '#ffc9d8', root: '#d996ab', s: .95, leaf: false, name: 'Blush Pink' },
  blue:   { c: '#cfe0f6', root: '#97acc8', s: .95, leaf: false, name: 'Sky Blue' },
  yellow: { c: '#fff0b8', root: '#d9c07a', s: .75, leaf: false, name: 'Lemon Yellow' }
};

const VIS_GEO = {};
const vgeo = (k, f) => (VIS_GEO[k] ??= f());

export function buildVisitor(kind = 'muse', color = 'mint') {
  const g = new THREE.Group(), body = new THREE.Group();
  g.add(body);
  g.userData.visitor = true;

  const mat = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: .35, clearcoat: .6, ...o });
  const add = (geo, m, p, s) => {
    const x = new THREE.Mesh(geo, m);
    x.position.set(...p);
    if (s) x.scale.set(...s);
    x.castShadow = true;
    body.add(x);
    return x;
  };

  const sph = vgeo('s', () => new THREE.SphereGeometry(1, 32, 24));
  const eyeM = mat('#111', { roughness: .1 });
  const white = mat('#fff', { roughness: .2 });
  const blush = new THREE.MeshBasicMaterial({ color: '#ff9fb3', transparent: true, opacity: .55 });
  let H = 1.1;

  if (kind === 'orb') {
    add(sph, mat('#141418', { roughness: .12, clearcoat: 1 }), [0, .5, 0], [.5, .5, .5]);
    [-1, 1].forEach((sd) => add(sph, white, [sd * .12, .58, .44], [.045, .09, .03]));
    H = 1.05;
  } else if (kind === 'plush') {
    // Musebot plush in real 3D: shell fur stacked layers, smooth peach face panel, bead eyes, smile
    const strands = VIS_GEO.strands ??= (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const x = c.getContext('2d');
      x.fillStyle = '#000';
      x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 5200; i++) {
        const v = 150 + Math.random() * 105 | 0;
        x.fillStyle = `rgb(${v},${v},${v})`;
        x.beginPath();
        x.arc(Math.random() * 256, Math.random() * 256, .9 + Math.random() * 1.1, 0, Math.PI * 2);
        x.fill();
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(7, 7);
      return t;
    })();

    const SHELLS = 20, LEN = .14;
    const shellMats = VIS_GEO.shellMats ??= Array.from({ length: SHELLS }, (_, i) => {
      const f = i / (SHELLS - 1);
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color('#f5eee4').lerp(new THREE.Color('#c9b9a6'), (1 - f) * .55),
        roughness: 1,
        alphaMap: strands,
        transparent: true,
        alphaTest: .12 + f * .78,
        depthWrite: true,
        side: THREE.FrontSide
      });
    });

    const core = mat('#e2d6c6', { roughness: 1, clearcoat: 0 });
    const furPart = (p, sc, rz = 0) => {
      const part = new THREE.Group();
      part.position.set(...p);
      part.rotation.z = rz;
      body.add(part);
      const base = new THREE.Mesh(sph, core);
      base.scale.set(...sc);
      base.castShadow = true;
      part.add(base);
      for (let i = 0; i < SHELLS; i++) {
        const k = (i + 1) / SHELLS * LEN, m = new THREE.Mesh(sph, shellMats[i]);
        m.scale.set(sc[0] + k, sc[1] + k, sc[2] + k);
        part.add(m);
      }
    };

    furPart([0, .62, 0], [.56, .62, .5]);
    furPart([0, 1.3, .02], [.47, .52, .44]);
    [-1, 1].forEach((sd) => {
      furPart([sd * .5, .78, .14], [.15, .28, .15], sd * .3);
      furPart([sd * .19, .08, .12], [.16, .1, .2]);
    });

    const face = mat('#f6d6bd', { roughness: .45, clearcoat: .15 });
    add(sph, face, [0, 1.36, .43], [.37, .32, .2]);
    [-1, 1].forEach((sd) => {
      add(sph, eyeM, [sd * .13, 1.4, .615], [.046, .052, .028]);
      add(sph, white, [sd * .13 + .014, 1.42, .64], [.012, .012, .006]);
      add(sph, blush, [sd * .23, 1.3, .6], [.06, .032, .02]);
    });

    const smile = new THREE.Mesh(vgeo('sm', () => new THREE.TorusGeometry(.042, .008, 6, 16, Math.PI)), eyeM);
    smile.position.set(0, 1.31, .63);
    smile.rotation.z = Math.PI;
    body.add(smile);

    g.userData.flat = true;
    const soft = VIS_GEO.soft ??= (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 4, 64, 64, 62);
      gr.addColorStop(0, 'rgba(40,40,50,.42)');
      gr.addColorStop(.55, 'rgba(40,40,50,.18)');
      gr.addColorStop(1, 'rgba(40,40,50,0)');
      x.fillStyle = gr;
      x.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    })();

    const contact = new THREE.Mesh(vgeo('ct', () => new THREE.PlaneGeometry(1.3, .9)), new THREE.MeshBasicMaterial({ map: soft, transparent: true, depthWrite: false, toneMapped: false }));
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = .012;
    g.add(contact);
    body.scale.setScalar(1.18);
    H = 2.4;
  } else if (kind === 'muse') {
    // Attention Agents trailer-style muse mascot
    const V = MUSE_KINDS[color] || MUSE_KINDS.mint;
    const strands = VIS_GEO.strands ??= (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const x = c.getContext('2d');
      x.fillStyle = '#000';
      x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 5200; i++) {
        const v = 150 + Math.random() * 105 | 0;
        x.fillStyle = `rgb(${v},${v},${v})`;
        x.beginPath();
        x.arc(Math.random() * 256, Math.random() * 256, .9 + Math.random() * 1.1, 0, Math.PI * 2);
        x.fill();
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(7, 7);
      return t;
    })();

    const SH = 16, LEN = .15;
    const sm = VIS_GEO['muse' + V.c] ??= Array.from({ length: SH }, (_, i) => {
      const f2 = i / (SH - 1);
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(V.c).lerp(new THREE.Color(V.root), (1 - f2) * .4),
        emissive: new THREE.Color(V.c).multiplyScalar(.12),
        roughness: 1,
        alphaMap: strands,
        transparent: true,
        alphaTest: .1 + f2 * .8
      });
    });

    const core = VIS_GEO['musecore' + V.c] ??= new THREE.MeshStandardMaterial({
      color: new THREE.Color(V.c).lerp(new THREE.Color(V.root), .5),
      roughness: 1
    });

    const fur = (p, sc, shells = SH, rx = 0, rz = 0, len = LEN) => {
      const part = new THREE.Group();
      part.position.set(...p);
      part.rotation.set(rx, 0, rz);
      body.add(part);
      const b = new THREE.Mesh(sph, core);
      b.scale.set(...sc);
      b.castShadow = true;
      part.add(b);
      for (let i = 0; i < shells; i++) {
        const k = (i + 1) / shells * len, m = new THREE.Mesh(sph, sm[Math.round(i * (SH - 1) / Math.max(1, shells - 1))]);
        m.scale.set(sc[0] + k, sc[1] + k, sc[2] + k);
        part.add(m);
      }
    };

    fur([0, .6, 0], [.4, .56, .36]);
    [-1, 1].forEach((sd) => {
      fur([sd * .23, .43, .3], [.12, .16, .11], 6, -.3, sd * .9, .08);
      fur([sd * .16, .06, .12], [.13, .08, .15], 5, 0, 0, .07);
    });

    const face = VIS_GEO.museface ??= mat('#f8d9c2', { roughness: .5, clearcoat: .2, sheen: .4, sheenColor: new THREE.Color('#fff2e8') });
    add(sph, face, [0, .8, .37], [.34, .29, .18]);

    [-1, 1].forEach((sd) => {
      add(sph, eyeM, [sd * .125, .83, .535], [.072, .082, .035]);
      add(sph, white, [sd * .125 + .024, .865, .565], [.022, .022, .01]);
      add(sph, blush, [sd * .22, .74, .52], [.075, .042, .02]);
    });

    const smile = new THREE.Mesh(vgeo('sm', () => new THREE.TorusGeometry(.042, .008, 6, 16, Math.PI)), eyeM);
    smile.position.set(0, .75, .55);
    smile.rotation.z = Math.PI;
    smile.scale.setScalar(1.2);
    body.add(smile);

    if (V.leaf) {
      const lm = VIS_GEO.leaf ??= mat('#8fd18a', { roughness: .6, clearcoat: .2 });
      [-1, 1].forEach((sd) => {
        const l = add(sph, lm, [sd * .15, 1.24, 0], [.09, .17, .035]);
        l.rotation.z = -sd * .6;
      });
    }

    g.userData.waddle = true;
    H = 1.55 * V.s;
    body.scale.setScalar(V.s * 1.25);
  } else if (kind === 'felt') {
    const f = mat(color, { roughness: 1, clearcoat: 0, sheen: .8, sheenColor: new THREE.Color('#ffffff') });
    add(sph, f, [0, .5, 0], [.46, .52, .4]);
    [-1, 1].forEach((sd) => {
      add(sph, eyeM, [sd * .12, .62, .38], [.04, .05, .03]);
      add(sph, f, [sd * .44, .42, 0], [.11, .14, .1]);
    });
    H = 1.15;
  }

  const ring = new THREE.Mesh(vgeo('r', () => new THREE.TorusGeometry(.62, .03, 8, 40)), new THREE.MeshBasicMaterial({ color: '#8cc8ff', transparent: true, opacity: .7 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = .02;
  if (kind !== 'plush' && kind !== 'muse') g.add(ring);

  g.userData.creature = {
    H,
    strideFor: () => 0.4,
    walk: 0,
    walkPhase: 0,
    view: g.userData.creatureView,
    update(t, dt = 0.016) {
      if (g.userData.waddle) {
        body.position.y = Math.abs(Math.sin(this.walkPhase)) * .07 * this.walk + Math.sin(t * 2.2) * .012;
        body.rotation.z = Math.sin(this.walkPhase) * .14 * this.walk;
        return;
      }
      body.position.y = g.userData.flat ? 0 : Math.abs(Math.sin(this.walkPhase)) * .08 * this.walk + Math.sin(t * 2) * .02;
      body.rotation.z = Math.sin(this.walkPhase) * .08 * this.walk;
      ring.material.opacity = .45 + .25 * Math.sin(t * 3);
    }
  };

  return g;
}
