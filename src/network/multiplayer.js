// ==========================================================================
// Multiplayer Presence & In-World Social Tags (Attention Agents Exact)
// Features: Floating nametags, speech bubbles, and friendly peer simulation
// ==========================================================================

import * as THREE from 'three';
import { Avatar } from '../player/avatar.js';

export class MultiplayerManager {
  constructor(scene, localAvatar, tagsContainer) {
    this.scene = scene;
    this.localAvatar = localAvatar;
    this.tagsContainer = tagsContainer;

    this.peers = [];
    this.speechBubbles = new Map();
    this.tagElements = new Map();

    this.initSimulatedPeers();
  }

  initSimulatedPeers() {
    const peerConfigs = [
      {
        id: 'peer_1',
        name: 'static_fox',
        skinColor: '#fcd5ce',
        hoodieColor: '#7d67db',
        hairColor: '#3d2514',
        xHandle: 'static_fox',
        x: -4, z: -4,
        targetX: -2, targetZ: -2,
        moveTimer: 2,
      },
      {
        id: 'peer_2',
        name: 'Cupsey',
        skinColor: '#ffe4cc',
        hoodieColor: '#ff8fab',
        hairColor: '#1a1a24',
        xHandle: 'cupsey_sol',
        x: -8, z: 2,
        targetX: -6, targetZ: 4,
        moveTimer: 3,
      },
      {
        id: 'peer_3',
        name: 'Duval',
        skinColor: '#e0a96d',
        hoodieColor: '#4dd0e1',
        hairColor: '#c05c3b',
        xHandle: 'duval_x',
        x: 6, z: 2,
        targetX: 8, targetZ: 0,
        moveTimer: 4,
      },
      {
        id: 'peer_4',
        name: 'Ansem',
        skinColor: '#f8c291',
        hoodieColor: '#ffd166',
        hairColor: '#845ec2',
        xHandle: 'ansem',
        x: 4, z: -4,
        targetX: 2, targetZ: -6,
        moveTimer: 3.5,
      },
    ];

    peerConfigs.forEach((cfg) => {
      const avatar = new Avatar({
        name: cfg.name,
        skinColor: cfg.skinColor,
        hoodieColor: cfg.hoodieColor,
        hairColor: cfg.hairColor,
        xHandle: cfg.xHandle,
        isSelf: false,
      });

      avatar.root.position.set(cfg.x, 0, cfg.z);
      this.scene.scene.add(avatar.root);

      this.peers.push({
        id: cfg.id,
        avatar,
        config: cfg,
        targetPos: new THREE.Vector3(cfg.targetX, 0, cfg.targetZ),
        timer: cfg.moveTimer,
        isMoving: false,
      });

      this.createNametagElement(cfg.id, cfg.name, cfg.xHandle, false);
    });

    // Local player nametag
    this.createNametagElement(
      'local_player',
      this.localAvatar.name,
      this.localAvatar.xHandle,
      true
    );

    this.schedulePeerChat();
  }

  createNametagElement(entityId, name, xHandle, isSelf) {
    const tag = document.createElement('div');
    tag.className = 'floating-nametag';
    tag.id = `tag_${entityId}`;

    const pill = document.createElement('div');
    pill.className = `nametag-pill ${isSelf ? 'me' : ''}`;

    if (xHandle) {
      pill.innerHTML = `
        <svg class="tag-x-icon" viewBox="0 0 24 24">
          <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"/>
          <path fill="#fff" d="M10.5 16.6l-4.1-4.1 1.4-1.4 2.7 2.7 5.8-5.8 1.4 1.4z"/>
        </svg>
        <span>${name}</span>
      `;
    } else {
      pill.innerHTML = `<span>${name}</span>`;
    }

    tag.appendChild(pill);
    this.tagsContainer.appendChild(tag);
    this.tagElements.set(entityId, tag);
  }

