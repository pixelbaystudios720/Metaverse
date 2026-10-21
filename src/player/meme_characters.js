// ==========================================================================
// 3D Funny & Viral Meme Style Character Generator
// 10 Iconic Internet Meme Legends:
// 1. Doge CoinBro (Shiba Inu)
// 2. Frogge The Pepe (Feels Good Man)
// 3. Banana Bro (Peel The Hype)
// 4. Retro CRT TV Guy (Living Meme Screen)
// 5. Giga Moai 🗿 (Stone Cold Chad)
// 6. Ayy Lmao Alien (Area 51 Legend)
// 7. Chill Capybara ("OK I Pull Up" with Orange on Head)
// 8. Pop Cat (POPOPOPOP animated mouth)
// 9. Gigachad Rubber Ducky (Royal Golden Crown & Wings)
// 10. Sus Crewmate (Among Memes with Fried Egg Hat)
// Features: Full color customization (skin, top, bottom, shoes) & funny animations!
// ==========================================================================

import * as THREE from 'three';

export const MEME_CATALOG = [
  {
    id: 'meme_doge',
    name: 'Doge CoinBro',
    category: 'Meme Legends',
    tagline: 'Much Wow, Very Metaverse',
    description: 'The legendary Shiba Inu with pixel sunglasses, doge ears, gold chain, and fast wagging curly tail.',
    icon: '🐕',
    defaultColors: {
      skinColor: '#f59e0b',
      topColor: '#8b5cf6',
      bottomColor: '#1e1b4b',
      shoeColor: '#ffffff'
    }
  },
  {
    id: 'meme_pepe',
    name: 'Frogge The Pepe',
    category: 'Meme Legends',
    tagline: 'Feels Good Man',
    description: 'Iconic derpy green meme frog with big bulging cartoon eyes, cozy oversized hoodie, and skate kicks.',
    icon: '🐸',
    defaultColors: {
      skinColor: '#84cc16',
      topColor: '#3b82f6',
      bottomColor: '#1f2937',
      shoeColor: '#ef4444'
    }
  },
  {
    id: 'meme_capybara',
    name: 'Chill Capybara',
    category: 'Viral Legends',
    tagline: 'OK I Pull Up',
    description: 'The chillest creature in the universe. Balanced Japanese citrus orange on head, retro shades, and cozy vibe.',
    icon: '🦫',
    defaultColors: {
      skinColor: '#a16207',
      topColor: '#059669',
      bottomColor: '#374151',
      shoeColor: '#f59e0b'
    }
  },
  {
    id: 'meme_banana',
    name: 'Banana Bro',
    category: 'Food Memes',
    tagline: 'Peel The Hype',
    description: 'Hilarious bright yellow banana suit with peeled flaps, retro 80s shutter shades, and chunky streetwear kicks.',
    icon: '🍌',
    defaultColors: {
      skinColor: '#facc15',
      topColor: '#eab308',
      bottomColor: '#111827',
      shoeColor: '#3b82f6'
    }
  },
  {
    id: 'meme_popcat',
    name: 'Pop Cat',
    category: 'Viral Legends',
    tagline: 'PO-PO-PO-POP!',
    description: 'The world-famous wide-eyed cat meme. Mouth actually pops wide open when you walk or run!',
    icon: '🐱',
    defaultColors: {
      skinColor: '#fef08a',
      topColor: '#f43f5e',
      bottomColor: '#18181b',
      shoeColor: '#ffffff'
    }
  },
  {
    id: 'meme_duck',
    name: 'Gigachad Ducky',
    category: 'Funny Animals',
    tagline: 'Squeak & Destroy',
    description: 'Massive squeaky yellow rubber duck body, sparkling royal gold crown with jewels, flapping wings and high-tops.',
    icon: '🦆',
    defaultColors: {
      skinColor: '#eab308',
      topColor: '#f97316',
      bottomColor: '#1e293b',
      shoeColor: '#0284c7'
    }
  },
  {
    id: 'meme_sus',
    name: 'Sus Crewmate',
    category: 'Gaming Memes',
    tagline: 'Definitely Not Impostor',
    description: 'Vibrant space explorer capsule with glossy reflective glass visor, oxygen tank backpack, and a fried egg hat.',
    icon: '🚀',
    defaultColors: {
      skinColor: '#ef4444',
      topColor: '#dc2626',
      bottomColor: '#991b1b',
      shoeColor: '#7f1d1d'
    }
  },
  {
    id: 'meme_tvhead',
    name: 'Retro CRT TV Guy',
    category: 'Cyber Memes',
    tagline: 'Living Meme Screen',
    description: 'Retro CRT monitor head with animated glowing emoji faces, dual rabbit antennas, and oversized hoodie.',
    icon: '📺',
    defaultColors: {
      skinColor: '#6366f1',
      topColor: '#ec4899',
      bottomColor: '#18181b',
      shoeColor: '#06b6d4'
    }
  },
  {
    id: 'meme_moai',
    name: 'Giga Moai (🗿)',
    category: 'Chad Memes',
    tagline: 'Stone Cold Chad',
    description: 'The ancient Easter Island stone head on funny streetwear legs with a thick gold chain and black sunglasses.',
    icon: '🗿',
    defaultColors: {
      skinColor: '#78716c',
      topColor: '#292524',
      bottomColor: '#1c1917',
      shoeColor: '#f59e0b'
    }
  },
  {
    id: 'meme_alien',
    name: 'Ayy Lmao Alien',
    category: 'Space Memes',
    tagline: 'Take Me To Your Plaza',
    description: 'Classic Area 51 neon green alien with giant glossy black almond eyes, wiggling glowing antenna and puffer jacket.',
    icon: '👽',
    defaultColors: {
      skinColor: '#22c55e',
      topColor: '#a855f7',
      bottomColor: '#0f172a',
      shoeColor: '#e2e8f0'
    }
  }
];

