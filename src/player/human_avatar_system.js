// ==========================================================================
// 3D Human Avatar System (attentionagents.fun Official Avatars & 3D Scans)
// Featuring:
// 1. Chibi Net Kid (The iconic attentionagents.fun funny hero: Cat Hood 🐱,
//    oversized hoodie, glowing LED headphones, baggy joggers, chunky kicks)
// 2. Musebot Sprout (Fluffy Attention Agents mascot with sprout leaf & waddle)
// 3. Agent Gumdrop (Cyber-cafe candy mascot with accessories)
// 4. Plush Mascot (Layered fur shells mascot)
// 5. Realistic Streetwear Male, Female & Youth Scans (man.glb, woman.glb, child.glb)
// ==========================================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { makePerson, DEFAULT_LOOK } from '../aa/person3d.js';
import { buildAgent, COLORS as AGENT_COLORS } from '../aa/cast3d.js';
import { makeGenes } from '../aa/agents3d.js';
import { buildVisitor, MUSE_KINDS } from '../aa/visitor3d.js';

// Pre-defined Natural Skin & Tint Tones
export const SKIN_TONES = [
  { name: 'Fair Light', color: '#ffd6ba' },
  { name: 'Warm Peach', color: '#ffc7a6' },
  { name: 'Golden Olive', color: '#eaab83' },
  { name: 'Caramel Bronze', color: '#d08f63' },
  { name: 'Deep Mocha', color: '#ad7049' },
  { name: 'Rich Espresso', color: '#7d5136' },
  { name: 'Cyber Neon', color: '#38bdf8' },
  { name: 'Vibrant Coral', color: '#fb7185' }
];

// Color Palettes for Clothing & Accents
export const CLOTHING_COLORS = [
  { name: 'Cyber Lavender', color: '#8f7cf2' },
  { name: 'Bubblegum Pink', color: '#ff9ec0' },
  { name: 'Neon Mint', color: '#6fd6bd' },
  { name: 'Mustard Gold', color: '#ffd36e' },
  { name: 'Sky Blue', color: '#7cb8ff' },
  { name: 'Clean White', color: '#e8e4dc' },
  { name: 'Midnight Navy', color: '#33364d' },
  { name: 'Dark Slate', color: '#1f1e26' },
  { name: 'Sage Olive', color: '#6b7a45' },
  { name: 'Warm Cream', color: '#c9b8a0' }
];

export const HAIR_COLORS = [
  { name: 'Natural Black', color: '#1c1917' },
  { name: 'Dark Chestnut', color: '#3b2a24' },
  { name: 'Golden Blonde', color: '#e2b766' },
  { name: 'Auburn Copper', color: '#c8613d' },
  { name: 'Silver Platinum', color: '#cbd5e1' },
  { name: 'Cyber Violet', color: '#8f7ad9' },
  { name: 'Pastel Cyan', color: '#6fd3e0' },
  { name: 'Sakura Pink', color: '#f2a3b8' }
];

export const GLOW_COLORS = [
  { name: 'Cyber Cyan', color: '#3ff0e0' },
  { name: 'Hot Magenta', color: '#ff4fd8' },
  { name: 'Neon Violet', color: '#b47cff' },
  { name: 'Electric Lime', color: '#7dff6a' },
  { name: 'Amber Gold', color: '#ffb13b' },
  { name: 'Laser Red', color: '#ff4a5e' }
];

export const HOOD_STYLES = [
  { id: 'ears', name: 'Cat Hood 🐱', icon: '🐱', desc: 'Cute Cat Ears on Hood' },
  { id: 'hood', name: 'Hood Up 🧥', icon: '🧥', desc: 'Soft Round Hood Framing Face' },
  { id: 'down', name: 'Hood Down 💇', icon: '💇', desc: 'Swept Anime Hair & Headphones' }
];

