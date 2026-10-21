// ==========================================================================
// 3D Character Avatar ("Net Kid" - Attention Agents Exact Aesthetic)
// Features: Rounded hood, big cartoon eyes, over-ear headphones with neon ring,
// chunky hoodie with kangaroo pocket & drawstrings, joggers, and chunky sneakers
// ==========================================================================

import * as THREE from 'three';

export class Avatar {
  constructor(options = {}) {
    this.name = options.name || 'Player';
    this.skinColor = options.skinColor || '#fcd5ce';
    this.hoodieColor = options.hoodieColor || '#7d67db'; // Iconic lavender/purple hoodie
    this.hairColor = options.hairColor || '#3d2514';
    this.joggersColor = options.joggersColor || '#2c2d38';
    this.kicksColor = options.kicksColor || '#ffffff';
    this.soleColor = options.soleColor || '#b597ff'; // Glowing lavender sole rim
    this.hoodStyle = options.hoodStyle || 'up'; // 'up', 'cat', 'down'
    this.xHandle = options.xHandle || null;
    this.isSelf = !!options.isSelf;

    this.root = new THREE.Group();
    this.root.name = `avatar_${this.name}`;

    // Animation state
    this.animTime = Math.random() * 10;
    this.isMoving = false;
    this.isJumping = false;
    this.moveSpeedRatio = 0;

    this.buildModel();
  }