export function buildMemeCharacter(id, config = {}) {
  const group = new THREE.Group();
  const materials = [];
  const animParts = {};

  const skinHex = config.skinColor || '#f59e0b';
  const topHex = config.topColor || '#8b5cf6';
  const bottomHex = config.bottomColor || '#1e1b4b';
  const shoeHex = config.shoeColor || '#ffffff';

  // Shared Dynamic Materials
  const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.5, metalness: 0.1 });
  skinMat.name = 'skin';
  materials.push(skinMat);

  const topMat = new THREE.MeshStandardMaterial({ color: topHex, roughness: 0.7, metalness: 0.05 });
  topMat.name = 'top';
  materials.push(topMat);

  const bottomMat = new THREE.MeshStandardMaterial({ color: bottomHex, roughness: 0.8, metalness: 0.05 });
  bottomMat.name = 'bottom';
  materials.push(bottomMat);

  const shoeMat = new THREE.MeshStandardMaterial({ color: shoeHex, roughness: 0.4, metalness: 0.1 });
  shoeMat.name = 'shoe';
  materials.push(shoeMat);

  const blackMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.25 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });
  const greenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.6 });

  // --------------------------------------------------------------------------
  // 1. DOGE COINBRO
  // --------------------------------------------------------------------------
  if (id === 'meme_doge') {
    const torsoGeo = new THREE.CylinderGeometry(0.32, 0.38, 0.58, 20);
    const torso = new THREE.Mesh(torsoGeo, topMat);
    torso.position.y = 0.75;
    group.add(torso);

    const chainGeo = new THREE.TorusGeometry(0.32, 0.035, 12, 28);
    const chain = new THREE.Mesh(chainGeo, goldMat);
    chain.position.set(0, 0.95, 0.08);
    chain.rotation.x = Math.PI / 3;
    group.add(chain);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.25, 0);

    const headGeo = new THREE.SphereGeometry(0.38, 24, 20);
    const head = new THREE.Mesh(headGeo, skinMat);
    headGroup.add(head);

    const snoutGeo = new THREE.ConeGeometry(0.18, 0.28, 16);
    const whiteSnoutMat = new THREE.MeshStandardMaterial({ color: 0xffeedd, roughness: 0.6 });
    const snout = new THREE.Mesh(snoutGeo, whiteSnoutMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.05, 0.35);
    headGroup.add(snout);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), blackMat);
    nose.position.set(0, -0.02, 0.5);
    headGroup.add(nose);

    const tongueGeo = new THREE.BoxGeometry(0.09, 0.02, 0.16);
    const tongueMat = new THREE.MeshBasicMaterial({ color: 0xff6b8b });
    const tongue = new THREE.Mesh(tongueGeo, tongueMat);
    tongue.position.set(0.04, -0.15, 0.42);
    tongue.rotation.x = 0.25;
    headGroup.add(tongue);

    const earGeo = new THREE.ConeGeometry(0.14, 0.3, 12);
    const earL = new THREE.Mesh(earGeo, skinMat);
    earL.position.set(-0.24, 0.38, -0.05);
    earL.rotation.z = 0.35;
    earL.rotation.x = -0.1;
    headGroup.add(earL);

    const earR = new THREE.Mesh(earGeo, skinMat);
    earR.position.set(0.24, 0.38, -0.05);
    earR.rotation.z = -0.35;
    earR.rotation.x = -0.1;
    headGroup.add(earR);

    const shadesGeo = new THREE.BoxGeometry(0.52, 0.12, 0.06);
    const shades = new THREE.Mesh(shadesGeo, blackMat);
    shades.position.set(0, 0.08, 0.36);
    headGroup.add(shades);

    group.add(headGroup);
    animParts.head = headGroup;

    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.55, -0.35);
    const tailGeo = new THREE.TorusGeometry(0.18, 0.06, 12, 20, Math.PI * 1.5);
    const tail = new THREE.Mesh(tailGeo, skinMat);
    tail.rotation.y = Math.PI / 2;
    tailGroup.add(tail);
    group.add(tailGroup);
    animParts.tail = tailGroup;

    buildLegsAndShoes(group, bottomMat, shoeMat, animParts);
  }

  // --------------------------------------------------------------------------
  // 2. FROGGE THE PEPE
  // --------------------------------------------------------------------------
  else if (id === 'meme_pepe') {
    const torsoGeo = new THREE.CylinderGeometry(0.36, 0.44, 0.62, 20);
    const torso = new THREE.Mesh(torsoGeo, topMat);
    torso.position.y = 0.76;
    group.add(torso);

    const pocketGeo = new THREE.BoxGeometry(0.38, 0.22, 0.08);
    const pocket = new THREE.Mesh(pocketGeo, topMat);
    pocket.position.set(0, 0.65, 0.36);
    group.add(pocket);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.25, 0);

    const headGeo = new THREE.SphereGeometry(0.42, 24, 18);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.scale.set(1.15, 0.85, 1.0);
    headGroup.add(head);

    const eyeBallGeo = new THREE.SphereGeometry(0.15, 18, 14);
    const eyeL = new THREE.Mesh(eyeBallGeo, whiteMat);
    eyeL.position.set(-0.24, 0.3, 0.22);
    headGroup.add(eyeL);

    const pupilL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12), blackMat);
    pupilL.rotation.x = Math.PI / 2;
    pupilL.position.set(-0.24, 0.3, 0.36);
    headGroup.add(pupilL);

    const eyeR = new THREE.Mesh(eyeBallGeo, whiteMat);
    eyeR.position.set(0.24, 0.3, 0.22);
    headGroup.add(eyeR);

    const pupilR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12), blackMat);
    pupilR.rotation.x = Math.PI / 2;
    pupilR.position.set(0.24, 0.3, 0.36);
    headGroup.add(pupilR);

    const lipGeo = new THREE.TorusGeometry(0.3, 0.045, 10, 24, Math.PI);
    const lipMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.6 });
    const lip = new THREE.Mesh(lipGeo, lipMat);
    lip.position.set(0, -0.16, 0.35);
    lip.rotation.z = Math.PI;
    headGroup.add(lip);

    group.add(headGroup);
    animParts.head = headGroup;

    buildLegsAndShoes(group, bottomMat, shoeMat, animParts);
  }

  // --------------------------------------------------------------------------
  // 3. CHILL CAPYBARA ("OK I PULL UP")
  // --------------------------------------------------------------------------
  else if (id === 'meme_capybara') {
    // Torso (Comfy rounded Hawaiian shirt / hoodie body)
    const torsoGeo = new THREE.CylinderGeometry(0.38, 0.44, 0.62, 20);
    const torso = new THREE.Mesh(torsoGeo, topMat);
    torso.position.y = 0.74;
    group.add(torso);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.25, 0);

    // Boxy Capybara Head
    const headGeo = new THREE.BoxGeometry(0.55, 0.5, 0.68);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 0, 0.08);
    headGroup.add(head);

    // Dark brown snout nostrils
    const snGeo = new THREE.BoxGeometry(0.1, 0.06, 0.04);
    const snL = new THREE.Mesh(snGeo, blackMat);
    snL.position.set(-0.12, -0.12, 0.43);
    headGroup.add(snL);

    const snR = new THREE.Mesh(snGeo, blackMat);
    snR.position.set(0.12, -0.12, 0.43);
    headGroup.add(snR);

    // Sleepy droopy eyes
    const eyeGeo = new THREE.BoxGeometry(0.14, 0.04, 0.04);
    const eyeL = new THREE.Mesh(eyeGeo, blackMat);
    eyeL.position.set(-0.28, 0.08, 0.22);
    headGroup.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, blackMat);
    eyeR.position.set(0.28, 0.08, 0.22);
    headGroup.add(eyeR);

    // Tiny round ears
    const earGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const earL = new THREE.Mesh(earGeo, skinMat);
    earL.scale.set(0.6, 1.0, 0.8);
    earL.position.set(-0.3, 0.24, -0.18);
    headGroup.add(earL);

    const earR = new THREE.Mesh(earGeo, skinMat);
    earR.scale.set(0.6, 1.0, 0.8);
    earR.position.set(0.3, 0.24, -0.18);
    headGroup.add(earR);

    // Retro Round Sunglasses
    const frameGeo = new THREE.TorusGeometry(0.1, 0.02, 10, 20);
    const glassL = new THREE.Mesh(frameGeo, blackMat);
    glassL.position.set(-0.16, 0.08, 0.43);
    headGroup.add(glassL);

    const glassR = new THREE.Mesh(frameGeo, blackMat);
    glassR.position.set(0.16, 0.08, 0.43);
    headGroup.add(glassR);

    const bridgeGeo = new THREE.BoxGeometry(0.1, 0.02, 0.02);
    const bridge = new THREE.Mesh(bridgeGeo, blackMat);
    bridge.position.set(0, 0.08, 0.43);
    headGroup.add(bridge);

    // THE FAMOUS CITRUS ORANGE (YUZU) ON HEAD
    const orangeGroup = new THREE.Group();
    orangeGroup.position.set(0, 0.36, 0.08);

    const yuzuGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const yuzu = new THREE.Mesh(yuzuGeo, orangeMat);
    orangeGroup.add(yuzu);

    // Little green leaf on top of orange
    const leafGeo = new THREE.ConeGeometry(0.05, 0.12, 8);
    const leaf = new THREE.Mesh(leafGeo, greenMat);
    leaf.position.set(0.04, 0.14, 0);
    leaf.rotation.z = -0.6;
    orangeGroup.add(leaf);

    headGroup.add(orangeGroup);
    animParts.accessory = orangeGroup;

    group.add(headGroup);
    animParts.head = headGroup;

    buildLegsAndShoes(group, bottomMat, shoeMat, animParts, 0.9);
  }

  // --------------------------------------------------------------------------
  // 4. BANANA BRO
  // --------------------------------------------------------------------------
  else if (id === 'meme_banana') {
    const bananaGroup = new THREE.Group();
    bananaGroup.position.set(0, 1.05, 0);

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.75, 0),
      new THREE.Vector3(0.08, 0, 0.06),
      new THREE.Vector3(0.16, 0.75, 0.08),
      new THREE.Vector3(0.08, 1.1, 0.04)
    ]);

    const bananaGeo = new THREE.TubeGeometry(curve, 24, 0.38, 16, false);
    const banana = new THREE.Mesh(bananaGeo, skinMat);
    bananaGroup.add(banana);

    const stemGeo = new THREE.CylinderGeometry(0.08, 0.14, 0.28, 10);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.9 });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.set(0.08, 1.22, 0.04);
    stem.rotation.z = -0.2;
    bananaGroup.add(stem);

    const peelGeo = new THREE.ConeGeometry(0.2, 0.6, 6);
    for (let i = 0; i < 4; i++) {
      const peel = new THREE.Mesh(peelGeo, skinMat);
      const angle = (i * Math.PI) / 2;
      peel.position.set(Math.cos(angle) * 0.34, 0.15, Math.sin(angle) * 0.34);
      peel.rotation.x = Math.sin(angle) * 0.7;
      peel.rotation.z = -Math.cos(angle) * 0.7;
      bananaGroup.add(peel);
    }

    const shadesGeo = new THREE.BoxGeometry(0.5, 0.16, 0.12);
    const shades = new THREE.Mesh(shadesGeo, blackMat);
    shades.position.set(0.12, 0.55, 0.42);
    bananaGroup.add(shades);

    const smileGeo = new THREE.TorusGeometry(0.16, 0.025, 8, 16, Math.PI);
    const smile = new THREE.Mesh(smileGeo, blackMat);
    smile.position.set(0.12, 0.32, 0.44);
    bananaGroup.add(smile);

    group.add(bananaGroup);
    animParts.head = bananaGroup;

    buildLegsAndShoes(group, bottomMat, shoeMat, animParts);
  }

  // --------------------------------------------------------------------------
  // 5. POP CAT (POPOPOPOP!)
  // --------------------------------------------------------------------------
  else if (id === 'meme_popcat') {
    // Comfy oversized hoodie torso
    const torsoGeo = new THREE.CylinderGeometry(0.34, 0.42, 0.6, 20);
    const torso = new THREE.Mesh(torsoGeo, topMat);
    torso.position.y = 0.75;
    group.add(torso);

    // Gold Fish Pendant
    const fishGeo = new THREE.ConeGeometry(0.08, 0.16, 8);
    const fish = new THREE.Mesh(fishGeo, goldMat);
    fish.rotation.z = Math.PI / 2;
    fish.position.set(0, 0.88, 0.36);
    group.add(fish);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.25, 0);

    // Spherical Kitty Head
    const headGeo = new THREE.SphereGeometry(0.42, 24, 20);
    const head = new THREE.Mesh(headGeo, skinMat);
    headGroup.add(head);

    // Pointy Cat Ears
    const earGeo = new THREE.ConeGeometry(0.14, 0.26, 12);
    const earL = new THREE.Mesh(earGeo, skinMat);
    earL.position.set(-0.24, 0.38, 0);
    earL.rotation.z = 0.4;
    headGroup.add(earL);

    const earR = new THREE.Mesh(earGeo, skinMat);
    earR.position.set(0.24, 0.38, 0);
    earR.rotation.z = -0.4;
    headGroup.add(earR);

    // Huge Anime Cartoon Eyes
    const eyeGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const eyeL = new THREE.Mesh(eyeGeo, blackMat);
    eyeL.position.set(-0.18, 0.08, 0.36);
    headGroup.add(eyeL);

    const glintL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), whiteMat);
    glintL.position.set(-0.16, 0.11, 0.46);
    headGroup.add(glintL);

    const eyeR = new THREE.Mesh(eyeGeo, blackMat);
    eyeR.position.set(0.18, 0.08, 0.36);
    headGroup.add(eyeR);

    const glintR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), whiteMat);
    glintR.position.set(0.2, 0.11, 0.46);
    headGroup.add(glintR);

    // DYNAMIC POP MOUTH (Round deep O cylinder cavity)
    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, -0.14, 0.38);

    const mouthCavityGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.18, 20);
    const mouthCavityMat = new THREE.MeshBasicMaterial({ color: 0x670e1a });
    const mouthCavity = new THREE.Mesh(mouthCavityGeo, mouthCavityMat);
    mouthCavity.rotation.x = Math.PI / 2;
    mouthGroup.add(mouthCavity);

    const mouthRimGeo = new THREE.TorusGeometry(0.16, 0.035, 12, 24);
    const mouthRimMat = new THREE.MeshBasicMaterial({ color: 0xff859a });
    const mouthRim = new THREE.Mesh(mouthRimGeo, mouthRimMat);
    mouthGroup.add(mouthRim);

    headGroup.add(mouthGroup);
    animParts.popMouth = mouthGroup;

    group.add(headGroup);
    animParts.head = headGroup;

    buildLegsAndShoes(group, bottomMat, shoeMat, animParts);
  }

  // --------------------------------------------------------------------------
  // 6. GIGACHAD RUBBER DUCKY
  // --------------------------------------------------------------------------
  else if (id === 'meme_duck') {
    // Round Chubby Duck Body
    const bodyGeo = new THREE.SphereGeometry(0.46, 24, 20);
    const body = new THREE.Mesh(bodyGeo, skinMat);
    body.scale.set(1.0, 0.9, 1.15);
    body.position.set(0, 0.78, 0);
    group.add(body);

    // Flapping Wings on sides
    const wingGeo = new THREE.BoxGeometry(0.1, 0.28, 0.42);
    const wingL = new THREE.Mesh(wingGeo, skinMat);
    wingL.position.set(-0.48, 0.8, 0);
    group.add(wingL);
    animParts.wingL = wingL;

    const wingR = new THREE.Mesh(wingGeo, skinMat);
    wingR.position.set(0.48, 0.8, 0);
    group.add(wingR);
    animParts.wingR = wingR;

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.3, 0.15);

    // Cute Round Duck Head
    const headGeo = new THREE.SphereGeometry(0.38, 22, 18);
    const head = new THREE.Mesh(headGeo, skinMat);
    headGroup.add(head);

    // Giant Glossy Orange Duck Bill
    const beakGeo = new THREE.BoxGeometry(0.38, 0.12, 0.32);
    const beak = new THREE.Mesh(beakGeo, orangeMat);
    beak.position.set(0, -0.08, 0.38);
    headGroup.add(beak);

    // Big Cartoon Googly Eyes
    const eyeBallGeo = new THREE.SphereGeometry(0.12, 16, 14);
    const eyeL = new THREE.Mesh(eyeBallGeo, whiteMat);
    eyeL.position.set(-0.18, 0.14, 0.26);
    headGroup.add(eyeL);

    const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), blackMat);
    pupilL.position.set(-0.18, 0.14, 0.36);
    headGroup.add(pupilL);

    const eyeR = new THREE.Mesh(eyeBallGeo, whiteMat);
    eyeR.position.set(0.18, 0.14, 0.26);
    headGroup.add(eyeR);

    const pupilR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), blackMat);
    pupilR.position.set(0.18, 0.14, 0.36);
    headGroup.add(pupilR);

    // ROYAL GOLDEN CROWN WITH GEMS
    const crownGroup = new THREE.Group();
    crownGroup.position.set(0, 0.4, 0);

    const crownGeo = new THREE.CylinderGeometry(0.24, 0.2, 0.16, 6);
    const crown = new THREE.Mesh(crownGeo, goldMat);
    crownGroup.add(crown);

    const gemGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const gemMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const gem = new THREE.Mesh(gemGeo, gemMat);
    gem.position.set(0, 0.08, 0.22);
    crownGroup.add(gem);

    headGroup.add(crownGroup);

    group.add(headGroup);
    animParts.head = headGroup;

    buildLegsAndShoes(group, bottomMat, shoeMat, animParts, 0.95);
  }

  // --------------------------------------------------------------------------
  // 7. SUS CREWMATE ("AMONG MEMES")
  // --------------------------------------------------------------------------
  else if (id === 'meme_sus') {
    // Bean Spacesuit Capsule
    const bodyGeo = new THREE.CapsuleGeometry(0.4, 0.55, 16, 24);
    const body = new THREE.Mesh(bodyGeo, skinMat);
    body.position.set(0, 0.95, 0);
    group.add(body);

    // Oxygen Tank Backpack
    const tankGeo = new THREE.BoxGeometry(0.48, 0.65, 0.26);
    const tank = new THREE.Mesh(tankGeo, topMat);
    tank.position.set(0, 0.95, -0.35);
    group.add(tank);

    // Giant Curved Cyan Reflective Glass Visor
    const visorGeo = new THREE.SphereGeometry(0.28, 20, 16);
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.3
    });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.scale.set(1.2, 0.72, 0.6);
    visor.position.set(0, 1.05, 0.32);
    group.add(visor);

    // Visor Specular Glint
    const glintGeo = new THREE.BoxGeometry(0.18, 0.04, 0.02);
    const glint = new THREE.Mesh(glintGeo, whiteMat);
    glint.position.set(-0.08, 1.14, 0.48);
    glint.rotation.z = 0.2;
    group.add(glint);

    // Sunny-Side Up Fried Egg Hat
    const eggGroup = new THREE.Group();
    eggGroup.position.set(0, 1.48, 0);

    const eggWhiteGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.04, 16);
    const eggWhite = new THREE.Mesh(eggWhiteGeo, whiteMat);
    eggGroup.add(eggWhite);

    const yolkGeo = new THREE.SphereGeometry(0.1, 14, 14);
    const yolk = new THREE.Mesh(yolkGeo, orangeMat);
    yolk.scale.set(1, 0.6, 1);
    yolk.position.set(0.04, 0.04, 0.02);
    eggGroup.add(yolk);

    group.add(eggGroup);
    animParts.eggHat = eggGroup;

    buildLegsAndShoes(group, bottomMat, shoeMat, animParts, 0.85);
  }

  // --------------------------------------------------------------------------
  // 8. RETRO CRT TV GUY
  // --------------------------------------------------------------------------
  else if (id === 'meme_tvhead') {
    const torsoGeo = new THREE.BoxGeometry(0.7, 0.64, 0.46);
    const torso = new THREE.Mesh(torsoGeo, topMat);
    torso.position.y = 0.75;
    group.add(torso);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.3, 0);

    const tvBoxGeo = new THREE.BoxGeometry(0.85, 0.7, 0.6);
    const tvCaseMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.4, metalness: 0.4 });
    const tvBox = new THREE.Mesh(tvBoxGeo, tvCaseMat);
    headGroup.add(tvBox);

    const screenGeo = new THREE.PlaneGeometry(0.65, 0.5);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, 256, 200);
    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 58px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 15;
    ctx.fillText('(^ _ ^)', 128, 100);

    const screenTexture = new THREE.CanvasTexture(canvas);
    const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 0, 0.305);
    headGroup.add(screen);
    animParts.tvCanvas = canvas;
    animParts.tvCtx = ctx;
    animParts.tvTexture = screenTexture;

    const antennaGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.4, 8);
    const antMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.9, roughness: 0.1 });

    const antL = new THREE.Mesh(antennaGeo, antMat);
    antL.position.set(-0.25, 0.52, 0);
    antL.rotation.z = 0.35;
    headGroup.add(antL);

    const antR = new THREE.Mesh(antennaGeo, antMat);
    antR.position.set(0.25, 0.52, 0);
    antR.rotation.z = -0.35;
    headGroup.add(antR);

    group.add(headGroup);
    animParts.head = headGroup;

    buildLegsAndShoes(group, bottomMat, shoeMat, animParts);
  }

  // --------------------------------------------------------------------------
  // 9. GIGA MOAI (🗿)
  // --------------------------------------------------------------------------
  else if (id === 'meme_moai') {
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.25, 0);

    const moaiGeo = new THREE.BoxGeometry(0.72, 1.15, 0.65);
    const moai = new THREE.Mesh(moaiGeo, skinMat);
    headGroup.add(moai);

    const browGeo = new THREE.BoxGeometry(0.76, 0.22, 0.2);
    const brow = new THREE.Mesh(browGeo, skinMat);
    brow.position.set(0, 0.35, 0.32);
    headGroup.add(brow);

    const noseGeo = new THREE.BoxGeometry(0.24, 0.55, 0.28);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, 0.02, 0.4);
    headGroup.add(nose);

    const lipsGeo = new THREE.BoxGeometry(0.38, 0.14, 0.16);
    const lips = new THREE.Mesh(lipsGeo, skinMat);
    lips.position.set(0, -0.36, 0.34);
    headGroup.add(lips);

    const glassesGeo = new THREE.BoxGeometry(0.78, 0.2, 0.12);
    const glasses = new THREE.Mesh(glassesGeo, blackMat);
    glasses.position.set(0, 0.24, 0.38);
    headGroup.add(glasses);

    const chainGeo = new THREE.TorusGeometry(0.42, 0.045, 12, 32);
    const chain = new THREE.Mesh(chainGeo, goldMat);
    chain.position.set(0, -0.58, 0.15);
    chain.rotation.x = Math.PI / 3;
    headGroup.add(chain);

    group.add(headGroup);
    animParts.head = headGroup;

    buildLegsAndShoes(group, bottomMat, shoeMat, animParts, 0.85);
  }

  // --------------------------------------------------------------------------
  // 10. COSMIC AYY LMAO ALIEN
  // --------------------------------------------------------------------------
  else {
    const torsoGeo = new THREE.CylinderGeometry(0.34, 0.38, 0.58, 20);
    const torso = new THREE.Mesh(torsoGeo, topMat);
    torso.position.y = 0.75;
    group.add(torso);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.25, 0);

    const headGeo = new THREE.SphereGeometry(0.42, 24, 20);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.scale.set(1.15, 1.3, 1.0);
    headGroup.add(head);

    const eyeGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const glossEyeMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.9 });

    const eyeL = new THREE.Mesh(eyeGeo, glossEyeMat);
    eyeL.scale.set(0.85, 1.35, 0.6);
    eyeL.position.set(-0.22, 0.05, 0.32);
    eyeL.rotation.z = -0.35;
    eyeL.rotation.y = -0.2;
    headGroup.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, glossEyeMat);
    eyeR.scale.set(0.85, 1.35, 0.6);
    eyeR.position.set(0.22, 0.05, 0.32);
    eyeR.rotation.z = 0.35;
    eyeR.rotation.y = 0.2;
    headGroup.add(eyeR);

    const antStemGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.35, 8);
    const antStem = new THREE.Mesh(antStemGeo, skinMat);
    antStem.position.set(0, 0.62, 0);
    headGroup.add(antStem);

    const orbGeo = new THREE.SphereGeometry(0.08, 14, 14);
    const orbMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.set(0, 0.8, 0);
    headGroup.add(orb);

    group.add(headGroup);
    animParts.head = headGroup;

    buildLegsAndShoes(group, bottomMat, shoeMat, animParts);
  }

  // Shadow casting
  group.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });

  // Animation controller
  let walkPhase = 0;
  let popTimer = 0;
  let tvFaceTimer = 0;
  const tvFaces = ['(^ _ ^)', '(¬‿¬)', '(O_O;)', '(⌐■_■)', '(:3)'];
  let currentFaceIndex = 0;

  return {
    root: group,
    materials,
    animParts,
    isRigged: false,
    update: (delta, isMoving = false, isRunning = false) => {
      if (isMoving) {
        walkPhase += delta * (isRunning ? 14 : 8);

        // Bouncy character waddle
        group.position.y = Math.abs(Math.sin(walkPhase)) * 0.08;
        group.rotation.z = Math.sin(walkPhase) * 0.05;

        // Leg swings
        if (animParts.legL && animParts.legR) {
          animParts.legL.rotation.x = Math.sin(walkPhase) * 0.6;
          animParts.legR.rotation.x = -Math.sin(walkPhase) * 0.6;
        }

        // Tail wag for Doge
        if (animParts.tail) {
          animParts.tail.rotation.z = Math.sin(walkPhase * 2.5) * 0.6;
        }

        // Pop Cat Mouth Popping
        if (animParts.popMouth) {
          const popOpen = Math.sin(walkPhase * 1.5) > 0;
          animParts.popMouth.scale.set(popOpen ? 1.3 : 0.6, popOpen ? 1.3 : 0.3, 1);
        }

        // Duck Wings Flapping
        if (animParts.wingL && animParts.wingR) {
          animParts.wingL.rotation.z = 0.4 + Math.sin(walkPhase * 2) * 0.4;
          animParts.wingR.rotation.z = -0.4 - Math.sin(walkPhase * 2) * 0.4;
        }

        // Head bobbing
        if (animParts.head) {
          animParts.head.rotation.y = Math.sin(walkPhase * 0.5) * 0.08;
        }
      } else {
        // Idle breathing and gentle sway
        const t = performance.now() * 0.0025;
        group.position.y = Math.sin(t) * 0.012;
        group.rotation.z = 0;

        if (animParts.legL && animParts.legR) {
          animParts.legL.rotation.x = 0;
          animParts.legR.rotation.x = 0;
        }
        if (animParts.tail) {
          animParts.tail.rotation.z = Math.sin(t * 3) * 0.25;
        }
        if (animParts.popMouth) {
          animParts.popMouth.scale.set(0.7, 0.4, 1);
        }
        if (animParts.wingL && animParts.wingR) {
          animParts.wingL.rotation.z = 0.2 + Math.sin(t * 2) * 0.08;
          animParts.wingR.rotation.z = -0.2 - Math.sin(t * 2) * 0.08;
        }
      }

      // TV face switching every 3 seconds
      if (animParts.tvCtx) {
        tvFaceTimer += delta;
        if (tvFaceTimer > 3.0) {
          tvFaceTimer = 0;
          currentFaceIndex = (currentFaceIndex + 1) % tvFaces.length;
          const ctx = animParts.tvCtx;
          ctx.fillStyle = '#09090b';
          ctx.fillRect(0, 0, 256, 200);
          ctx.fillStyle = '#22d3ee';
          ctx.font = 'bold 54px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = '#22d3ee';
          ctx.shadowBlur = 15;
          ctx.fillText(tvFaces[currentFaceIndex], 128, 100);
          animParts.tvTexture.needsUpdate = true;
        }
      }
    },
    applyColors: (newCfg) => {
      materials.forEach((mat) => {
        if (mat.name === 'skin' && newCfg.skinColor) mat.color.set(newCfg.skinColor);
        if (mat.name === 'top' && newCfg.topColor) mat.color.set(newCfg.topColor);
        if (mat.name === 'bottom' && newCfg.bottomColor) mat.color.set(newCfg.bottomColor);
        if (mat.name === 'shoe' && newCfg.shoeColor) mat.color.set(newCfg.shoeColor);
      });
    }
  };
}