// OFFICIAL ATTENTION AGENTS & 3D SCAN CATALOG
export const CHARACTER_CATALOG = [
  // --- ATTENTION AGENTS OFFICIAL AVATARS (attentionagents.fun) ---
  {
    id: 'chibi_netkid',
    name: 'Chibi Net Kid',
    category: 'Attention Agents',
    gender: 'Hero Chibi',
    icon: '🐱',
    tagline: 'The Iconic attentionagents.fun Hero',
    description: 'The authentic funny avatar from attentionagents.fun: oversized hoodie, cat ears hood, big sparkling anime eyes, glowing LED headphones & chunky kicks!',
    isChibiNetKid: true,
    isRigged: false,
    targetHeight: 1.48,
    yOffset: 0
  },
  {
    id: 'muse_mascot',
    name: 'Musebot Sprout',
    category: 'Attention Agents',
    gender: 'Fluffy Mascot',
    icon: '🌱',
    tagline: 'Trailer Mascot with Sprout Leaf',
    description: 'The official fluffy Attention Agents mascot from attentionagents.fun: peach face panel, sprout leaf, bead eyes and hilarious waddle walk!',
    isVisitor: true,
    visitorKind: 'muse',
    isRigged: false,
    targetHeight: 1.45,
    yOffset: 0
  },
  {
    id: 'agent_gumdrop',
    name: 'Agent Gumdrop',
    category: 'Metaverse Mascots',
    gender: 'Candy Agent',
    icon: '🍬',
    tagline: 'Cyber-Cafe Agent Mascot',
    description: 'The official Metaverse gumdrop: candy gloss body, blush cheeks, cap, beanie, headphones, glasses & accessories.',
    isAgent: true,
    isRigged: false,
    targetHeight: 1.35,
    yOffset: 0
  },
  {
    id: 'plush_mascot',
    name: 'Plush Fur Mascot',
    category: 'Metaverse Mascots',
    gender: 'Fluffy Plush',
    icon: '🧸',
    tagline: 'Stacked Fur Shells Mascot',
    description: 'The official Metaverse plush mascot with layered fur shells, bead eyes and cute smile.',
    isVisitor: true,
    visitorKind: 'plush',
    isRigged: false,
    targetHeight: 1.6,
    yOffset: 0
  }
];

export class HumanAvatarManager {
  constructor() {
    this.loader = new GLTFLoader();
    this.currentConfig = this.loadSavedConfig();
    this.modelCache = new Map();
  }

  loadSavedConfig() {
    try {
      const raw = localStorage.getItem('aa_human_avatar_config');
      if (raw) {
        const parsed = JSON.parse(raw);
        // Sanitize out old static scans
        const badIds = ['man_uploaded', 'woman_uploaded', 'child_uploaded'];
        const chosenId = (parsed && parsed.characterId && !badIds.includes(parsed.characterId)) 
          ? parsed.characterId 
          : 'chibi_netkid';

        return {
          characterId: chosenId,
          style: parsed.style || 'ears',
          skinColor: parsed.skinColor || '#ffc7a6',
          hairColor: parsed.hairColor || '#3b2a24',
          topColor: parsed.topColor || '#8f7cf2',
          bottomColor: parsed.bottomColor || '#33364d',
          shoeColor: parsed.shoeColor || '#dcd8d0',
          glowColor: parsed.glowColor || '#3ff0e0',
          name: parsed.name || localStorage.getItem('aa.name.v1') || 'Alex'
        };
      }
    } catch (e) {
      console.warn('Failed to read saved avatar config:', e);
    }

    return {
      characterId: 'chibi_netkid',
      style: 'ears',
      skinColor: '#ffc7a6',
      hairColor: '#3b2a24',
      topColor: '#8f7cf2',
      bottomColor: '#33364d',
      shoeColor: '#dcd8d0',
      glowColor: '#3ff0e0',
      name: localStorage.getItem('aa.name.v1') || 'Alex'
    };
  }

  saveConfig(config) {
    this.currentConfig = { ...this.currentConfig, ...config };
    try {
      localStorage.setItem('aa_human_avatar_config', JSON.stringify(this.currentConfig));
      if (config.name) {
        localStorage.setItem('aa.name.v1', config.name);
      }
    } catch (e) {
      console.warn('Could not save avatar config:', e);
    }
  }

