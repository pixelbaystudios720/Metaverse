// ==========================================================================
// 3D Metaverse World - Cyber Cafe Plaza (Attention Agents Exact Environment)
// Features: Warm Stone Plaza, Cyber Cafe building with awning & glowing windows,
// Illuminated Game Billboards with bulbs, Park Benches, Trees & Flower Grass
// ==========================================================================

import * as THREE from 'three';

export class MetaverseWorld {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.scene.add(this.root);

    this.interactiveObjects = [];
    this.lightBulbs = [];

    // Build the World
    this.buildGround();
    this.buildCyberCafe();
    this.buildGameBillboards();
    this.buildTreesAndFoliage();
    this.buildPlazaFurniture();
  }

  // 1. Warm Stone Plaza & Grassy Perimeter
  buildGround() {
    // Lush Green Grass Field (Ground Foundation)
    const grassGeo = new THREE.PlaneGeometry(160, 160);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x72c766,
      roughness: 0.8,
      metalness: 0.05,
    });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.02;
    grass.receiveShadow = true;
    this.root.add(grass);

    // Main Paved Stone Plaza Floor (Warm light stone tiles)
    const plazaGeo = new THREE.BoxGeometry(42, 0.08, 36);
    const plazaMat = new THREE.MeshStandardMaterial({
      color: 0xdfd7c8,
      roughness: 0.65,
      metalness: 0.1,
    });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.position.set(0, 0.04, 2);
    plaza.receiveShadow = true;
    this.root.add(plaza);

    // Stone Slab Line Details on Plaza
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xc8bfae });
    for (let i = -18; i <= 18; i += 3) {
      const lineX = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 36), lineMat);
      lineX.rotation.x = -Math.PI / 2;
      lineX.position.set(i, 0.081, 2);
      this.root.add(lineX);
    }
    for (let j = -16; j <= 16; j += 3) {
      const lineZ = new THREE.Mesh(new THREE.PlaneGeometry(42, 0.04), lineMat);
      lineZ.rotation.x = -Math.PI / 2;
      lineZ.position.set(0, 0.081, j + 2);
      this.root.add(lineZ);
    }

    // Flowers scattered across the grass perimeter
    const flowerColors = [0xff8fab, 0xffd166, 0xffffff, 0xbbf2f6];
    const stemMat = new THREE.MeshBasicMaterial({ color: 0x4fa843 });

    for (let i = 0; i < 90; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 23 + Math.random() * 35;
      const fx = Math.cos(angle) * radius;
      const fz = Math.sin(angle) * radius;

      // Stem
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 6), stemMat);
      stem.position.set(fx, 0.17, fz);
      this.root.add(stem);

      // Petal Head
      const petalColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];
      const petalMat = new THREE.MeshBasicMaterial({ color: petalColor });
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), petalMat);
      petal.position.set(fx, 0.36, fz);
      this.root.add(petal);
    }
  }

  // 2. The Cyber Cafe Building (Directly in front, center: z = -14)
  buildCyberCafe() {
    this.cafeGroup = new THREE.Group();
    this.cafeGroup.position.set(0, 0, -15);
    this.root.add(this.cafeGroup);

    // Building Main Body (Peach / Terracotta warm wood)
    const bodyGeo = new THREE.BoxGeometry(22, 7.5, 12);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xdf9272,
      roughness: 0.6,
      metalness: 0.1,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 3.75;
    body.castShadow = true;
    body.receiveShadow = true;
    this.cafeGroup.add(body);

    // Cafe Roof Trim / Cornice
    const roofGeo = new THREE.BoxGeometry(23, 0.8, 13);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x543627, roughness: 0.5 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 7.9;
    roof.castShadow = true;
    this.cafeGroup.add(roof);

    // Green & Cream Striped Awning
    const awningGroup = new THREE.Group();
    awningGroup.position.set(0, 4.6, 6.2);
    awningGroup.rotation.x = 0.25;

    const numStripes = 18;
    const stripeWidth = 20 / numStripes;
    for (let i = 0; i < numStripes; i++) {
      const isGreen = i % 2 === 0;
      const stripeGeo = new THREE.BoxGeometry(stripeWidth, 0.12, 2.6);
      const stripeMat = new THREE.MeshStandardMaterial({
        color: isGreen ? 0x64b88a : 0xfff6e8,
        roughness: 0.5,
      });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.set(-10 + (i + 0.5) * stripeWidth, 0, 0);
      stripe.castShadow = true;
      awningGroup.add(stripe);
    }
    this.cafeGroup.add(awningGroup);

    // Glass Entrance Door (Warm interior glow)
    const doorGeo = new THREE.BoxGeometry(3.2, 4.2, 0.15);
    const doorMat = new THREE.MeshStandardMaterial({
      color: 0x3d281e,
      roughness: 0.3,
    });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 2.1, 6.05);
    this.cafeGroup.add(door);

    // Glass Panels
    const glassGeo = new THREE.PlaneGeometry(1.2, 3.2);
    const glassMat = new THREE.MeshBasicMaterial({ color: 0xffe8cf });
    const leftGlass = new THREE.Mesh(glassGeo, glassMat);
    leftGlass.position.set(-0.7, 2.2, 6.14);
    this.cafeGroup.add(leftGlass);

    const rightGlass = new THREE.Mesh(glassGeo, glassMat);
    rightGlass.position.set(0.7, 2.2, 6.14);
    this.cafeGroup.add(rightGlass);

    // Front Cafe Windows with Warm Glowing Interior
    const windowGeo = new THREE.PlaneGeometry(5.5, 3.2);
    const winMat = new THREE.MeshBasicMaterial({ color: 0xffdfba });

    const leftWin = new THREE.Mesh(windowGeo, winMat);
    leftWin.position.set(-6.5, 2.6, 6.05);
    this.cafeGroup.add(leftWin);

    const rightWin = new THREE.Mesh(windowGeo, winMat);
    rightWin.position.set(6.5, 2.6, 6.05);
    this.cafeGroup.add(rightWin);

    // "CYBER CAFE" Sign Board above Entrance
    const signBoardGeo = new THREE.BoxGeometry(11, 1.6, 0.4);
    const signBoardMat = new THREE.MeshStandardMaterial({
      color: 0x1f2e24,
      roughness: 0.4,
    });
    const signBoard = new THREE.Mesh(signBoardGeo, signBoardMat);
    signBoard.position.set(0, 6.0, 6.3);
    this.cafeGroup.add(signBoard);

    // Neon Yellow Text Plate ("CYBER CAFE")
    const textPlateGeo = new THREE.PlaneGeometry(9.6, 1.1);
    const textPlateMat = new THREE.MeshBasicMaterial({ color: 0xffe27a });
    const textPlate = new THREE.Mesh(textPlateGeo, textPlateMat);
    textPlate.position.set(0, 6.0, 6.52);
    this.cafeGroup.add(textPlate);

    // Cafe Outdoor Patio Tables with Umbrellas
    this.createPatioTable(-9, 0, 8.5);
    this.createPatioTable(9, 0, 8.5);

    // Cute Little Companion Mascots sitting in front of cafe
    this.createMascot(-2.2, 0.6, 7.2, 0xffd166, 'CUPSEY');
    this.createMascot(0, 0.55, 7.4, 0xa8e6cf, 'ANSEM');
    this.createMascot(2.2, 0.6, 7.2, 0x8be3d0, 'DUVAL');
  }

  // Helper: Mascot Jelly Bean
  createMascot(x, y, z, color, name) {
    const mascot = new THREE.Group();
    mascot.position.set(x, y, z);

    const geo = new THREE.CapsuleGeometry(0.38, 0.35, 12, 16);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.3 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mascot.add(mesh);

    // Cute eyes
    const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.14, 0.14, 0.34);
    mascot.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.14, 0.14, 0.34);
    mascot.add(rightEye);

    this.cafeGroup.add(mascot);
  }

  // 3. Game Billboards with Glowing Lightbulbs around the Frame!
  buildGameBillboards() {
    // Billboard 1: COIN CATCHER (Left: x = -14, z = 4)
    this.createGameBillboard(
      -14, 0, 4,
      Math.PI * 0.15,
      'COIN CATCHER',
      'Collect Gold Coins & Rare Gems!',
      0xffb703,
      'coin-catcher'
    );

    // Billboard 2: ROOFTOP RUN (Right: x = 14, z = 4)
    this.createGameBillboard(
      14, 0, 4,
      -Math.PI * 0.15,
      'ROOFTOP RUN',
      'Neon Parkour Speedrun Course!',
      0x06d6a0,
      'rooftop-run'
    );
  }

  createGameBillboard(x, y, z, rotY, title, subtitle, themeColor, gameId) {
    const billboard = new THREE.Group();
    billboard.position.set(x, y, z);
    billboard.rotation.y = rotY;

    // Steel Support Legs
    const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 4.2, 12);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, metalness: 0.6 });

    const legLeft = new THREE.Mesh(legGeo, legMat);
    legLeft.position.set(-2.8, 2.1, 0);
    legLeft.castShadow = true;
    billboard.add(legLeft);

    const legRight = new THREE.Mesh(legGeo, legMat);
    legRight.position.set(2.8, 2.1, 0);
    legRight.castShadow = true;
    billboard.add(legRight);

    // Billboard Frame (Yellow/Wood border)
    const frameGeo = new THREE.BoxGeometry(6.6, 4.4, 0.3);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x3d2817,
      roughness: 0.4,
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, 4.5, 0);
    frame.castShadow = true;
    billboard.add(frame);

    // Inner Canvas Screen
    const screenGeo = new THREE.PlaneGeometry(6.0, 3.8);
    const screenMat = new THREE.MeshBasicMaterial({ color: themeColor });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 4.5, 0.17);
    billboard.add(screen);

    // "PRESS E TO PLAY" badge on the billboard
    const badgeGeo = new THREE.BoxGeometry(3.0, 0.55, 0.1);
    const badgeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const badge = new THREE.Mesh(badgeGeo, badgeMat);
    badge.position.set(0, 3.3, 0.24);
    billboard.add(badge);

    // Lightbulbs ringing the billboard perimeter
    const bulbGeo = new THREE.SphereGeometry(0.09, 8, 8);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const bulbsX = 14;
    const bulbsY = 10;
    for (let i = 0; i < bulbsX; i++) {
      const bx = -3.0 + (i / (bulbsX - 1)) * 6.0;
      const bTop = new THREE.Mesh(bulbGeo, bulbMat);
      bTop.position.set(bx, 6.4, 0.2);
      billboard.add(bTop);
      this.lightBulbs.push(bTop);

      const bBottom = new THREE.Mesh(bulbGeo, bulbMat);
      bBottom.position.set(bx, 2.6, 0.2);
      billboard.add(bBottom);
      this.lightBulbs.push(bBottom);
    }

    for (let j = 1; j < bulbsY - 1; j++) {
      const by = 2.6 + (j / (bulbsY - 1)) * 3.8;
      const bLeft = new THREE.Mesh(bulbGeo, bulbMat);
      bLeft.position.set(-3.0, by, 0.2);
      billboard.add(bLeft);
      this.lightBulbs.push(bLeft);

      const bRight = new THREE.Mesh(bulbGeo, bulbMat);
      bRight.position.set(3.0, by, 0.2);
      billboard.add(bRight);
      this.lightBulbs.push(bRight);
    }

    this.root.add(billboard);

    // Register Proximity Trigger
    this.interactiveObjects.push({
      id: gameId,
      title: title,
      desc: subtitle,
      worldPosition: new THREE.Vector3(x, 1.2, z),
      radius: 4.5,
      action: 'open-portal',
    });
  }

  // 4. Stylized Trees and Greenery
  buildTreesAndFoliage() {
    const treePositions = [
      [-18, -12], [-22, -4], [-24, 8], [-20, 18],
      [18, -12], [22, -4], [24, 8], [20, 18],
      [-10, 24], [0, 26], [10, 24],
      [-6, -26], [6, -26],
    ];

    treePositions.forEach(([tx, tz]) => {
      this.createStylizedTree(tx, 0, tz);
    });
  }

  createStylizedTree(x, y, z) {
    const tree = new THREE.Group();
    tree.position.set(x, y, z);

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 4.0, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6d4c38, roughness: 0.7 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 2.0;
    trunk.castShadow = true;
    tree.add(trunk);

    // Puffy Foliage (Three rounded spheres clustered)
    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x5ebd52,
      roughness: 0.5,
    });

    const f1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.9, 1), foliageMat);
    f1.position.set(0, 4.4, 0);
    f1.castShadow = true;
    tree.add(f1);

    const f2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 1), foliageMat);
    f2.position.set(0.6, 5.2, 0.3);
    f2.castShadow = true;
    tree.add(f2);

    const f3 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3, 1), foliageMat);
    f3.position.set(-0.5, 4.8, -0.4);
    f3.castShadow = true;
    tree.add(f3);

    this.root.add(tree);
  }

  // 5. White Park Benches and Lampposts
  buildPlazaFurniture() {
    // Park Benches (Facing Plaza)
    this.createParkBench(-12, 0.08, 0, Math.PI * 0.45);
    this.createParkBench(12, 0.08, 0, -Math.PI * 0.45);
    this.createParkBench(-8, 0.08, 12, 0);
    this.createParkBench(8, 0.08, 12, 0);

    // Modernist White Lampposts (Circular head disc)
    const lampPositions = [
      [-16, -6], [-16, 12],
      [16, -6], [16, 12],
      [-6, -4], [6, -4],
    ];

    lampPositions.forEach(([lx, lz]) => {
      this.createModernLamppost(lx, lz);
    });
  }

  createParkBench(x, y, z, rotY) {
    const bench = new THREE.Group();
    bench.position.set(x, y, z);
    bench.rotation.y = rotY;

    const benchMat = new THREE.MeshStandardMaterial({
      color: 0xeef2f7,
      roughness: 0.4,
    });

    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 0.8), benchMat);
    seat.position.y = 0.5;
    seat.castShadow = true;
    bench.add(seat);

    // Backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.65, 0.12), benchMat);
    back.position.set(0, 0.88, -0.34);
    back.castShadow = true;
    bench.add(back);

    // Legs
    for (const lx of [-0.9, 0.9]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.75), benchMat);
      leg.position.set(lx, 0.25, 0);
      leg.castShadow = true;
      bench.add(leg);
    }

    this.root.add(bench);
  }

  createModernLamppost(x, z) {
    const post = new THREE.Group();
    post.position.set(x, 0.08, z);

    const postMat = new THREE.MeshStandardMaterial({ color: 0xedf2f7, metalness: 0.3 });

    // White Pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.4, 12), postMat);
    pole.position.y = 2.2;
    pole.castShadow = true;
    post.add(pole);

    // Circular Flat Disc Head
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 24), postMat);
    head.position.y = 4.4;
    head.castShadow = true;
    post.add(head);

    // Glowing Underside Light
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.48, 24), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    glow.rotation.x = Math.PI / 2;
    glow.position.y = 4.33;
    post.add(glow);

    this.root.add(post);
  }

  createPatioTable(x, y, z) {
    const table = new THREE.Group();
    table.position.set(x, y, z);

    const mat = new THREE.MeshStandardMaterial({ color: 0xeef2f7 });

    // Base & Stem
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.3, 1.0, 12), mat);
    stem.position.y = 0.5;
    table.add(stem);

    // Tabletop
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.08, 24), mat);
    top.position.y = 1.0;
    top.castShadow = true;
    table.add(top);

    // Parasol Umbrella
    const umbrellaPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8), mat);
    umbrellaPole.position.y = 1.6;
    table.add(umbrellaPole);

    const umbrellaCanopy = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 0.9, 16),
      new THREE.MeshStandardMaterial({ color: 0x4fa876 })
    );
    umbrellaCanopy.position.y = 3.0;
    umbrellaCanopy.castShadow = true;
    table.add(umbrellaCanopy);

    this.cafeGroup.add(table);
  }

  getCurrentZone() {
    return 'Cyber Cafe Plaza';
  }

  checkInteractions(playerPos) {
    if (!playerPos) return null;
    for (const obj of this.interactiveObjects) {
      if (playerPos.distanceTo(obj.worldPosition) <= obj.radius) {
        return obj;
      }
    }
    return null;
  }

  update(deltaTime, totalTime) {
    // Animate Marquee Bulbs
    const blink = Math.floor(totalTime * 3) % 2 === 0;
    for (let i = 0; i < this.lightBulbs.length; i++) {
      this.lightBulbs[i].material.color.setHex(
        (i % 2 === 0 ? blink : !blink) ? 0xfff6a8 : 0xffffff
      );
    }
  }
}
