// ==========================================================================
// Three.js Engine Scene - Sunny Pastel Atmosphere (Attention Agents)
// Soft daylight, sunny sky, hemisphere bounce, and third-person camera
// ==========================================================================

import * as THREE from 'three';

export class GameScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // 1. Sunny Pastel Atmosphere
    this.scene = new THREE.Scene();
    this.skyColor = new THREE.Color(0xa2e4f0);
    this.scene.background = this.skyColor;
    this.scene.fog = new THREE.FogExp2(0xa2e4f0, 0.008);

    // 2. Camera Setup (Third Person)
    this.camera = new THREE.PerspectiveCamera(48, this.width / this.height, 0.1, 400);
    this.cameraSmoothTarget = new THREE.Vector3(0, 1.2, 0);
    this.cameraDistance = 8.5;
    this.cameraAngle = { x: 0, y: 1.15 }; // Pitch & Yaw

    // 3. Renderer with high visual fidelity & soft shadows
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    // 4. Setup Natural Sunny Lighting
    this.setupLighting();

    // 5. Clock & Update handlers
    this.clock = new THREE.Clock();
    this.updateCallbacks = [];

    // 6. Camera Orbit Controls
    this.isDragging = false;
    this.prevPointerX = 0;
    this.prevPointerY = 0;
    this.setupCameraControls();

    // 7. Resize handling
    window.addEventListener('resize', () => this.onResize());
  }

  setupLighting() {
    // Ambient Soft White Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambientLight);

    // Hemisphere Light: Sky Blue vs Green Grass Bounce (giving rich cartoon depth!)
    const hemiLight = new THREE.HemisphereLight(0xd9f4ff, 0x82cf74, 0.7);
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);

    // Main Sun Directional Light casting soft natural shadows
    this.sunLight = new THREE.DirectionalLight(0xfff7ea, 1.6);
    this.sunLight.position.set(28, 48, 24);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 130;
    this.sunLight.shadow.camera.left = -45;
    this.sunLight.shadow.camera.right = 45;
    this.sunLight.shadow.camera.top = 45;
    this.sunLight.shadow.camera.bottom = -45;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);

    // Warm Interior Fill Light for the Cyber Cafe entrance
    this.cafeLight = new THREE.PointLight(0xffd8a6, 2.0, 24);
    this.cafeLight.position.set(0, 3.5, -12);
    this.scene.add(this.cafeLight);
  }

  setupCameraControls() {
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0 || e.button === 2) {
        this.isDragging = true;
        this.prevPointerX = e.clientX;
        this.prevPointerY = e.clientY;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevPointerX;
      const dy = e.clientY - this.prevPointerY;
      this.prevPointerX = e.clientX;
      this.prevPointerY = e.clientY;

      this.cameraAngle.x -= dx * 0.005;
      this.cameraAngle.y = Math.max(0.65, Math.min(1.4, this.cameraAngle.y - dy * 0.004));
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Zoom
    window.addEventListener('wheel', (e) => {
      if (e.target === this.canvas) {
        this.cameraDistance = Math.max(4.5, Math.min(18, this.cameraDistance + e.deltaY * 0.006));
      }
    }, { passive: true });
  }

  updateCamera(targetPos, deltaTime) {
    if (!targetPos) return;

    this.cameraSmoothTarget.lerp(targetPos, Math.min(1, deltaTime * 8));

    const radius = this.cameraDistance;
    const phi = this.cameraAngle.y; // pitch from top
    const theta = this.cameraAngle.x; // yaw around Y

    const offsetX = radius * Math.sin(phi) * Math.sin(theta);
    const offsetY = radius * Math.cos(phi);
    const offsetZ = radius * Math.sin(phi) * Math.cos(theta);

    const desiredCamPos = new THREE.Vector3(
      this.cameraSmoothTarget.x + offsetX,
      Math.max(1.0, this.cameraSmoothTarget.y + offsetY),
      this.cameraSmoothTarget.z + offsetZ
    );

    this.camera.position.lerp(desiredCamPos, Math.min(1, deltaTime * 12));
    this.camera.lookAt(
      this.cameraSmoothTarget.x,
      this.cameraSmoothTarget.y + 1.25,
      this.cameraSmoothTarget.z
    );
  }

  toScreenPosition(worldPosition) {
    const vector = worldPosition.clone();
    vector.project(this.camera);

    const halfW = this.width / 2;
    const halfH = this.height / 2;

    return {
      x: (vector.x * halfW) + halfW,
      y: -(vector.y * halfH) + halfH,
      inFront: vector.z < 1,
    };
  }

  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  addUpdateCallback(cb) {
    this.updateCallbacks.push(cb);
  }

  render() {
    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const totalTime = this.clock.getElapsedTime();

    for (const cb of this.updateCallbacks) {
      cb(deltaTime, totalTime);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
