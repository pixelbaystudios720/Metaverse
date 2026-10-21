// ==========================================================================
// 2D UI & State Manager (Attention Agents Exact Layout)
// Features: Right "Your look" drawer, Top white & blue pills, Bottom chat bar,
// Leaderboard, Games hub modal, and CA copy button.
// ==========================================================================

import * as THREE from 'three';
import { sound } from '../engine/audio.js';

export class UIManager {
  constructor(localPlayer, onStartGame, onAbortGame) {
    this.player = localPlayer;
    this.onStartGame = onStartGame;
    this.onAbortGame = onAbortGame;

    // Load persisted character look
    this.loadPersistedLook();

    // Setup Customizer Swatches & Events
    this.setupRightDrawer();

    // Setup Global Navigation Listeners
    this.initNavigation();

    // Populate Leaderboard
    this.initLeaderboardsData();
  }

  loadPersistedLook() {
    const savedName = localStorage.getItem('aa_player_name');
    if (savedName) this.player.avatar.name = savedName;

    const savedSkin = localStorage.getItem('aa_skin_color');
    if (savedSkin) this.player.avatar.skinColor = savedSkin;

    const savedHoodie = localStorage.getItem('aa_hoodie_color');
    if (savedHoodie) this.player.avatar.hoodieColor = savedHoodie;

    const savedHair = localStorage.getItem('aa_hair_color');
    if (savedHair) this.player.avatar.hairColor = savedHair;

    const savedJoggers = localStorage.getItem('aa_joggers_color');
    if (savedJoggers) this.player.avatar.joggersColor = savedJoggers;

    const savedKicks = localStorage.getItem('aa_kicks_color');
    if (savedKicks) this.player.avatar.kicksColor = savedKicks;

    const savedX = localStorage.getItem('aa_linked_x');
    this.linkedX = savedX || null;
    this.player.avatar.xHandle = this.linkedX;

    this.player.avatar.updateCustomization({
      name: this.player.avatar.name,
      skinColor: this.player.avatar.skinColor,
      hoodieColor: this.player.avatar.hoodieColor,
      hairColor: this.player.avatar.hairColor,
      joggersColor: this.player.avatar.joggersColor,
      kicksColor: this.player.avatar.kicksColor,
      xHandle: this.linkedX,
    });
  }