// Helper to construct articulated legs and chunky kicks
function buildLegsAndShoes(group, bottomMat, shoeMat, animParts, scale = 1.0) {
  const legGeo = new THREE.CylinderGeometry(0.12 * scale, 0.1 * scale, 0.44 * scale, 14);
  const shoeGeo = new THREE.BoxGeometry(0.18 * scale, 0.14 * scale, 0.32 * scale);

  const legLGroup = new THREE.Group();
  legLGroup.position.set(-0.16 * scale, 0.46 * scale, 0);

  const legL = new THREE.Mesh(legGeo, bottomMat);
  legL.position.y = -0.22 * scale;
  legLGroup.add(legL);

  const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
  shoeL.position.set(0, -0.42 * scale, 0.06 * scale);
  legLGroup.add(shoeL);

  group.add(legLGroup);
  animParts.legL = legLGroup;

  const legRGroup = new THREE.Group();
  legRGroup.position.set(0.16 * scale, 0.46 * scale, 0);

  const legR = new THREE.Mesh(legGeo, bottomMat);
  legR.position.y = -0.22 * scale;
  legRGroup.add(legR);

  const shoeR = new THREE.Mesh(shoeGeo, shoeMat);
  shoeR.position.set(0, -0.42 * scale, 0.06 * scale);
  legRGroup.add(shoeR);

  group.add(legRGroup);
  animParts.legR = legRGroup;
}
