// ==========================================================================
// 3D Human Avatar Selection & Customization Screen
// Features: Category Tabs (Characters, Skin, Hair, Tops, Bottoms, Shoes),
// Live 3D Viewport with 360° Drag Turntable, Instant Material Updates,
// Local Storage Persistence, and Direct Playable World Spawning
// ==========================================================================

import * as THREE from 'three';
import { 
  HumanAvatarManager, 
  CHARACTER_CATALOG, 
  SKIN_TONES, 
  CLOTHING_COLORS, 
  HAIR_COLORS,
  GLOW_COLORS,
  HOOD_STYLES
} from '../player/human_avatar_system.js';

export class HumanAvatarCustomizer {
  constructor(onEnterWorld) {
    this.onEnterWorld = onEnterWorld;
    this.manager = new HumanAvatarManager();
    this.activeConfig = { ...this.manager.currentConfig };
    this.activeTab = 'characters';
    this.characterFilter = 'all';

    this.createDOM();
    this.init3DStage();
    this.renderTabs();
    this.renderActiveTabContent();
    this.loadCharacterPreview();
  }

  createDOM() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'human-customizer-overlay';
    this.overlay.className = 'human-customizer-container';
    this.overlay.innerHTML = `
      <div class="hc-ambient-bg"></div>

      <!-- Top Header -->
      <header class="hc-top-header">
        <div class="hc-brand-pill">
          <span class="hc-badge">3D METAVERSE STUDIO</span>
          <span class="hc-title">Welcome to Metaverse - Avatars</span>
        </div>
        <p class="hc-subtitle">Select your 3D avatar, customize appearance, and step into the Metaverse</p>
      </header>

      <!-- Main Studio Workspace -->
      <main class="hc-workspace">
        
        <!-- Left: 3D Turntable Viewport -->
        <div class="hc-viewport-card">
          <div class="hc-canvas-container" id="hc-canvas-wrap">
            <canvas id="hc-preview-canvas"></canvas>
            <div class="hc-viewport-badge" id="hc-char-badge">Loading model...</div>
            <div class="hc-turntable-hint">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              <span>Click & Drag to Rotate 360°</span>
            </div>
            <div class="hc-loader-spinner" id="hc-spinner">
              <div class="spinner-ring"></div>
              <span>Loading 3D Mesh...</span>
            </div>
          </div>
          <!-- Interactive Emotes / Actions Bar -->
          <div class="hc-emotes-row" id="hc-emotes-bar"></div>
        </div>

        <!-- Right: Customization Dashboard -->
        <div class="hc-controls-card">
          
          <!-- Player Identity -->
          <div class="hc-identity-row">
            <label for="hc-name-input">Character Name</label>
            <div class="hc-input-box">
              <input type="text" id="hc-name-input" maxlength="18" placeholder="Enter name..." value="${this.activeConfig.name}">
            </div>
          </div>

          <!-- Category Navigation Tabs -->
          <nav class="hc-tabs-bar" id="hc-tabs-bar">
            <!-- Tabs rendered dynamically -->
          </nav>

          <!-- Tab Content Panel -->
          <div class="hc-tab-body" id="hc-tab-body">
            <!-- Content rendered dynamically -->
          </div>

          <!-- Action Footer -->
          <div class="hc-footer-actions">
            <button type="button" class="hc-btn-secondary" id="hc-random-btn">
              <span>🎲 Randomize</span>
            </button>
            <button type="button" class="hc-btn-primary" id="hc-enter-world-btn">
              <span>Enter World</span>
              <span class="hc-enter-arrow">➔</span>
            </button>
          </div>

        </div>
      </main>
    `;