  showSpeechBubble(entityId, message) {
    const existing = this.speechBubbles.get(entityId);
    if (existing) {
      clearTimeout(existing.timer);
      existing.element.remove();
      this.speechBubbles.delete(entityId);
    }

    const bubble = document.createElement('div');
    bubble.className = 'floating-speech-bubble';
    bubble.textContent = message;
    this.tagsContainer.appendChild(bubble);

    const timer = setTimeout(() => {
      bubble.remove();
      this.speechBubbles.delete(entityId);
    }, 4500);

    this.speechBubbles.set(entityId, { element: bubble, timer });
  }

  schedulePeerChat() {
    const peerMessages = [
      { id: 'peer_1', text: 'Chilling at the cafe! ☕' },
      { id: 'peer_2', text: 'Who wants to play Coin Catcher?' },
      { id: 'peer_3', text: 'Check out the new rooftop course!' },
      { id: 'peer_4', text: 'Nice kicks! Love the hoodie.' },
    ];

    let idx = 0;
    const loopChat = () => {
      setTimeout(() => {
        const item = peerMessages[idx % peerMessages.length];
        idx++;
        const peer = this.peers.find((p) => p.id === item.id);
        if (peer) {
          this.showSpeechBubble(peer.id, item.text);
        }
        loopChat();
      }, 10000 + Math.random() * 12000);
    };
    loopChat();
  }

  sendLocalChat(text) {
    if (!text || !text.trim()) return;
    this.showSpeechBubble('local_player', text.trim().slice(0, 120));
  }

  update(deltaTime, totalTime) {
    // Wander Peers
    for (const peer of this.peers) {
      peer.timer -= deltaTime;
      if (peer.timer <= 0) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 3 + Math.random() * 5;
        peer.targetPos.set(
          peer.avatar.root.position.x + Math.cos(angle) * dist,
          0,
          peer.avatar.root.position.z + Math.sin(angle) * dist
        );

        // Clamp to plaza
        if (Math.abs(peer.targetPos.x) > 16) peer.targetPos.x = Math.sign(peer.targetPos.x) * 14;
        if (Math.abs(peer.targetPos.z) > 14) peer.targetPos.z = Math.sign(peer.targetPos.z) * 12;

        peer.timer = 4 + Math.random() * 6;
      }

      const pos = peer.avatar.root.position;
      const dx = peer.targetPos.x - pos.x;
      const dz = peer.targetPos.z - pos.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.4) {
        const moveAngle = Math.atan2(dx, dz);
        peer.avatar.root.rotation.y = THREE.MathUtils.lerp(
          peer.avatar.root.rotation.y,
          moveAngle,
          deltaTime * 8
        );
        pos.x += Math.sin(moveAngle) * 3.0 * deltaTime;
        pos.z += Math.cos(moveAngle) * 3.0 * deltaTime;
        peer.isMoving = true;
      } else {
        peer.isMoving = false;
      }

      peer.avatar.animate(deltaTime, peer.isMoving, false, 0.6);
    }

    // 2D Screen Projections for Nametags & Bubbles
    this.updateElementPosition('local_player', this.localAvatar.getHeadWorldPosition());

    for (const peer of this.peers) {
      this.updateElementPosition(peer.id, peer.avatar.getHeadWorldPosition());
    }
  }

  updateElementPosition(entityId, headPos) {
    const screenPos = this.scene.toScreenPosition(headPos);
    const tagEl = this.tagElements.get(entityId);
    const bubbleObj = this.speechBubbles.get(entityId);

    if (screenPos.inFront && screenPos.x >= 0 && screenPos.x <= this.scene.width && screenPos.y >= 0 && screenPos.y <= this.scene.height) {
      if (tagEl) {
        tagEl.style.display = 'flex';
        tagEl.style.transform = `translate(${screenPos.x}px, ${screenPos.y}px)`;
      }

      if (bubbleObj && bubbleObj.element) {
        bubbleObj.element.style.display = 'block';
        bubbleObj.element.style.transform = `translate(${screenPos.x}px, ${screenPos.y - 36}px)`;
      }
    } else {
      if (tagEl) tagEl.style.display = 'none';
      if (bubbleObj && bubbleObj.element) bubbleObj.element.style.display = 'none';
    }
  }
}
