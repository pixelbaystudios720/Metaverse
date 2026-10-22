// ==========================================================================
// Premium 3D Human Avatar Selection Screen & Customization System
// 6 Selectable Streetwear Avatars with Manual Color Palettes (Skin, Hair,
// Hood Style, Hoodie, Joggers, Sneakers, Glowing LEDs) + 360° 3D Preview
// ==========================================================================

import * as THREE from 'three';
import { buildPerson, disposePerson, LOOK_OPTIONS, LOOK_LABEL, OPTION_LABEL, randomLook } from '../aa/person3d.js';
import { castShadows } from '../aa/agents3d.js';

// The 6 Selectable Base Avatar Designs
export const AVATAR_PRESETS = [
  {
    id: 'kai',
    name: 'Kai',
    gender: 'Male',
    tagline: 'Cyber Streetwear',
    description: 'Oversized lavender hoodie with high-top kicks and ultraviolet headphones ring.',
    look: {
      skin: '#eaab83',
      hair: '#3b2a24',
      style: 'hood',
      hoodie: '#8f7cf2',
      pants: '#33364d',
      kicks: '#dcd8d0',
      glow: '#b47cff',
    }
  },
  {
    id: 'maya',
    name: 'Maya',
    gender: 'Female',
    tagline: 'Neon Cyberpunk',
    description: 'Cat-eared bubblegum cyber hoodie with platform sneakers and cyan LED ring.',
    look: {
      skin: '#ffc7a6',
      hair: '#8f7ad9',
      style: 'ears',
      hoodie: '#ff9ec0',
      pants: '#1f1e26',
      kicks: '#ff6f91',
      glow: '#3ff0e0',
    }
  },
  {
    id: 'leo',
    name: 'Leo',
    gender: 'Male',
    tagline: 'Urban Athleisure',
    description: 'Hood-down windbreaker with tapered joggers and electric mint kicks.',
    look: {
      skin: '#f6b896',
      hair: '#735442',
      style: 'down',
      hoodie: '#6fd6bd',
      pants: '#4b4e5c',
      kicks: '#7fd6c2',
      glow: '#7dff6a',
    }
  },
  {
    id: 'aria',
    name: 'Aria',
    gender: 'Female',
    tagline: 'Cyber Gold',
    description: 'Golden pullover with midnight cargo joggers and high-contrast streetwear sneakers.',
    look: {
      skin: '#d08f63',
      hair: '#e2b766',
      style: 'down',
      hoodie: '#ffd36e',
      pants: '#1f1e26',
      kicks: '#ffd36e',
      glow: '#ffb13b',
    }
  },
  {
    id: 'zane',
    name: 'Zane',
    gender: 'Male',
    tagline: 'Stealth Tactical',
    description: 'Dark techwear hoodie with multi-pocket cargo pants and glowing crimson ring.',
    look: {
      skin: '#ad7049',
      hair: '#3b2a24',
      style: 'hood',
      hoodie: '#3a3c52',
      pants: '#1f1e26',
      kicks: '#2c2a33',
      glow: '#ff4a5e',
    }
  },
  {
    id: 'chloe',
    name: 'Chloe',
    gender: 'Female',
    tagline: 'Street Chic',
    description: 'Clean off-white streetwear pullover with slate joggers and cyan accents.',
    look: {
      skin: '#ffc7a6',
      hair: '#c8613d',
      style: 'ears',
      hoodie: '#e8e4dc',
      pants: '#9aa0b4',
      kicks: '#6aa8ff',
      glow: '#3ff0e0',
    }
  }
];

export class AvatarSelectionScreen {
  constructor(onEnterWorld) {
    this.onEnterWorld = onEnterWorld;
    this.currentPresetIndex = 0;
    this.currentLook = { ...AVATAR_PRESETS[0].look };
    this.playerName = localStorage.getItem('aa.name.v1') || 'NetKid';

    this.createDOM();
    this.init3DPreview();
    this.attachEventListeners();
    this.updateUI();
  }