    document.body.appendChild(this.overlay);
    this.injectStyles();
  }

  injectStyles() {
    const css = `
      .human-customizer-container {
        position: fixed;
        inset: 0;
        z-index: 2000;
        display: flex;
        flex-direction: column;
        background: #090a0f;
        color: #f3f4f6;
        font-family: "Fredoka", "Nunito", system-ui, -apple-system, sans-serif;
        user-select: none;
        overflow-y: auto;
        overflow-x: hidden;
        width: 100vw;
        max-width: 100vw;
        box-sizing: border-box;
      }

      .hc-ambient-bg {
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at 30% 40%, rgba(30, 27, 75, 0.6) 0%, rgba(10, 11, 16, 0.95) 70%, #050608 100%);
        pointer-events: none;
      }

      .hc-top-header {
        position: relative;
        z-index: 2;
        padding: 16px 20px 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .hc-brand-pill {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        background: rgba(255, 255, 255, 0.06);
        padding: 6px 14px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .hc-badge {
        background: #38bdf8;
        color: #082f49;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .08em;
        padding: 3px 8px;
        border-radius: 6px;
      }

      .hc-title {
        font-size: 18px;
        font-weight: 700;
        color: #ffffff;
      }

      .hc-subtitle {
        margin: 6px 0 0;
        font-size: 13px;
        color: #94a3b8;
      }

      .hc-workspace {
        position: relative;
        z-index: 2;
        flex: 1;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 460px;
        max-width: 1360px;
        width: 100%;
        margin: 0 auto;
        padding: 12px 20px 24px;
        gap: 20px;
        align-items: center;
        box-sizing: border-box;
      }

      @media (max-width: 900px) {
        .human-customizer-container {
          overflow: hidden !important;
          height: 100vh !important;
          max-height: 100vh !important;
          box-sizing: border-box !important;
        }
        .hc-top-header {
          padding: 6px 12px 2px !important;
        }
        .hc-brand-pill {
          padding: 3px 10px !important;
        }
        .hc-badge {
          font-size: 9px !important;
          padding: 2px 6px !important;
        }
        .hc-title {
          font-size: 13px !important;
        }
        .hc-subtitle {
          display: none !important;
        }
        .hc-workspace {
          display: grid !important;
          grid-template-columns: 1fr 1.15fr !important;
          gap: 8px !important;
          padding: 4px 8px 10px !important;
          height: calc(100vh - 44px) !important;
          max-height: calc(100vh - 44px) !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          align-items: stretch !important;
        }
        .hc-viewport-card {
          min-height: unset !important;
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
          width: 100% !important;
        }
        .hc-canvas-container {
          max-width: 100% !important;
          width: 100% !important;
          height: 100% !important;
          max-height: calc(100vh - 56px) !important;
          aspect-ratio: unset !important;
          border-radius: 16px !important;
        }
        .hc-turntable-hint, .hc-emotes-row {
          display: none !important;
        }
        .hc-viewport-badge {
          font-size: 9.5px !important;
          padding: 3px 8px !important;
          top: 8px !important;
          left: 8px !important;
        }
        .hc-controls-card {
          height: 100% !important;
          max-height: calc(100vh - 56px) !important;
          padding: 10px !important;
          border-radius: 16px !important;
          gap: 8px !important;
          overflow-y: auto !important;
          box-sizing: border-box !important;
        }
        .hc-identity-row label {
          font-size: 10px !important;
        }
        .hc-input-box input {
          padding: 5px 8px !important;
          font-size: 12px !important;
          border-radius: 10px !important;
        }
        .hc-tabs-bar {
          gap: 6px !important;
          padding: 4px 6px !important;
          border-radius: 999px !important;
          display: flex !important;
          overflow-x: auto !important;
          scrollbar-width: none !important;
          -webkit-overflow-scrolling: touch !important;
        }
        .hc-tabs-bar::-webkit-scrollbar {
          display: none !important;
        }
        .hc-tab-btn {
          font-size: 11.5px !important;
          padding: 6px 12px !important;
          min-width: auto !important;
          flex: 0 0 auto !important;
          border-radius: 999px !important;
          white-space: nowrap !important;
        }
        .hc-tab-body {
          max-height: calc(100vh - 210px) !important;
          min-height: 120px !important;
        }
        .hc-swatches-grid {
          grid-template-columns: repeat(auto-fill, minmax(36px, 1fr)) !important;
          gap: 8px !important;
        }
        .hc-char-card {
          padding: 10px 12px !important;
          gap: 10px !important;
          border-radius: 14px !important;
        }
        .hc-char-avatar-icon {
          font-size: 22px !important;
          width: 36px !important;
          height: 36px !important;
          border-radius: 10px !important;
        }
        .hc-char-info strong {
          font-size: 13.5px !important;
        }
        .hc-char-tag {
          font-size: 10.5px !important;
          padding: 3px 9px !important;
        }
        .hc-footer-actions {
          padding-top: 8px !important;
          margin-top: auto !important;
          gap: 8px !important;
        }
        .hc-btn-secondary {
          padding: 9px 14px !important;
          font-size: 12px !important;
        }
        .hc-btn-primary {
          padding: 9px 16px !important;
          font-size: 13px !important;
        }
      }

      .hc-viewport-card {
        height: 100%;
        min-height: 480px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100%;
      }

      .hc-canvas-container {
        position: relative;
        width: 100%;
        max-width: 520px;
        aspect-ratio: 1;
        border-radius: 28px;
        background: radial-gradient(circle at 50% 70%, rgba(56, 189, 248, 0.12) 0%, rgba(15, 23, 42, 0.3) 60%, rgba(5, 7, 12, 0.8) 100%);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.1);
        overflow: hidden;
        cursor: grab;
      }

      .hc-canvas-container:active {
        cursor: grabbing;
      }

      #hc-preview-canvas {
        width: 100%;
        height: 100%;
        display: block;
      }

      .hc-viewport-badge {
        position: absolute;
        top: 16px;
        left: 16px;
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #e2e8f0;
        font-size: 12px;
        font-weight: 600;
        padding: 6px 14px;
        border-radius: 999px;
        backdrop-filter: blur(8px);
      }

      .hc-turntable-hint {
        position: absolute;
        bottom: 14px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(15, 23, 42, 0.85);
        color: #94a3b8;
        font-size: 12px;
        font-weight: 500;
        padding: 6px 16px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        pointer-events: none;
        backdrop-filter: blur(8px);
      }

      .hc-emotes-row {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 14px;
        max-width: 520px;
        width: 100%;
      }

      .hc-emote-btn {
        padding: 6px 14px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #f1f5f9;
        font-family: inherit;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .hc-emote-btn:hover {
        background: #38bdf8;
        color: #082f49;
        border-color: #38bdf8;
        transform: translateY(-2px);
        box-shadow: 0 4px 14px rgba(56, 189, 248, 0.35);
      }

      .hc-loader-spinner {
        position: absolute;
        inset: 0;
        background: rgba(10, 14, 23, 0.85);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 14px;
        color: #38bdf8;
        font-weight: 600;
        font-size: 14px;
        transition: opacity 0.3s ease;
      }

      .spinner-ring {
        width: 44px;
        height: 44px;
        border: 3.5px solid rgba(56, 189, 248, 0.2);
        border-top-color: #38bdf8;
        border-radius: 50%;
        animation: hc-spin 0.8s linear infinite;
      }

      @keyframes hc-spin {
        to { transform: rotate(360deg); }
      }

      .hc-controls-card {
        background: rgba(17, 24, 39, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 28px;
        padding: 24px;
        backdrop-filter: blur(20px);
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-height: 85vh;
      }

      .hc-identity-row {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .hc-identity-row label {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: .06em;
        color: #94a3b8;
      }

      .hc-input-box input {
        width: 100%;
        box-sizing: border-box;
        padding: 12px 16px;
        border-radius: 14px;
        background: rgba(15, 23, 42, 0.75);
        border: 1.5px solid rgba(255, 255, 255, 0.12);
        color: #fff;
        font-family: inherit;
        font-size: 15px;
        font-weight: 600;
        outline: none;
        transition: border-color .15s ease;
      }

      .hc-input-box input:focus {
        border-color: #38bdf8;
        box-shadow: 0 0 14px rgba(56, 189, 248, 0.3);
      }

      .hc-tabs-bar {
        display: flex;
        gap: 6px;
        padding: 5px;
        background: rgba(15, 23, 42, 0.85);
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        overflow-x: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;
        -webkit-overflow-scrolling: touch;
      }
      .hc-tabs-bar::-webkit-scrollbar {
        display: none;
      }

      .hc-tab-btn {
        flex: 0 0 auto;
        padding: 7px 14px;
        border-radius: 999px;
        border: 1px solid transparent;
        background: rgba(255, 255, 255, 0.04);
        color: #94a3b8;
        font-family: inherit;
        font-size: 12.5px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.15s ease;
        white-space: nowrap;
      }

      .hc-tab-btn:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.05);
      }

      .hc-tab-btn.active {
        background: #38bdf8;
        color: #082f49;
        font-weight: 700;
        box-shadow: 0 4px 12px rgba(56, 189, 248, 0.3);
      }

      .hc-tab-body {
        min-height: 200px;
        max-height: 270px;
        overflow-y: auto;
        padding-right: 6px;
      }

      .hc-tab-body::-webkit-scrollbar {
        width: 5px;
      }
      .hc-tab-body::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 999px;
      }

      /* Filter Pills for Categories */
      .hc-filter-pills {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
        position: sticky;
        top: 0;
        background: #0d1117;
        padding: 6px 0;
        z-index: 10;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }

      .hc-pill {
        padding: 6px 14px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #94a3b8;
        font-family: inherit;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .hc-pill:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
      }

      .hc-pill.active {
        background: #38bdf8;
        color: #082f49;
        font-weight: 700;
        border-color: #38bdf8;
        box-shadow: 0 2px 10px rgba(56, 189, 248, 0.3);
      }

      /* Character Card Selection */
      .hc-chars-grid {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .hc-char-card {
        padding: 12px 16px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.04);
        border: 1.5px solid rgba(255, 255, 255, 0.08);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        transition: all 0.15s ease;
      }

      .hc-char-card:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.2);
        transform: translateY(-1px);
      }

      .hc-char-card.active {
        background: rgba(56, 189, 248, 0.15);
        border-color: #38bdf8;
        box-shadow: 0 0 16px rgba(56, 189, 248, 0.25);
      }

      .hc-char-card-left {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }

      .hc-char-avatar-icon {
        font-size: 26px;
        width: 44px;
        height: 44px;
        display: grid;
        place-items: center;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        flex-shrink: 0;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .hc-char-card.active .hc-char-avatar-icon {
        background: rgba(56, 189, 248, 0.2);
        border-color: #38bdf8;
      }

      .hc-char-info {
        min-width: 0;
      }

      .hc-char-info strong {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        font-size: 15px;
        color: #fff;
      }

      .hc-char-tagline {
        font-size: 11px;
        font-weight: 500;
        font-style: italic;
        color: #38bdf8;
      }

      .hc-char-info small {
        color: #94a3b8;
        font-size: 12px;
        line-height: 1.3;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .hc-char-tag {
        font-size: 11px;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.1);
        color: #cbd5e1;
        white-space: nowrap;
        flex-shrink: 0;
      }

      .hc-tag-meme {
        background: rgba(245, 158, 11, 0.18);
        color: #fcd34d;
        border: 1px solid rgba(245, 158, 11, 0.35);
      }

      .hc-tag-human {
        background: rgba(56, 189, 248, 0.15);
        color: #38bdf8;
        border: 1px solid rgba(56, 189, 248, 0.3);
      }

      .hc-char-card.active .hc-char-tag {
        background: #38bdf8;
        color: #082f49;
        border-color: #38bdf8;
      }

      /* Swatch Grid */
      .hc-swatches-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
        gap: 12px;
        padding: 8px 4px;
      }

      .hc-color-swatch {
        aspect-ratio: 1;
        border-radius: 12px;
        border: 2.5px solid rgba(255, 255, 255, 0.15);
        cursor: pointer;
        transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        position: relative;
      }

      .hc-color-swatch:hover {
        transform: scale(1.12);
        border-color: #fff;
      }

      .hc-color-swatch.active {
        transform: scale(1.15);
        border-color: #ffffff;
        box-shadow: 0 0 16px rgba(255, 255, 255, 0.9);
      }

      .hc-color-swatch.active::after {
        content: "✓";
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        color: #fff;
        font-size: 16px;
        font-weight: 700;
        text-shadow: 0 1px 3px rgba(0,0,0,0.8);
      }

      /* Info Box */
      .hc-model-info-box {
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        padding: 12px 14px;
        display: flex;
        gap: 10px;
        align-items: flex-start;
      }

      .hc-info-icon {
        font-size: 16px;
      }

      .hc-info-text strong {
        display: block;
        font-size: 12px;
        color: #38bdf8;
        text-transform: uppercase;
        letter-spacing: .05em;
      }

      .hc-info-text p {
        margin: 2px 0 0;
        font-size: 12px;
        color: #94a3b8;
        line-height: 1.4;
      }

      /* Footer Actions */
      .hc-footer-actions {
        display: flex;
        gap: 12px;
        margin-top: 4px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }

      .hc-btn-secondary {
        padding: 14px 20px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(255, 255, 255, 0.06);
        color: #f1f5f9;
        font-family: inherit;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .hc-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.12);
        transform: translateY(-1px);
      }

      .hc-btn-primary {
        flex: 1;
        padding: 14px 24px;
        border-radius: 999px;
        border: 0;
        background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%);
        color: #082f49;
        font-family: inherit;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        box-shadow: 0 6px 20px rgba(14, 165, 233, 0.35);
        transition: all 0.15s ease;
      }

      .hc-btn-primary:hover {
        box-shadow: 0 10px 28px rgba(14, 165, 233, 0.5);
        transform: translateY(-2px);
      }

      .hc-enter-arrow {
        font-size: 18px;
      }
    `;

    const el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
  }

  init3DStage() {
    this.canvas = document.getElementById('hc-preview-canvas');
    this.wrap = document.getElementById('hc-canvas-wrap');
    this.spinner = document.getElementById('hc-spinner');

    const width = this.wrap.clientWidth || 480;
    const height = this.wrap.clientHeight || 480;

    // Three.js Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 50);
    this.camera.position.set(0, 1.1, 3.4);
    this.camera.lookAt(0, 0.9, 0);

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

    // Studio Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xfff5ea, 2.2);
    key.position.set(2.5, 4, 3);
    key.castShadow = true;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xa5c4ff, 1.2);
    fill.position.set(-3, 2, -1);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0x38bdf8, 1.5);
    rim.position.set(0, 3, -3);
    this.scene.add(rim);

    // Circular Turntable Pedestal
    const pedestalGroup = new THREE.Group();
    const diskGeo = new THREE.CylinderGeometry(1.0, 1.05, 0.08, 48);
    const diskMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.35,
      metalness: 0.2
    });
    const disk = new THREE.Mesh(diskGeo, diskMat);
    disk.position.y = -0.04;
    disk.receiveShadow = true;
    pedestalGroup.add(disk);

    // Glowing Cyan Edge Ring
    const ringGeo = new THREE.RingGeometry(0.96, 1.0, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.002;
    pedestalGroup.add(ring);
    this.scene.add(pedestalGroup);

    // Character Group
    this.characterGroup = new THREE.Group();
    this.scene.add(this.characterGroup);

    // 360° Drag Rotation Controls
    this.isDragging = false;
    this.prevMouseX = 0;

    this.wrap.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.prevMouseX = e.clientX;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.prevMouseX;
      this.prevMouseX = e.clientX;
      this.characterGroup.rotation.y += deltaX * 0.012;
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
      this.characterGroup.rotation.y += deltaX * 0.012;
    });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    // Render loop
    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    // Responsive Canvas & Camera Sizing
    const updateSize = () => {
      if (!this.wrap || !this.renderer || !this.camera) return;
      const w = this.wrap.clientWidth || 360;
      const h = this.wrap.clientHeight || 320;
      this.camera.aspect = w / h;
      if (w < 640) {
        this.camera.fov = 42;
        this.camera.position.set(0, 1.0, 4.2);
      } else {
        this.camera.fov = 35;
        this.camera.position.set(0, 1.1, 3.4);
      }
      this.camera.lookAt(0, 0.9, 0);
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
    };

    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => updateSize());
      ro.observe(this.wrap);
    }
    window.addEventListener('resize', updateSize);
    setTimeout(updateSize, 60);
    setTimeout(updateSize, 300);

    this.attachActionListeners();
  }

  renderEmoteButtons(avatarInstance, charDef) {
    const bar = document.getElementById('hc-emotes-bar');
    if (!bar) return;
    bar.innerHTML = '';

    const buttons = [];

    if (charDef.isChibiNetKid) {
      buttons.push({
        label: '🐱 Cat Ears Poke',
        action: () => {
          if (this.currentAvatarInstance && this.currentAvatarInstance.root) {
            const creature = this.currentAvatarInstance.root.children[0]?.userData?.creature;
            if (creature) creature.poke = 1;
          }
        }
      });
      buttons.push({
        label: '🚶 Walk Stride',
        action: () => {
          let count = 0;
          const interval = setInterval(() => {
            if (this.currentAvatarInstance) {
              this.currentAvatarInstance.update(0.016, true, false);
            }
            count++;
            if (count > 70) clearInterval(interval);
          }, 16);
        }
      });
      buttons.push({
        label: '🏃 Sprint Stride',
        action: () => {
          let count = 0;
          const interval = setInterval(() => {
            if (this.currentAvatarInstance) {
              this.currentAvatarInstance.update(0.016, true, true);
            }
            count++;
            if (count > 70) clearInterval(interval);
          }, 16);
        }
      });
    } else {
      const stepBtn = document.createElement('button');
      stepBtn.type = 'button';
      stepBtn.className = 'hc-emote-btn';
      stepBtn.innerHTML = '🚶 Test Walk Stride';
      stepBtn.onclick = () => {
        let count = 0;
        const interval = setInterval(() => {
          if (this.currentAvatarInstance) {
            this.currentAvatarInstance.update(0.016, true, false);
          }
          count++;
          if (count > 70) clearInterval(interval);
        }, 16);
      };
      bar.appendChild(stepBtn);
      return;
    }

    buttons.forEach(b => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hc-emote-btn';
      btn.innerHTML = b.label;
      btn.onclick = b.action;
      bar.appendChild(btn);
    });
  }

  async loadCharacterPreview() {
    this.spinner.style.opacity = '1';
    this.spinner.style.pointerEvents = 'all';

    try {
      const charId = (this.activeConfig.characterId && !this.activeConfig.characterId.includes('uploaded')) ? this.activeConfig.characterId : 'chibi_netkid';
      const charDef = CHARACTER_CATALOG.find(c => c.id === charId) || CHARACTER_CATALOG[0];

      // Clean up previous avatar
      if (this.currentAvatarInstance) {
        this.characterGroup.remove(this.currentAvatarInstance.root);
      }

      this.currentAvatarInstance = await this.manager.instantiateAvatar(charId, this.activeConfig);
      this.characterGroup.add(this.currentAvatarInstance.root);
      this.characterGroup.rotation.y = 0;

      // Update Badge & Info Display
      const badgeEl = document.getElementById('hc-char-badge');
      if (badgeEl) badgeEl.textContent = `${charDef.icon || '👤'} ${charDef.name} · ${charDef.category || 'Avatar'}`;
      const titleEl = document.getElementById('hc-info-title');
      if (titleEl) titleEl.textContent = `${charDef.name} ${charDef.tagline ? `("${charDef.tagline}")` : ''}`;
      const descEl = document.getElementById('hc-info-desc');
      if (descEl) descEl.textContent = charDef.description || '';

      // Render interactive emote preview buttons
      if (document.getElementById('hc-emotes-bar')) {
        this.renderEmoteButtons(this.currentAvatarInstance, charDef);
      }
    } catch (e) {
      console.error('Error loading avatar preview:', e);
      const badgeEl = document.getElementById('hc-char-badge');
      if (badgeEl) badgeEl.textContent = `${charDef.name || 'Avatar'}`;
    } finally {
      if (this.spinner) {
        this.spinner.style.opacity = '0';
        this.spinner.style.pointerEvents = 'none';
      }
    }
  }

  animate() {
    if (!this.overlay) return;
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    // Update avatar animation
    if (this.currentAvatarInstance) {
      this.currentAvatarInstance.update(delta, false, false);
    }

    // Gentle auto-turntable when idle
    if (!this.isDragging) {
      this.characterGroup.rotation.y += 0.003;
    }

    this.renderer.render(this.scene, this.camera);
  }

  renderTabs() {
    const tabs = [
      { id: 'characters', label: '👤 Avatars' },
      { id: 'style', label: '🐱 Cat Hood' },
      { id: 'skin', label: '🎨 Skin' },
      { id: 'hair', label: '💇 Hair' },
      { id: 'tops', label: '👕 Hoodie' },
      { id: 'bottoms', label: '👖 Joggers' },
      { id: 'shoes', label: '👟 Kicks' },
      { id: 'glow', label: '✨ LED Glow' }
    ];

    const bar = document.getElementById('hc-tabs-bar');
    bar.innerHTML = tabs.map(t => `
      <button type="button" class="hc-tab-btn ${this.activeTab === t.id ? 'active' : ''}" data-tab="${t.id}">
        ${t.label}
      </button>
    `).join('');

    bar.querySelectorAll('.hc-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.tab;
        this.renderTabs();
        this.renderActiveTabContent();
      });
    });
  }

  renderActiveTabContent() {
    const body = document.getElementById('hc-tab-body');

    // 1. Character Selector Tab
    if (this.activeTab === 'characters') {
      body.innerHTML = `
        <div style="margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 13px; font-weight: 700; color: #cbd5e1;">Available Avatars</span>
          <span style="font-size: 11px; font-weight: 700; color: #38bdf8; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); padding: 2px 8px; border-radius: 999px;">100% Animated</span>
        </div>
        <div class="hc-chars-grid">
          ${CHARACTER_CATALOG.map(c => `
            <div class="hc-char-card ${this.activeConfig.characterId === c.id ? 'active' : ''}" data-char-id="${c.id}">
              <div class="hc-char-card-left">
                <div class="hc-char-avatar-icon">${c.icon}</div>
                <div class="hc-char-info">
                  <strong>${c.name}</strong>
                  <small style="color: #94a3b8; font-size: 11.5px; font-weight: 500;">${c.tagline || ''}</small>
                </div>
              </div>
              <span class="hc-char-tag hc-tag-meme">${c.gender}</span>
            </div>
          `).join('')}
        </div>
      `;

      // Character card click listeners
      body.querySelectorAll('.hc-char-card').forEach(card => {
        card.addEventListener('click', async () => {
          const charId = card.dataset.charId;
          this.activeConfig.characterId = charId;
          this.renderActiveTabContent();
          await this.loadCharacterPreview();
        });
      });
      return;
    }

    // 2. Hood Style Tab (Cat Hood 🐱, Hood Up 🧥, Hood Down 💇)
    if (this.activeTab === 'style') {
      body.innerHTML = `
        <div class="hc-chars-grid">
          ${HOOD_STYLES.map(s => `
            <div class="hc-char-card ${this.activeConfig.style === s.id ? 'active' : ''}" data-style-id="${s.id}">
              <div class="hc-char-card-left">
                <div class="hc-char-avatar-icon">${s.icon}</div>
                <div class="hc-char-info">
                  <strong>${s.name}</strong>
                  <small>${s.desc}</small>
                </div>
              </div>
              <span class="hc-char-tag hc-tag-meme">${s.id.toUpperCase()}</span>
            </div>
          `).join('')}
        </div>
      `;

      body.querySelectorAll('.hc-char-card').forEach(card => {
        card.addEventListener('click', () => {
          const styleId = card.dataset.styleId;
          this.activeConfig.style = styleId;
          this.renderActiveTabContent();
          if (this.currentAvatarInstance && this.currentAvatarInstance.applyColors) {
            this.currentAvatarInstance.applyColors({ style: styleId });
          }
        });
      });
      return;
    }

    // 3. Glowing LED Color Tab
    if (this.activeTab === 'glow') {
      const colors = GLOW_COLORS;
      const configKey = 'glowColor';

      body.innerHTML = `
        <div class="hc-swatches-grid">
          ${colors.map(item => `
            <button type="button" 
              class="hc-color-swatch ${this.activeConfig[configKey] === item.color ? 'active' : ''}" 
              style="background: ${item.color}; box-shadow: 0 0 10px ${item.color};" 
              data-color="${item.color}"
              title="${item.name}">
            </button>
          `).join('')}
        </div>
      `;

      body.querySelectorAll('.hc-color-swatch').forEach(btn => {
        btn.addEventListener('click', () => {
          const color = btn.dataset.color;
          this.activeConfig[configKey] = color;
          this.renderActiveTabContent();
          if (this.currentAvatarInstance && this.currentAvatarInstance.applyColors) {
            this.currentAvatarInstance.applyColors({ [configKey]: color });
          }
        });
      });
      return;
    }

    // 4. Color Swatches (Skin, Hair, Tops/Hoodie, Bottoms/Joggers, Shoes/Kicks)
    let colors = CLOTHING_COLORS;
    let configKey = 'topColor';

    if (this.activeTab === 'skin') {
      colors = SKIN_TONES;
      configKey = 'skinColor';
    } else if (this.activeTab === 'hair') {
      colors = HAIR_COLORS;
      configKey = 'hairColor';
    } else if (this.activeTab === 'tops') {
      colors = CLOTHING_COLORS;
      configKey = 'topColor';
    } else if (this.activeTab === 'bottoms') {
      colors = CLOTHING_COLORS;
      configKey = 'bottomColor';
    } else if (this.activeTab === 'shoes') {
      colors = CLOTHING_COLORS;
      configKey = 'shoeColor';
    }

    body.innerHTML = `
      <div class="hc-swatches-grid">
        ${colors.map(item => `
          <button type="button" 
            class="hc-color-swatch ${this.activeConfig[configKey] === item.color ? 'active' : ''}" 
            style="background: ${item.color}" 
            data-color="${item.color}"
            title="${item.name}">
          </button>
        `).join('')}
      </div>
    `;

    body.querySelectorAll('.hc-color-swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.dataset.color;
        this.activeConfig[configKey] = color;
        this.renderActiveTabContent();

        // Apply immediately to 3D preview
        if (this.currentAvatarInstance && this.currentAvatarInstance.applyColors) {
          this.currentAvatarInstance.applyColors({ [configKey]: color });
        }
      });
    });
  }

  attachActionListeners() {
    // Player Name Input
    const nameInput = document.getElementById('hc-name-input');
    nameInput.addEventListener('input', () => {
      this.activeConfig.name = nameInput.value.trim() || 'Player';
    });

    // Randomize
    document.getElementById('hc-random-btn').addEventListener('click', () => {
      const randomSkin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)].color;
      const randomHair = HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)].color;
      const randomTop = CLOTHING_COLORS[Math.floor(Math.random() * CLOTHING_COLORS.length)].color;
      const randomBottom = CLOTHING_COLORS[Math.floor(Math.random() * CLOTHING_COLORS.length)].color;
      const randomShoe = CLOTHING_COLORS[Math.floor(Math.random() * CLOTHING_COLORS.length)].color;
      const randomGlow = GLOW_COLORS[Math.floor(Math.random() * GLOW_COLORS.length)].color;
      const randomStyle = HOOD_STYLES[Math.floor(Math.random() * HOOD_STYLES.length)].id;

      Object.assign(this.activeConfig, {
        skinColor: randomSkin,
        hairColor: randomHair,
        topColor: randomTop,
        bottomColor: randomBottom,
        shoeColor: randomShoe,
        glowColor: randomGlow,
        style: randomStyle
      });

      if (this.currentAvatarInstance && this.currentAvatarInstance.applyColors) {
        this.currentAvatarInstance.applyColors(this.activeConfig);
      }
      this.renderActiveTabContent();
    });

    // Enter World
    document.getElementById('hc-enter-world-btn').addEventListener('click', () => {
      this.enterWorld();
    });
  }

  enterWorld() {
    // Save configuration
    this.manager.saveConfig(this.activeConfig);
    localStorage.setItem('aa.game.v1', '1');

    // Also sync with Attention Agents look storage
    try {
      const existingLook = JSON.parse(localStorage.getItem('aa.look.v1') || '{}');
      const updatedLook = {
        ...existingLook,
        skin: this.activeConfig.skinColor,
        hair: this.activeConfig.hairColor,
        style: this.activeConfig.style || 'ears',
        hoodie: this.activeConfig.topColor,
        pants: this.activeConfig.bottomColor,
        kicks: this.activeConfig.shoeColor,
        glow: this.activeConfig.glowColor
      };
      localStorage.setItem('aa.look.v1', JSON.stringify(updatedLook));
    } catch (e) {}

    // Fade out overlay
    this.overlay.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    this.overlay.style.opacity = '0';
    this.overlay.style.transform = 'scale(1.03)';

    setTimeout(() => {
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      if (this.onEnterWorld) {
        this.onEnterWorld(this.activeConfig);
      }
    }, 400);
  }
}