  setupRightDrawer() {
    const drawer = document.getElementById('right-drawer');
    const openBtn = document.getElementById('btn-open-customizer');
    const closeBtn = document.getElementById('btn-close-drawer');
    const nameInput = document.getElementById('input-display-name');
    const doneBtn = document.getElementById('btn-save-look');
    const surpriseBtn = document.getElementById('btn-surprise-me');

    // Toggle drawer open/close
    if (openBtn && drawer) {
      openBtn.addEventListener('click', () => {
        drawer.classList.toggle('collapsed');
        sound.playClick();
      });
    }
    if (closeBtn && drawer) {
      closeBtn.addEventListener('click', () => {
        drawer.classList.add('collapsed');
        sound.playClick();
      });
    }

    if (nameInput) {
      nameInput.value = this.player.avatar.name;
      nameInput.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 16);
        nameInput.value = val;
        this.player.avatar.name = val || 'Player';
      });
    }

    // Palette Definitions (Exact Attention Agents Circles)
    const skinColors = ['#fcd5ce', '#f8c291', '#e0a96d', '#b07d56', '#7a4e32', '#4a2f1f'];
    const hairColors = ['#1a1a24', '#4a2f1f', '#d49b53', '#c05c3b', '#ff8fab', '#845ec2', '#4dd0e1'];
    const hoodieColors = ['#7d67db', '#ff8fab', '#4dd0e1', '#ffd166', '#4a90e2', '#e0e6ed', '#2c2d38'];
    const joggersColors = ['#2c2d38', '#4a5568', '#718096', '#2b4c7e', '#4a3b32', '#f0f4f8'];
    const kicksColors = ['#ffffff', '#2c2d38', '#ff8fab', '#ffd166', '#4dd0e1', '#7d67db'];

    this.renderSwatches('swatches-skin', skinColors, this.player.avatar.skinColor, (c) => {
      this.player.avatar.updateCustomization({ skinColor: c });
      localStorage.setItem('aa_skin_color', c);
    });

    this.renderSwatches('swatches-hair', hairColors, this.player.avatar.hairColor, (c) => {
      this.player.avatar.updateCustomization({ hairColor: c });
      localStorage.setItem('aa_hair_color', c);
    });

    this.renderSwatches('swatches-hoodie', hoodieColors, this.player.avatar.hoodieColor, (c) => {
      this.player.avatar.updateCustomization({ hoodieColor: c, soleColor: c });
      localStorage.setItem('aa_hoodie_color', c);
    });

    this.renderSwatches('swatches-joggers', joggersColors, this.player.avatar.joggersColor, (c) => {
      this.player.avatar.updateCustomization({ joggersColor: c });
      localStorage.setItem('aa_joggers_color', c);
    });

    this.renderSwatches('swatches-kicks', kicksColors, this.player.avatar.kicksColor, (c) => {
      this.player.avatar.updateCustomization({ kicksColor: c });
      localStorage.setItem('aa_kicks_color', c);
    });

    // Hood Segmented Pills
    document.querySelectorAll('.hood-pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.hood-pill-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        sound.playClick();
      });
    });

    // Surprise Me Button
    if (surpriseBtn) {
      surpriseBtn.addEventListener('click', () => {
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
        const newLook = {
          skinColor: pick(skinColors),
          hoodieColor: pick(hoodieColors),
          hairColor: pick(hairColors),
          joggersColor: pick(joggersColors),
          kicksColor: pick(kicksColors),
          soleColor: pick(hoodieColors),
        };
        this.player.avatar.updateCustomization(newLook);
        sound.playGem();
      });
    }

    // Done Button
    if (doneBtn) {
      doneBtn.addEventListener('click', () => {
        const nameVal = nameInput ? nameInput.value.trim() : 'Player';
        this.player.avatar.name = nameVal || 'Player';
        localStorage.setItem('aa_player_name', this.player.avatar.name);
        drawer.classList.add('collapsed');
        sound.playClick();
      });
    }
  }

  renderSwatches(containerId, colors, selectedColor, onSelect) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';

    colors.forEach((c) => {
      const btn = document.createElement('button');
      btn.className = `drawer-swatch ${c === selectedColor ? 'active' : ''}`;
      btn.style.backgroundColor = c;
      btn.addEventListener('click', () => {
        el.querySelectorAll('.drawer-swatch').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        onSelect(c);
        sound.playClick();
      });
      el.appendChild(btn);
    });
  }

  initNavigation() {
    // Copy CA Pill
    const caBtn = document.getElementById('btn-copy-ca');
    if (caBtn) {
      caBtn.addEventListener('click', () => {
        const ca = '75gGuxuqKhQQiHae8JKDQaetK3XguKf1rUJ1csispump';
        navigator.clipboard?.writeText(ca);
        caBtn.innerHTML = '<span>Copied CA!</span>';
        setTimeout(() => {
          caBtn.innerHTML = '<span>CA 75gGuxuqKhQ...</span>';
        }, 2000);
        sound.playClick();
      });
    }

    // Sound FX Toggle
    const audioBtn = document.getElementById('btn-audio-toggle');
    const audioIcon = document.getElementById('audio-icon');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const isEnabled = sound.toggle();
        audioIcon.textContent = isEnabled ? '🔊' : '🔇';
        sound.playClick();
      });
      audioIcon.textContent = sound.enabled ? '🔊' : '🔇';
    }

    // Back to the Cafe Reset Button
    const resetBtn = document.getElementById('btn-reset-pos');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.player.teleport(0, 0, 2);
        sound.playPortal();
      });
    }

    // Games Hub Modal
    const gamesBtn = document.getElementById('btn-open-games');
    const closeGamesBtn = document.getElementById('btn-close-games-modal');
    if (gamesBtn) gamesBtn.addEventListener('click', () => this.openModal('modal-games-hub'));
    if (closeGamesBtn) closeGamesBtn.addEventListener('click', () => this.closeModal('modal-games-hub'));

    const hubCoinBtn = document.getElementById('btn-hub-play-coin');
    if (hubCoinBtn) {
      hubCoinBtn.addEventListener('click', () => {
        this.closeModal('modal-games-hub');
        if (this.onStartGame) this.onStartGame('coin-catcher');
      });
    }

    const hubRunBtn = document.getElementById('btn-hub-play-run');
    if (hubRunBtn) {
      hubRunBtn.addEventListener('click', () => {
        this.closeModal('modal-games-hub');
        if (this.onStartGame) this.onStartGame('rooftop-run');
      });
    }

    // Leaderboards Modal
    const rankBtn = document.getElementById('btn-open-leaderboard');
    const closeRankBtn = document.getElementById('btn-close-leaderboard');
    if (rankBtn) rankBtn.addEventListener('click', () => this.openLeaderboardModal());
    if (closeRankBtn) closeRankBtn.addEventListener('click', () => this.closeModal('modal-leaderboards'));

    // X Linking Modal
    const xBtn = document.getElementById('btn-open-x-modal');
    const closeXBtn = document.getElementById('btn-close-x-modal');
    if (xBtn) xBtn.addEventListener('click', () => this.openModal('modal-x-link'));
    if (closeXBtn) closeXBtn.addEventListener('click', () => this.closeModal('modal-x-link'));

    const authXBtn = document.getElementById('btn-connect-x-oauth');
    const xInput = document.getElementById('input-x-handle');
    if (authXBtn && xInput) {
      authXBtn.addEventListener('click', () => {
        const h = xInput.value.replace(/[^a-zA-Z0-9_]/g, '').trim();
        if (h) {
          this.linkedX = h;
          localStorage.setItem('aa_linked_x', h);
          this.player.avatar.xHandle = h;
          this.closeModal('modal-x-link');
          sound.playGem();
        }
      });
    }

    // Active Match HUD Exit Button
    const leaveMatchBtn = document.getElementById('btn-leave-match');
    if (leaveMatchBtn) {
      leaveMatchBtn.addEventListener('click', () => {
        if (this.onAbortGame) this.onAbortGame();
        this.hideMatchHUD();
      });
    }

    // Results Modal Return Button
    const returnPlazaBtn = document.getElementById('btn-results-return');
    if (returnPlazaBtn) {
      returnPlazaBtn.addEventListener('click', () => {
        this.closeModal('modal-match-results');
        sound.playClick();
      });
    }
  }

  openLeaderboardModal() {
    this.openModal('modal-leaderboards');
    this.renderLeaderboardTable('coin-catcher');

    document.querySelectorAll('.tab-pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-pill-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderLeaderboardTable(btn.dataset.board);
        sound.playClick();
      });
    });
  }

  showResultsModal(results) {
    this.hideMatchHUD();

    const titleEl = document.getElementById('results-headline');
    const gameNameEl = document.getElementById('results-game-name');
    const scoreEl = document.getElementById('results-final-score');
    const rankEl = document.getElementById('results-rank');
    const gemsEl = document.getElementById('results-gems-count');
    const durationEl = document.getElementById('results-duration');
    const rankingsList = document.getElementById('results-rankings-list');

    titleEl.textContent = results.rank === 1 ? '🎉 Winner! First Place!' : 'Match Completed!';
    gameNameEl.textContent = results.gameName;
    scoreEl.textContent = results.score;
    rankEl.textContent = `#${results.rank} / ${results.participants.length}`;
    gemsEl.textContent = results.gems;
    durationEl.textContent = results.duration;

    rankingsList.innerHTML = '';
    results.participants.forEach((p, idx) => {
      const row = document.createElement('div');
      row.className = `mini-rank-row ${p.isPlayer ? 'highlight-self' : ''}`;
      row.innerHTML = `
        <span><strong>#${idx + 1}</strong> ${p.name} ${p.isPlayer ? '(You)' : ''}</span>
        <strong>${p.score}</strong>
      `;
      rankingsList.appendChild(row);
    });

    this.openModal('modal-match-results');
  }

  initLeaderboardsData() {
    this.coinLeaderboard = [
      { rank: 1, name: 'static_fox', score: '560 pts', matches: 62, x: 'static_fox' },
      { rank: 2, name: 'Cupsey', score: '510 pts', matches: 58, x: 'cupsey_sol' },
      { rank: 3, name: 'Duval', score: '480 pts', matches: 45, x: 'duval_x' },
      { rank: 4, name: 'Ansem', score: '440 pts', matches: 40, x: 'ansem' },
      { rank: 5, name: 'PixelVibe', score: '370 pts', matches: 28, x: null },
    ];

    this.runLeaderboard = [
      { rank: 1, name: 'static_fox', score: '24.8s', matches: 62, x: 'static_fox' },
      { rank: 2, name: 'Cupsey', score: '26.1s', matches: 58, x: 'cupsey_sol' },
      { rank: 3, name: 'Duval', score: '27.4s', matches: 45, x: 'duval_x' },
      { rank: 4, name: 'Ansem', score: '29.2s', matches: 40, x: 'ansem' },
    ];
  }

  renderLeaderboardTable(tab) {
    const tbody = document.getElementById('leaderboard-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const data = tab === 'rooftop-run' ? this.runLeaderboard : this.coinLeaderboard;
    data.forEach((row) => {
      const tr = document.createElement('tr');
      const rankCls = row.rank <= 3 ? `rank-${row.rank}` : '';
      tr.innerHTML = `
        <td><span class="rank-pill ${rankCls}">#${row.rank}</span></td>
        <td><strong>${row.name}</strong></td>
        <td><strong style="color:#6cbef2">${row.score}</strong></td>
        <td>${row.matches}</td>
        <td>${row.x ? `<span style="color:#1d9bf0">@${row.x}</span>` : '—'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  showMatchHUD(title) {
    const hud = document.getElementById('match-hud');
    const titleEl = document.getElementById('match-hud-title');
    if (hud) hud.classList.remove('hidden');
    if (titleEl) titleEl.textContent = title.toUpperCase();
  }

  hideMatchHUD() {
    const hud = document.getElementById('match-hud');
    if (hud) hud.classList.add('hidden');
  }

  updateMatchHUD(time, score) {
    const tVal = document.getElementById('match-timer-value');
    const sVal = document.getElementById('match-score-value');
    if (tVal) tVal.textContent = time;
    if (sVal) sVal.textContent = score;
  }

  setInteractionPrompt(item) {
    const prompt = document.getElementById('interaction-prompt');
    const text = document.getElementById('interaction-text');
    const mobileInteract = document.getElementById('btn-mobile-interact');

    if (item) {
      prompt.classList.remove('hidden');
      text.textContent = `PLAY ${item.title.toUpperCase()}`;
      if (mobileInteract) mobileInteract.classList.remove('hidden');

      prompt.onclick = () => {
        if (this.onStartGame) this.onStartGame(item.id);
        sound.playClick();
      };
      if (mobileInteract) {
        mobileInteract.onclick = () => {
          if (this.onStartGame) this.onStartGame(item.id);
          sound.playClick();
        };
      }
    } else {
      prompt.classList.add('hidden');
      if (mobileInteract) mobileInteract.classList.add('hidden');
    }
  }

  openModal(modalId) {
    document.querySelectorAll('.modal-backdrop').forEach((m) => m.classList.add('hidden'));
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('hidden');
    sound.playClick();
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
  }
}