  // Load and instantiate an authentic character instance
  async instantiateAvatar(characterId, customConfig = null) {
    const config = customConfig || this.currentConfig;
    const charDef = CHARACTER_CATALOG.find(c => c.id === characterId) || CHARACTER_CATALOG[0];

    // 1. Chibi Net Kid (The official attentionagents.fun hero avatar)
    if (charDef.isChibiNetKid) {
      const look = {
        skin: config.skinColor || '#ffc7a6',
        hair: config.hairColor || '#3b2a24',
        style: config.style || 'ears',
        hoodie: config.topColor || '#8f7cf2',
        pants: config.bottomColor || '#33364d',
        kicks: config.shoeColor || '#dcd8d0',
        glow: config.glowColor || '#3ff0e0'
      };

      const root = new THREE.Group();
      let person = makePerson(look, 7);
      person.scale.setScalar(0.95);
      root.add(person);

      const avatarInstance = {
        root,
        definition: charDef,
        materials: person.userData.creature?.mats || [],
        meshes: [],
        mixer: null,
        actions: {},
        activeAction: null,
        config: { ...config, ...look },
        isRigged: false,
        update: (delta, isMoving = false, isRunning = false) => {
          const creature = person.userData.creature;
          if (creature) {
            creature.walk = isMoving ? (isRunning ? 1.4 : 0.8) : 0;
            if (isMoving) creature.walkPhase += delta * (isRunning ? 14 : 9);
            creature.update(performance.now() * 0.001, delta);
          }
        },
        applyColors: (newConfig) => {
          Object.assign(avatarInstance.config, newConfig);
          const nextLook = {
            skin: avatarInstance.config.skinColor || look.skin,
            hair: avatarInstance.config.hairColor || look.hair,
            style: avatarInstance.config.style || look.style,
            hoodie: avatarInstance.config.topColor || look.hoodie,
            pants: avatarInstance.config.bottomColor || look.pants,
            kicks: avatarInstance.config.shoeColor || look.kicks,
            glow: avatarInstance.config.glowColor || look.glow
          };
          root.remove(person);
          person = makePerson(nextLook, 7);
          person.scale.setScalar(0.95);
          root.add(person);
        }
      };
      return avatarInstance;
    }

    // 2. Musebot Sprout or Plush Mascot
    if (charDef.isVisitor) {
      const root = new THREE.Group();
      let visitor = buildVisitor(charDef.visitorKind, 'mint');
      root.add(visitor);

      const avatarInstance = {
        root,
        definition: charDef,
        materials: [],
        meshes: [],
        mixer: null,
        actions: {},
        activeAction: null,
        config: { ...config },
        isRigged: false,
        update: (delta, isMoving = false, isRunning = false) => {
          const creature = visitor.userData.creature;
          if (creature) {
            creature.walk = isMoving ? (isRunning ? 1.2 : 0.8) : 0.2;
            creature.walkPhase += delta * (isMoving ? 8 : 2);
            creature.update(performance.now() * 0.001, delta);
          }
        },
        applyColors: () => {}
      };
      return avatarInstance;
    }

    // 3. Attention Agent Candy Gumdrop
    if (charDef.isAgent) {
      const root = new THREE.Group();
      const genes = makeGenes(42);
      let agent = buildAgent(genes);
      root.add(agent);

      const avatarInstance = {
        root,
        definition: charDef,
        materials: agent.userData.creature?.mats || [],
        meshes: [],
        mixer: null,
        actions: {},
        activeAction: null,
        config: { ...config },
        isRigged: false,
        update: (delta, isMoving = false, isRunning = false) => {
          const creature = agent.userData.creature;
          if (creature) {
            creature.walk = isMoving ? (isRunning ? 1.2 : 0.8) : 0;
            if (isMoving) creature.walkPhase += delta * 9;
            creature.update(performance.now() * 0.001, delta);
          }
        },
        applyColors: () => {}
      };
      return avatarInstance;
    }

    // Fallback: Default to fully rigged Chibi Net Kid avatar
    const look = {
      skin: config.skinColor || '#ffc7a6',
      hair: config.hairColor || '#3b2a24',
      style: config.style || 'ears',
      hoodie: config.topColor || '#8f7cf2',
      pants: config.bottomColor || '#33364d',
      kicks: config.shoeColor || '#dcd8d0',
      glow: config.glowColor || '#3ff0e0'
    };

    const root = new THREE.Group();
    let person = makePerson(look, 7);
    person.scale.setScalar(0.95);
    root.add(person);

    const avatarInstance = {
      root,
      definition: CHARACTER_CATALOG[0],
      materials: person.userData.creature?.mats || [],
      meshes: [],
      mixer: null,
      actions: {},
      activeAction: null,
      config: { ...config, ...look },
      isRigged: false,
      update: (delta, isMoving = false, isRunning = false) => {
        const creature = person.userData.creature;
        if (creature) {
          creature.walk = isMoving ? (isRunning ? 1.4 : 0.8) : 0;
          if (isMoving) creature.walkPhase += delta * (isRunning ? 14 : 9);
          creature.update(performance.now() * 0.001, delta);
        }
      },
      applyColors: (newConfig) => {
        Object.assign(avatarInstance.config, newConfig);
        const nextLook = {
          skin: avatarInstance.config.skinColor || look.skin,
          hair: avatarInstance.config.hairColor || look.hair,
          style: avatarInstance.config.style || look.style,
          hoodie: avatarInstance.config.topColor || look.hoodie,
          pants: avatarInstance.config.bottomColor || look.pants,
          kicks: avatarInstance.config.shoeColor || look.kicks,
          glow: avatarInstance.config.glowColor || look.glow
        };
        root.remove(person);
        person = makePerson(nextLook, 7);
        person.scale.setScalar(0.95);
        root.add(person);
      }
    };
    return avatarInstance;
  }

  loadGLTF(url) {
    if (this.modelCache.has(url)) {
      return Promise.resolve(this.modelCache.get(url));
    }
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          this.modelCache.set(url, gltf);
          resolve(gltf);
        },
        undefined,
        (err) => reject(err)
      );
    });
  }
}
