// ==========================================================================
// Player Third-Person Movement Controller & Physics
// Keyboard (WASD/Arrows), Space (Jump), Shift (Sprint), & Mobile Joystick
// ==========================================================================

import * as THREE from 'three';
import { sound } from '../engine/audio.js';

export class PlayerController {
  constructor(avatar, camera) {
    this.avatar = avatar;
    this.camera = camera;

    // Physics & State
    this.position = this.avatar.root.position;
    this.velocity = new THREE.Vector3();
    this.moveDirection = new THREE.Vector3();
    this.isGrounded = true;
    this.jumpForce = 8.8;
    this.gravity = -24.0;
    this.walkSpeed = 7.0;
    this.sprintSpeed = 11.5;

    // Movement input state
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false,
    };

    // Mobile joystick vector (-1 to 1)
    this.joystickVector = { x: 0, y: 0 };

    // Setup input listeners
    this.setupKeyboard();
    this.setupMobileControls();
  }

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Ignore key events when typing inside input forms (e.g., chat, modals)
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
      }

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.sprint = true;
          break;
        case 'Space':
          if (this.isGrounded) {
            this.jump();
          }
          e.preventDefault();
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.sprint = false;
          break;
      }
    });
  }

  setupMobileControls() {
    const zone = document.getElementById('joystick-zone');
    const knob = document.getElementById('joystick-knob');
    const jumpBtn = document.getElementById('btn-mobile-jump');

    if (!zone || !knob) return;

    let touchId = null;
    let startX = 0;
    let startY = 0;
    const maxRadius = 42;

    const onTouchStart = (e) => {
      if (touchId !== null) return;
      const touch = e.changedTouches[0];
      touchId = touch.identifier;
      const rect = zone.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
      updateKnob(touch.clientX, touch.clientY);
    };

    const onTouchMove = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) {
          updateKnob(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
          break;
        }
      }
    };

    const onTouchEnd = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) {
          touchId = null;
          this.joystickVector.x = 0;
          this.joystickVector.y = 0;
          knob.style.transform = 'translate(0px, 0px)';
          break;
        }
      }
    };

    const updateKnob = (clientX, clientY) => {
      const dx = clientX - startX;
      const dy = clientY - startY;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const clampedDist = Math.min(dist, maxRadius);

      const knobX = clampedDist * Math.cos(angle);
      const knobY = clampedDist * Math.sin(angle);

      knob.style.transform = `translate(${knobX}px, ${knobY}px)`;

      // Normalize to -1 to 1
      this.joystickVector.x = knobX / maxRadius;
      this.joystickVector.y = -knobY / maxRadius; // inverted screen Y
    };

    zone.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });

    if (jumpBtn) {
      jumpBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.jump();
      });
    }
  }

  jump() {
    if (this.isGrounded) {
      this.velocity.y = this.jumpForce;
      this.isGrounded = false;
      sound.playJump();
    }
  }

  update(deltaTime) {
    // 1. Calculate input axes
    let inputX = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0) + this.joystickVector.x;
    let inputZ = (this.keys.forward ? 1 : 0) - (this.keys.backward ? 1 : 0) + this.joystickVector.y;

    const inputLength = Math.hypot(inputX, inputZ);
    const hasInput = inputLength > 0.05;

    let targetSpeed = this.keys.sprint ? this.sprintSpeed : this.walkSpeed;

    if (hasInput) {
      // Normalize input
      inputX /= Math.max(1, inputLength);
      inputZ /= Math.max(1, inputLength);

      // Camera relative direction
      const cameraAngle = Math.atan2(
        this.camera.position.x - this.position.x,
        this.camera.position.z - this.position.z
      );

      const moveAngle = Math.atan2(inputX, inputZ) + cameraAngle + Math.PI;

      this.moveDirection.set(
        Math.sin(moveAngle),
        0,
        Math.cos(moveAngle)
      );

      // Rotate avatar smoothly towards move direction
      const targetRotation = moveAngle;
      let rotDiff = targetRotation - this.avatar.root.rotation.y;
      while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      this.avatar.root.rotation.y += rotDiff * Math.min(1, deltaTime * 14);

      // Apply horizontal speed
      const actualSpeed = targetSpeed * Math.min(1, inputLength);
      this.velocity.x = this.moveDirection.x * actualSpeed;
      this.velocity.z = this.moveDirection.z * actualSpeed;

      // Footstep sound when running on ground
      if (this.isGrounded) {
        sound.playStep();
      }
    } else {
      // Dampen horizontal velocity
      this.velocity.x *= 0.7;
      this.velocity.z *= 0.7;
      if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
      if (Math.abs(this.velocity.z) < 0.01) this.velocity.z = 0;
    }

    // 2. Vertical Gravity & Ground Collision
    this.velocity.y += this.gravity * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    // Basic ground plane (y = 0)
    if (this.position.y <= 0) {
      this.position.y = 0;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // Apply horizontal motion
    this.position.x += this.velocity.x * deltaTime;
    this.position.z += this.velocity.z * deltaTime;

    // 3. World Boundary Clamping (keep within world limits)
    const worldRadius = 60;
    const currentDist = Math.hypot(this.position.x, this.position.z);
    if (currentDist > worldRadius) {
      const angle = Math.atan2(this.position.z, this.position.x);
      this.position.x = Math.cos(angle) * worldRadius;
      this.position.z = Math.sin(angle) * worldRadius;
    }

    // 4. Animate Avatar
    const speedRatio = hasInput ? (this.keys.sprint ? 1.4 : 1.0) : 0;
    this.avatar.animate(deltaTime, hasInput, !this.isGrounded, speedRatio);
  }

  teleport(x, y, z) {
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
  }
}