  buildModel() {
    // 1. Materials
    this.matSkin = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.skinColor),
      roughness: 0.55,
    });

    this.matHoodie = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.hoodieColor),
      roughness: 0.5,
    });

    this.matHair = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.hairColor),
      roughness: 0.6,
    });

    this.matJoggers = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.joggersColor),
      roughness: 0.6,
    });

    this.matKicks = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.kicksColor),
      roughness: 0.4,
    });

    this.matSole = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.soleColor),
    });

    this.matHeadphones = new THREE.MeshStandardMaterial({
      color: 0x1a1a24,
      roughness: 0.3,
      metalness: 0.5,
    });

    this.matHeadphoneRing = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.soleColor),
    });

    // 2. Torso (Chunky Hoodie)
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.y = 1.05;
    this.root.add(this.torsoGroup);

    // Hoodie Body
    const torsoGeo = new THREE.CylinderGeometry(0.42, 0.48, 0.75, 18);
    this.torsoMesh = new THREE.Mesh(torsoGeo, this.matHoodie);
    this.torsoMesh.castShadow = true;
    this.torsoGroup.add(this.torsoMesh);

    // Front Kangaroo Pouch Pocket
    const pocketGeo = new THREE.BoxGeometry(0.5, 0.28, 0.16);
    const pocket = new THREE.Mesh(pocketGeo, this.matHoodie);
    pocket.position.set(0, -0.15, 0.42);
    pocket.castShadow = true;
    this.torsoGroup.add(pocket);

    // Drawstrings
    const stringGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.32, 8);
    const stringMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

    const strLeft = new THREE.Mesh(stringGeo, stringMat);
    strLeft.position.set(-0.12, 0.15, 0.45);
    this.torsoGroup.add(strLeft);

    const strRight = new THREE.Mesh(stringGeo, stringMat);
    strRight.position.set(0.12, 0.15, 0.45);
    this.torsoGroup.add(strRight);

    // 3. Head & Hood Group
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.68, 0);
    this.torsoGroup.add(this.headGroup);

    // Outer Hood Shell
    const hoodGeo = new THREE.SphereGeometry(0.68, 24, 20);
    this.hoodMesh = new THREE.Mesh(hoodGeo, this.matHoodie);
    this.hoodMesh.scale.set(1.05, 1.1, 1.05);
    this.hoodMesh.castShadow = true;
    this.headGroup.add(this.hoodMesh);

    // Inner Face Sphere
    const faceGeo = new THREE.SphereGeometry(0.54, 24, 20);
    this.faceMesh = new THREE.Mesh(faceGeo, this.matSkin);
    this.faceMesh.position.set(0, -0.04, 0.16);
    this.headGroup.add(this.faceMesh);

    // Hair Bangs
    const hairGeo = new THREE.SphereGeometry(0.53, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.4);
    this.hairMesh = new THREE.Mesh(hairGeo, this.matHair);
    this.hairMesh.position.set(0, 0.05, 0.15);
    this.hairMesh.rotation.x = 0.2;
    this.headGroup.add(this.hairMesh);

    // Big Anime / Cartoon Eyes (Dark with specular white shine)
    const eyeGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111116 });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.scale.set(1, 1.4, 0.3);
    leftEye.position.set(-0.21, 0.02, 0.65);
    this.headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.scale.set(1, 1.4, 0.3);
    rightEye.position.set(0.21, 0.02, 0.65);
    this.headGroup.add(rightEye);

    // Eye Specular Shine Dots
    const shineGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const shineL1 = new THREE.Mesh(shineGeo, shineMat);
    shineL1.position.set(-0.18, 0.08, 0.7);
    this.headGroup.add(shineL1);

    const shineR1 = new THREE.Mesh(shineGeo, shineMat);
    shineR1.position.set(0.24, 0.08, 0.7);
    this.headGroup.add(shineR1);

    // Cute Little Smiling Mouth
    const mouthGeo = new THREE.TorusGeometry(0.06, 0.02, 8, 12, Math.PI);
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x5a2d1e });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.rotation.x = Math.PI;
    mouth.position.set(0, -0.16, 0.68);
    this.headGroup.add(mouth);

    // 4. Over-Ear Headphones with Glowing Neon Ring
    this.headphonesGroup = new THREE.Group();
    this.headGroup.add(this.headphonesGroup);

    // Headband
    const bandGeo = new THREE.TorusGeometry(0.72, 0.06, 8, 24, Math.PI);
    const bandMesh = new THREE.Mesh(bandGeo, this.matHeadphones);
    bandMesh.rotation.x = Math.PI / 2;
    bandMesh.position.set(0, 0.12, 0);
    this.headphonesGroup.add(bandMesh);

    // Ear Cups (Left & Right)
    const earcupGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.15, 18);
    const leftCup = new THREE.Mesh(earcupGeo, this.matHeadphones);
    leftCup.rotation.z = Math.PI / 2;
    leftCup.position.set(-0.73, 0.02, 0);
    this.headphonesGroup.add(leftCup);

    const rightCup = new THREE.Mesh(earcupGeo, this.matHeadphones);
    rightCup.rotation.z = Math.PI / 2;
    rightCup.position.set(0.73, 0.02, 0);
    this.headphonesGroup.add(rightCup);

    // Glowing Neon Rings on Earcups
    const ringGeo = new THREE.TorusGeometry(0.16, 0.035, 8, 24);
    const leftRing = new THREE.Mesh(ringGeo, this.matHeadphoneRing);
    leftRing.rotation.y = Math.PI / 2;
    leftRing.position.set(-0.82, 0.02, 0);
    this.headphonesGroup.add(leftRing);

    const rightRing = new THREE.Mesh(ringGeo, this.matHeadphoneRing);
    rightRing.rotation.y = Math.PI / 2;
    rightRing.position.set(0.82, 0.02, 0);
    this.headphonesGroup.add(rightRing);

    // 5. Arms & Hands
    const armGeo = new THREE.CylinderGeometry(0.12, 0.11, 0.52, 12);
    const handGeo = new THREE.SphereGeometry(0.11, 12, 12);

    // Left Arm
    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(-0.52, 0.22, 0);
    this.torsoGroup.add(this.leftArmGroup);

    const leftArmMesh = new THREE.Mesh(armGeo, this.matHoodie);
    leftArmMesh.position.y = -0.22;
    leftArmMesh.castShadow = true;
    this.leftArmGroup.add(leftArmMesh);

    const leftHand = new THREE.Mesh(handGeo, this.matSkin);
    leftHand.position.y = -0.52;
    this.leftArmGroup.add(leftHand);

    // Right Arm
    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(0.52, 0.22, 0);
    this.torsoGroup.add(this.rightArmGroup);

    const rightArmMesh = new THREE.Mesh(armGeo, this.matHoodie);
    rightArmMesh.position.y = -0.22;
    rightArmMesh.castShadow = true;
    this.rightArmGroup.add(rightArmMesh);

    const rightHand = new THREE.Mesh(handGeo, this.matSkin);
    rightHand.position.y = -0.52;
    this.rightArmGroup.add(rightHand);

    // 6. Legs (Joggers) & Chunky White Sneakers
    const legGeo = new THREE.CylinderGeometry(0.14, 0.13, 0.52, 12);
    const shoeBodyGeo = new THREE.BoxGeometry(0.28, 0.18, 0.44);
    const soleGeo = new THREE.BoxGeometry(0.29, 0.06, 0.45);

    // Left Leg
    this.leftLegGroup = new THREE.Group();
    this.leftLegGroup.position.set(-0.22, 0.72, 0);
    this.root.add(this.leftLegGroup);

    const leftLegMesh = new THREE.Mesh(legGeo, this.matJoggers);
    leftLegMesh.position.y = -0.24;
    leftLegMesh.castShadow = true;
    this.leftLegGroup.add(leftLegMesh);

    // Shoe
    const leftShoe = new THREE.Mesh(shoeBodyGeo, this.matKicks);
    leftShoe.position.set(0, -0.52, 0.08);
    leftShoe.castShadow = true;
    this.leftLegGroup.add(leftShoe);

    const leftSole = new THREE.Mesh(soleGeo, this.matSole);
    leftSole.position.set(0, -0.62, 0.08);
    this.leftLegGroup.add(leftSole);

    // Right Leg
    this.rightLegGroup = new THREE.Group();
    this.rightLegGroup.position.set(0.22, 0.72, 0);
    this.root.add(this.rightLegGroup);

    const rightLegMesh = new THREE.Mesh(legGeo, this.matJoggers);
    rightLegMesh.position.y = -0.24;
    rightLegMesh.castShadow = true;
    this.rightLegGroup.add(rightLegMesh);

    // Shoe
    const rightShoe = new THREE.Mesh(shoeBodyGeo, this.matKicks);
    rightShoe.position.set(0, -0.52, 0.08);
    rightShoe.castShadow = true;
    this.rightLegGroup.add(rightShoe);

    const rightSole = new THREE.Mesh(soleGeo, this.matSole);
    rightSole.position.set(0, -0.62, 0.08);
    this.rightLegGroup.add(rightSole);

    // 7. Ground Contact Shadow
    const shadowGeo = new THREE.PlaneGeometry(1.4, 1.4);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x4a4a58,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    this.shadowBlob = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadowBlob.rotation.x = -Math.PI / 2;
    this.shadowBlob.position.y = 0.02;
    this.root.add(this.shadowBlob);
  }

  updateCustomization(opts = {}) {
    if (opts.name) this.name = opts.name;
    if (opts.skinColor) {
      this.skinColor = opts.skinColor;
      this.matSkin.color.set(this.skinColor);
    }
    if (opts.hoodieColor) {
      this.hoodieColor = opts.hoodieColor;
      this.matHoodie.color.set(this.hoodieColor);
    }
    if (opts.hairColor) {
      this.hairColor = opts.hairColor;
      this.matHair.color.set(this.hairColor);
    }
    if (opts.joggersColor) {
      this.joggersColor = opts.joggersColor;
      this.matJoggers.color.set(this.joggersColor);
    }
    if (opts.kicksColor) {
      this.kicksColor = opts.kicksColor;
      this.matKicks.color.set(this.kicksColor);
    }
    if (opts.soleColor) {
      this.soleColor = opts.soleColor;
      this.matSole.color.set(this.soleColor);
      this.matHeadphoneRing.color.set(this.soleColor);
    }
    if (opts.xHandle !== undefined) {
      this.xHandle = opts.xHandle;
    }
  }

  animate(deltaTime, isMoving, isJumping, speedRatio = 1) {
    this.isMoving = isMoving;
    this.isJumping = isJumping;
    this.moveSpeedRatio = speedRatio;

    const rate = isMoving ? 11 * speedRatio : 2.5;
    this.animTime += deltaTime * rate;

    if (isJumping) {
      this.torsoGroup.position.y = 1.15;
      this.leftArmGroup.rotation.x = -1.0;
      this.rightArmGroup.rotation.x = -1.0;
      this.leftLegGroup.rotation.x = 0.5;
      this.rightLegGroup.rotation.x = 0.3;
      this.shadowBlob.scale.set(0.7, 0.7, 0.7);
      this.shadowBlob.material.opacity = 0.16;
    } else if (isMoving) {
      const swing = Math.sin(this.animTime) * 0.75 * speedRatio;
      const bob = Math.abs(Math.sin(this.animTime * 2)) * 0.08;

      this.leftLegGroup.rotation.x = swing;
      this.rightLegGroup.rotation.x = -swing;

      this.leftArmGroup.rotation.x = -swing * 0.85;
      this.rightArmGroup.rotation.x = swing * 0.85;

      this.torsoGroup.position.y = 1.05 + bob;
      this.shadowBlob.scale.set(1, 1, 1);
      this.shadowBlob.material.opacity = 0.35;
    } else {
      const breath = Math.sin(this.animTime) * 0.03;
      this.torsoGroup.position.y = 1.05 + breath;
      this.headGroup.rotation.y = Math.sin(this.animTime * 0.5) * 0.06;

      this.leftArmGroup.rotation.x = 0;
      this.rightArmGroup.rotation.x = 0;
      this.leftLegGroup.rotation.x = 0;
      this.rightLegGroup.rotation.x = 0;
      this.shadowBlob.scale.set(1, 1, 1);
      this.shadowBlob.material.opacity = 0.35;
    }
  }

  getHeadWorldPosition() {
    const worldPos = new THREE.Vector3();
    this.headGroup.getWorldPosition(worldPos);
    worldPos.y += 0.85;
    return worldPos;
  }
}