  createDOM() {
    this.container = document.createElement('div');
    this.container.id = 'avatar-selector-screen';
    this.container.className = 'avatar-selector-overlay';
    this.container.innerHTML = `
      <div class="av-backdrop"></div>
      
      <!-- Top Brand Header -->
      <header class="av-header">
        <div class="av-brand">
          <span class="av-logo-badge">3D</span>
          <h1>Welcome to Metaverse</h1>
        </div>
        <p class="av-subtitle">Select or customize your 3D metaverse avatar</p>
      </header>

      <!-- Main Stage Container -->
      <main class="av-stage-grid">
        <!-- Left: 3D Character Preview Canvas -->
        <div class="av-preview-col">
          <div class="av-canvas-wrap">
            <canvas id="av-preview-canvas"></canvas>
            <div class="av-hint">Drag to rotate 360°</div>
          </div>
          
          <!-- Character Navigator Buttons -->
          <div class="av-nav-bar">
            <button type="button" class="av-nav-btn" id="av-prev-btn" title="Previous Avatar">‹</button>
            <div class="av-nav-info">
              <span class="av-char-name" id="av-name-display">Kai</span>
              <span class="av-char-tagline" id="av-tagline-display">Cyber Streetwear</span>
            </div>
            <button type="button" class="av-nav-btn" id="av-next-btn" title="Next Avatar">›</button>
          </div>
        </div>

        <!-- Right: Customization & Color Palettes -->
        <div class="av-custom-col">
          <div class="av-panel-card">
            
            <!-- Player Name Input -->
            <div class="av-form-group">
              <label for="av-player-name-input">Player Name</label>
              <div class="av-input-wrap">
                <input type="text" id="av-player-name-input" maxlength="16" placeholder="Your street name..." value="${this.playerName}">
              </div>
            </div>

            <!-- Avatar Presets Quick Select -->
            <div class="av-form-group">
              <label>Select Preset</label>
              <div class="av-preset-pills" id="av-preset-pills">
                ${AVATAR_PRESETS.map((p, i) => `
                  <button type="button" class="av-preset-pill ${i === 0 ? 'active' : ''}" data-idx="${i}">
                    <span>${p.name}</span>
                    <small>${p.gender}</small>
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Manual Color & Style Palettes -->
            <div class="av-palette-scroll" id="av-palette-container">
              <!-- Dynamically populated -->
            </div>

            <!-- Bottom Actions -->
            <div class="av-action-row">
              <button type="button" class="av-btn av-btn-secondary" id="av-random-btn">
                🎲 Surprise Me
              </button>
              <button type="button" class="av-btn av-btn-primary" id="av-enter-btn">
                <span>Enter World</span>
                <span class="av-arrow">➔</span>
              </button>
            </div>

          </div>
        </div>
      </main>
    `;

    document.body.appendChild(this.container);

    // Inject styles
    this.injectStyles();
  }

  injectStyles() {
    const css = `
      .avatar-selector-overlay {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        background: #0f1118;
        color: #f4eefe;
        font-family: "Fredoka", "Nunito", system-ui, sans-serif;
        user-select: none;
        overflow-y: auto;
      }

      .av-backdrop {
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at 35% 45%, #2a2344 0%, #100c1e 65%, #08060f 100%);
        pointer-events: none;
      }

      .av-header {
        position: relative;
        z-index: 2;
        padding: 20px 32px 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .av-brand {
        display: inline-flex;
        align-items: center;
        gap: 12px;
      }

      .av-logo-badge {
        background: #62e6cf;
        color: #0d2924;
        font-weight: 700;
        font-size: 13px;
        padding: 4px 8px;
        border-radius: 8px;
        letter-spacing: .05em;
      }

      .av-brand h1 {
        margin: 0;
        font-size: clamp(24px, 3.5vw, 36px);
        font-weight: 700;
        letter-spacing: -0.02em;
        background: linear-gradient(135deg, #ffffff 0%, #d8cfff 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .av-subtitle {
        margin: 6px 0 0;
        color: #9c92b8;
        font-size: 14px;
      }

      .av-stage-grid {
        position: relative;
        z-index: 2;
        flex: 1;
        display: grid;
        grid-template-columns: 1fr 440px;
        max-width: 1300px;
        width: 100%;
        margin: 0 auto;
        padding: 10px 24px 24px;
        gap: 24px;
        align-items: center;
      }

      @media (max-width: 900px) {
        .av-stage-grid {
          grid-template-columns: 1fr;
        }
      }

      .av-preview-col {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        min-height: 440px;
      }

      .av-canvas-wrap {
        position: relative;
        width: 100%;
        max-width: 480px;
        aspect-ratio: 1;
        border-radius: 28px;
        background: radial-gradient(circle at 50% 65%, rgba(143, 124, 242, 0.16) 0%, rgba(10, 8, 20, 0.4) 70%);
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        overflow: hidden;
        cursor: grab;
      }

      .av-canvas-wrap:active {
        cursor: grabbing;
      }

      #av-preview-canvas {
        width: 100%;
        height: 100%;
        display: block;
      }

      .av-hint {
        position: absolute;
        bottom: 12px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 12px;
        color: #a39bc0;
        background: rgba(16, 12, 30, 0.75);
        padding: 4px 14px;
        border-radius: 999px;
        pointer-events: none;
        letter-spacing: .02em;
        backdrop-filter: blur(4px);
      }

      .av-nav-bar {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        margin-top: 16px;
        background: rgba(255, 255, 255, 0.05);
        padding: 8px 16px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .av-nav-btn {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        border: 0;
        background: #231c3b;
        color: #fff;
        font-size: 26px;
        display: grid;
        place-items: center;
        cursor: pointer;
        transition: transform .15s ease, background .15s ease;
      }

      .av-nav-btn:hover {
        background: #8f7cf2;
        transform: scale(1.08);
      }

      .av-nav-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 140px;
      }

      .av-char-name {
        font-size: 20px;
        font-weight: 700;
        letter-spacing: .02em;
      }

      .av-char-tagline {
        font-size: 12px;
        color: #9c92b8;
      }

      .av-custom-col {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .av-panel-card {
        background: rgba(25, 20, 42, 0.88);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 28px;
        padding: 24px;
        backdrop-filter: blur(16px);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-height: 82vh;
      }

      .av-form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .av-form-group label {
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: .06em;
        color: #b5abd1;
      }

      .av-input-wrap input {
        width: 100%;
        padding: 12px 16px;
        border-radius: 14px;
        background: rgba(14, 11, 24, 0.7);
        border: 1.5px solid rgba(255, 255, 255, 0.12);
        color: #fff;
        font-family: inherit;
        font-size: 15px;
        font-weight: 500;
        outline: none;
        transition: border-color .15s ease;
      }

      .av-input-wrap input:focus {
        border-color: #62e6cf;
        box-shadow: 0 0 12px rgba(98, 230, 207, 0.25);
      }

      .av-preset-pills {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }

      .av-preset-pill {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 8px 6px;
        color: #ddd;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        transition: all .15s ease;
      }

      .av-preset-pill span {
        font-weight: 600;
        font-size: 14px;
      }

      .av-preset-pill small {
        font-size: 11px;
        color: #8c82a8;
      }

      .av-preset-pill:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateY(-1px);
      }

      .av-preset-pill.active {
        background: #8f7cf2;
        border-color: #a99bf7;
        color: #fff;
        box-shadow: 0 4px 14px rgba(143, 124, 242, 0.35);
      }

      .av-preset-pill.active small {
        color: #e5e0ff;
      }

      .av-palette-scroll {
        overflow-y: auto;
        padding-right: 6px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: 290px;
      }

      .av-palette-scroll::-webkit-scrollbar {
        width: 5px;
      }
      .av-palette-scroll::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 999px;
      }

      .av-row {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .av-row-label {
        font-size: 12px;
        font-weight: 600;
        color: #9c92b8;
      }

      .av-swatches {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .av-swatch {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.15);
        cursor: pointer;
        transition: transform .15s ease, border-color .15s ease;
        padding: 0;
      }

      .av-swatch:hover {
        transform: scale(1.15);
      }

      .av-swatch.active {
        border-color: #ffffff;
        box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
        transform: scale(1.12);
      }

      .av-btn-style {
        padding: 6px 14px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 600;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #eee;
        cursor: pointer;
        transition: all .15s ease;
      }

      .av-btn-style:hover {
        background: rgba(255, 255, 255, 0.12);
      }

      .av-btn-style.active {
        background: #62e6cf;
        color: #072520;
        border-color: #62e6cf;
        box-shadow: 0 0 12px rgba(98, 230, 207, 0.35);
      }

      .av-action-row {
        display: flex;
        gap: 12px;
        margin-top: 6px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }

      .av-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 14px 22px;
        border-radius: 999px;
        border: 0;
        font-family: inherit;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        transition: transform .15s ease, box-shadow .15s ease;
      }

      .av-btn:hover {
        transform: translateY(-2px);
      }

      .av-btn-secondary {
        background: rgba(255, 255, 255, 0.08);
        color: #f1ecff;
        border: 1px solid rgba(255, 255, 255, 0.14);
      }

      .av-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.15);
      }

      .av-btn-primary {
        flex: 1;
        background: linear-gradient(135deg, #62e6cf 0%, #3fdc97 100%);
        color: #062b24;
        box-shadow: 0 6px 20px rgba(98, 230, 207, 0.35);
      }

      .av-btn-primary:hover {
        box-shadow: 0 10px 28px rgba(98, 230, 207, 0.5);
      }

      .av-arrow {
        font-size: 18px;
      }
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  init3DPreview() {
    this.canvas = document.getElementById('av-preview-canvas');
    this.wrap = this.canvas.parentElement;

    const width = this.wrap.clientWidth || 400;
    const height = this.wrap.clientHeight || 400;

    // Three.js Scene
    this.scene = new THREE.Scene();
    this.scene.background = null; // transparent

    // Camera
    this.camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 50);
    this.camera.position.set(0, 1.05, 3.8);
    this.camera.lookAt(0, 0.85, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting (Studio Pedestal Lighting)
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff5ea, 2.0);
    keyLight.position.set(3, 4, 3);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xa5c4ff, 1.2);
    fillLight.position.set(-3, 2, -2);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xe7c8ff, 1.4);
    rimLight.position.set(0, 3, -3);
    this.scene.add(rimLight);

    // Pedestal
    const pedestalGroup = new THREE.Group();
    const diskGeo = new THREE.CylinderGeometry(1.1, 1.15, 0.12, 40);
    const diskMat = new THREE.MeshStandardMaterial({
      color: 0x1d1730,
      roughness: 0.4,
      metalness: 0.2
    });
    const disk = new THREE.Mesh(diskGeo, diskMat);
    disk.position.y = -0.06;
    disk.receiveShadow = true;
    pedestalGroup.add(disk);

    // Glowing Pedestal Ring
    const ringGeo = new THREE.RingGeometry(1.02, 1.08, 40);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x62e6cf,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.005;
    pedestalGroup.add(ring);
    this.pedestalRing = ring;

    this.scene.add(pedestalGroup);

    // Character Group (Rotatable)
    this.characterGroup = new THREE.Group();
    this.scene.add(this.characterGroup);

    this.rebuildCharacter();

    // Mouse Drag Rotation
    this.isDragging = false;
    this.prevMouseX = 0;
    this.targetRotation = 0;

    this.wrap.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.prevMouseX = e.clientX;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.prevMouseX;
      this.prevMouseX = e.clientX;
      this.characterGroup.rotation.y += deltaX * 0.015;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Touch Support
    this.wrap.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.prevMouseX = e.touches[0].clientX;
      }
    });

    window.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - this.prevMouseX;
      this.prevMouseX = e.touches[0].clientX;
      this.characterGroup.rotation.y += deltaX * 0.015;
    });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    // Render Loop
    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    // Handle Window Resize
    window.addEventListener('resize', () => {
      if (!this.container || !this.wrap) return;
      const w = this.wrap.clientWidth || 400;
      const h = this.wrap.clientHeight || 400;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
    });
  }

  rebuildCharacter() {
    if (this.currentMesh) {
      this.characterGroup.remove(this.currentMesh);
      disposePerson(this.currentMesh);
      this.currentMesh = null;
    }

    this.currentMesh = buildPerson(this.currentLook);
    castShadows(this.currentMesh, true, false);
    this.currentMesh.scale.setScalar(1.0);
    this.characterGroup.add(this.currentMesh);

    // Update pedestal ring glow color to match look
    if (this.pedestalRing && this.currentLook.glow) {
      this.pedestalRing.material.color.set(this.currentLook.glow);
    }
  }

  animate() {
    if (!this.container) return;
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // Subtle idle animation
    if (this.currentMesh && this.currentMesh.userData.creature) {
      this.currentMesh.userData.creature.update?.(time, delta);
    }

    // Auto rotate slowly if not dragging
    if (!this.isDragging) {
      this.characterGroup.rotation.y += 0.005;
    }

    this.renderer.render(this.scene, this.camera);
  }

  attachEventListeners() {
    // Next / Previous Preset
    document.getElementById('av-prev-btn').addEventListener('click', () => {
      this.currentPresetIndex = (this.currentPresetIndex - 1 + AVATAR_PRESETS.length) % AVATAR_PRESETS.length;
      this.applyPreset(this.currentPresetIndex);
    });

    document.getElementById('av-next-btn').addEventListener('click', () => {
      this.currentPresetIndex = (this.currentPresetIndex + 1) % AVATAR_PRESETS.length;
      this.applyPreset(this.currentPresetIndex);
    });

    // Preset Pills
    document.getElementById('av-preset-pills').addEventListener('click', (e) => {
      const btn = e.target.closest('.av-preset-pill');
      if (btn) {
        const idx = parseInt(btn.dataset.idx, 10);
        this.applyPreset(idx);
      }
    });

    // Surprise Me
    document.getElementById('av-random-btn').addEventListener('click', () => {
      this.currentLook = randomLook();
      this.rebuildCharacter();
      this.updatePalettes();
    });

    // Player Name Input
    const nameInput = document.getElementById('av-player-name-input');
    nameInput.addEventListener('input', () => {
      this.playerName = nameInput.value.trim() || 'Player';
      localStorage.setItem('aa.name.v1', this.playerName);
    });

    // Enter World
    document.getElementById('av-enter-btn').addEventListener('click', () => {
      this.enterWorld();
    });
  }

  applyPreset(idx) {
    this.currentPresetIndex = idx;
    const preset = AVATAR_PRESETS[idx];
    this.currentLook = { ...preset.look };

    // Update Presets UI
    document.querySelectorAll('.av-preset-pill').forEach((btn, i) => {
      btn.classList.toggle('active', i === idx);
    });

    document.getElementById('av-name-display').textContent = preset.name;
    document.getElementById('av-tagline-display').textContent = preset.tagline;

    this.rebuildCharacter();
    this.updatePalettes();
  }

  updateUI() {
    this.updatePalettes();
  }

  updatePalettes() {
    const container = document.getElementById('av-palette-container');
    container.innerHTML = Object.entries(LOOK_OPTIONS).map(([key, options]) => {
      const isColors = options[0].startsWith('#');
      return `
        <div class="av-row">
          <span class="av-row-label">${LOOK_LABEL[key]}</span>
          <div class="av-swatches">
            ${options.map((opt) => {
              if (isColors) {
                const isActive = this.currentLook[key] === opt;
                return `
                  <button type="button" 
                    class="av-swatch ${isActive ? 'active' : ''}" 
                    style="background: ${opt}" 
                    data-key="${key}" 
                    data-val="${opt}"
                    title="${LOOK_LABEL[key]}: ${opt}">
                  </button>
                `;
              } else {
                const isActive = this.currentLook[key] === opt;
                return `
                  <button type="button" 
                    class="av-btn-style ${isActive ? 'active' : ''}" 
                    data-key="${key}" 
                    data-val="${opt}">
                    ${OPTION_LABEL[opt] || opt}
                  </button>
                `;
              }
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    // Attach swatch click handlers
    container.querySelectorAll('[data-key]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const { key, val } = btn.dataset;
        this.currentLook[key] = val;
        this.rebuildCharacter();
        this.updatePalettes();
      });
    });
  }

  enterWorld() {
    // Save chosen look & name to localStorage
    localStorage.setItem('aa.look.v2', JSON.stringify(this.currentLook));
    localStorage.setItem('aa.name.v1', this.playerName);
    localStorage.setItem('aa.game.v1', '1');

    // Fade out screen
    this.container.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    this.container.style.opacity = '0';
    this.container.style.transform = 'scale(1.04)';

    setTimeout(() => {
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
      if (this.onEnterWorld) {
        this.onEnterWorld(this.currentLook, this.playerName);
      }
    }, 400);
  }
}
