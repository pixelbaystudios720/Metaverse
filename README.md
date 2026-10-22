# 🌐 Nexora Metaverse - 3D Social Hub & Mini-Games

A modular, browser-based 3D multiplayer social metaverse lobby and competitive mini-game ecosystem featuring a Central Plaza, 360° Skyscraper Metropolis, Coin Catcher, and Hot Potato Arena.

- **Website / Brand:** **NEXORA**
- **Repository:** `https://github.com/pixelbaystudios720/Metaverse.git`
- **Main Branch:** `main`
- **Shared Collision Reference:** [`shared/collision_data.json`](shared/collision_data.json)

---

## 📸 Key Features & Architecture Overview

### 🏙️ 1. Living 360° Cyber Metropolis Lobby
* **Central Plaza (`0, 0, 0`)**:
  * Stepped circular white fountain featuring a glossy blue sphere with water jet pipes and orbiting warm amber orbs.
  * Park benches with interactive sitting prompts (`Press E to Sit / Stand`).
  * Grand rooftop cyan neon landmark sign: **NEXORA** atop the central Cyber Cafe tower.
* **360° High-Rise Skyline**:
  * Procedurally textured high-density skyscrapers with illuminated windows, rooftop aviation beacons, antennas, and neon signs (`NEXORA`, `CYBER TOWER`, `NET CAFE`, `24H NOODLES`, `KARAOKE PLAZA`).
  * Moving two-way traffic boulevard with realistic vehicle movement and physics-based wheel rotation.
* **Social Park (`0, 0, 42`)**:
  * Stylized low-poly trees, flowerbeds, wooden park benches, and glowing lanterns.
* **Arcade Building Facade (`16.0, 3.6, -18.0`)**:
  * Compact 15m cyber facade with neon "ARCADE" header signage.
  * Two interactive mini-game entry doorways with glowing frames:
    * **🪙 Coin Catcher Portal** (`[13.2, 2.1, -17.5]`)
    * **🔥 Hot Potato Portal** (`[20.3, 2.1, -14.7]`)

---

### 🎮 2. Two Distinct Mini-Games (Authoritative Server Managed)

#### 🪙 Game A: Coin Catcher Cyber Arena (`x: 160, z: 0`)
* **Dedicated Stadium**: Reflective cyber floor, neon glass perimeter walls, floodlights, and stadium signboard.
* **Match Loop & Server Rules**:
  * **Players**: 2 to 8 players.
  * **Countdown**: 5-second synchronized start.
  * **Duration**: 90 seconds.
  * **Spawns**: 1 coin every 0.8s, up to a maximum of 15 coins on the map simultaneously.
  * **Point Values**: Normal Coin = 1 point; Gold Coin (10% spawn chance) = 5 points.
  * **Pickup Detection**: 1.2m radius verified authoritatively by the server.

#### 🔥 Game B: Hot Potato Arena / Potato Run (`x: -160, z: 0`)
* **Dedicated Basketball Stadium**: Regulation hardwood court, basketball hoops, and spectator perimeter.
* **The Flaming Potato**: Glowing 3D sphere with animated flame, smoke, and spark trails that arcs between players.
* **Match Loop & Server Rules**:
  * **Players**: 4 to 10 players.
  * **Duration**: Up to 180 seconds maximum.
  * **Auto-Pass Radius**: 1.2m proximity pass; carrier passes potato to closest valid player.
  * **Tagback Cooldown**: 2.0s immunity for the passing player.
  * **Detonation Fuse**: Randomized between 10.0s and 15.0s per possession cycle.
  * **Elimination & Spectating**: Detonation eliminates the current carrier; eliminated players spectate until one survivor remains.

#### 🏆 Placement Points
* **1st Place:** 5 pts
* **2nd Place:** 3 pts
* **3rd Place:** 2 pts
* **Other participants:** 1 pt
* **Left early:** 0 pts

---

## 🔌 Authoritative Backend Hand-Off Specification

The server is authoritative over all game state (pickups, passes, timers, scores, and eliminations). The client sends player inputs and displays server updates.

### 1. Client-Server Communication Protocol
* **Server Tick Rate:** `20 Hz` (50 ms per tick).
* **Client Interpolation:** `0.15` lerp factor for smooth multi-client rendering.
* **Client Input Payload:**
  ```json
  { "seq": 1042, "moveX": 0.0, "moveZ": -1.0, "jump": false, "sprint": true }
  ```
* **Doors & Matchmaking Queue**:
  When near a portal door (radius 3.2m), client sends:
  ```json
  { "action": "interact_door", "doorId": "door_coin_catcher" }
  ```
  The server queues the player and returns room ticket/credentials.
* **In-Game Chat:** Max 140 characters. Server blocks links and wallet addresses.

---

### 2. Avatar Catalog & 0-Indexed Customization Schema

All avatar archetypes, styles, and color options are indexed starting from `0` to allow flat, memory-efficient `uint8` serialization.

| Index | Avatar ID | Name | Category | Customization Scope | Height |
|:---:|:---|:---|:---|:---|:---:|
| **0** | `chibi_netkid` | **Chibi Net Kid** | Nexora Heroes | **Full Modular (Hood, Skin, Hair, Clothes, Glow)** | 1.48 m |
| **1** | `muse_mascot` | **Musebot Sprout** | Nexora Mascots | Preset mascot (no clothes, no glowColor) | 1.45 m |
| **2** | `agent_gumdrop` | **Agent Gumdrop** | Nexora Mascots | Preset mascot (no clothes, no glowColor) | 1.35 m |
| **3** | `plush_mascot` | **Plush Fur Mascot** | Nexora Mascots | Preset mascot (no clothes, no glowColor) | 1.60 m |

#### Important Avatar Notes:
1. **Can archetypes 1 to 3 be customized?** No, only **Archetype 0 (`chibi_netkid`)** has modular clothing, hair, skin, and LED colors. Archetypes 1 to 3 are preset mascots — the server can safely default clothing/hair/skin fields to `0` for them.
2. **Is there `glowColor` for archetypes 1 to 3?** **No.** `glowColor` (`0` to `5`) exclusively controls the headphone ear-cup LED ring on **Archetype 0 (`chibi_netkid`)**. Archetypes 1 to 3 do not wear headphones and have no glowing LED elements; the server can default `glowColor` to `0` for them.
3. **Headphone LED on/off toggle:** No separate boolean toggle is needed. Headphone LED color is selected via `glowColor` (`0` to `5`).

#### Modular Options for Archetype 0 (`chibi_netkid`):
* **Hood Style (`hoodStyleIndex`: `0`–`2`):** `0: Cat Ears 🐱`, `1: Hood Up 🧥`, `2: Hood Down 💇`
* **Skin Tones (`skinToneIndex`: `0`–`7`):** `0: #ffd6ba`, `1: #ffc7a6`, `2: #eaab83`, `3: #d08f63`, `4: #ad7049`, `5: #7d5136`, `6: #38bdf8`, `7: #fb7185`
* **Hair Colors (`hairColorIndex`: `0`–`7`):** `0: #1c1917`, `1: #3b2a24`, `2: #e2b766`, `3: #c8613d`, `4: #cbd5e1`, `5: #8f7ad9`, `6: #6fd3e0`, `7: #f2a3b8`
* **Clothing Colors (`hoodieColorIndex`, `pantsColorIndex`, `shoesColorIndex`: `0`–`9`):**
  `0: #8f7cf2`, `1: #ff9ec0`, `2: #6fd6bd`, `3: #ffd36e`, `4: #7cb8ff`, `5: #e8e4dc`, `6: #33364d`, `7: #1f1e26`, `8: #6b7a45`, `9: #c9b8a0`
* **LED Glow Colors (`glowColorIndex`: `0`–`5`):**
  `0: #3ff0e0 (Cyan)`, `1: #ff4fd8 (Magenta)`, `2: #b47cff (Violet)`, `3: #7dff6a (Lime)`, `4: #ffb13b (Gold)`, `5: #ff4a5e (Red)`

---

### 3. Movement Physics & Collision Model
* **Standard Walk Velocity:** `4.5 m/s`
* **Sprint Speed Multiplier:** `1.45x` (`6.525 m/s`)
* **Stamina:** Disabled for MVP (`staminaEnabled: false`).
* **Flat 2D Footprint Collision:**
  * Jump is **cosmetic only**.
  * Players **cannot** clear or stand on raised objects, benches, or fountains.
  * Every item marked with `"kind": "blocker"` stops 2D horizontal motion completely.
* **Collision Data File:** [`shared/collision_data.json`](shared/collision_data.json)
  * Every bounding box/cylinder/sphere includes the mandatory `"kind": "floor"` or `"kind": "blocker"` field.
  * All plaza, park, and pond benches are marked as blocker boxes.
  * Dedicated floors and perimeter walls for arenas at $x = 160$ and $x = -160$.
  * Spawns are positioned inside open floor space away from blockers.

---

## 🛠️ Tech Stack & Local Setup

* **Frontend Framework**: Vanilla JS & Three.js / React 18 & TypeScript
* **Build Tool**: Vite
* **3D Engine**: Three.js
* **Collision / Physics**: Flat 2D Authoritative Server Footprint + Client Rapier

### Installation & Run

```bash
git clone https://github.com/pixelbaystudios720/Metaverse.git
cd Metaverse
npm install
npm run dev
```

Open `http://localhost:5173/` in your browser.

---

## 🎮 Controls Guide

### Desktop Controls
| Key | Action |
| :--- | :--- |
| **W / A / S / D** or **Arrow Keys** | Walk / Move Avatar |
| **Shift** | Sprint (1.45x Multiplier) |
| **Spacebar** | Jump (Cosmetic) |
| **E** | Interact (Enter Door / Sit on Bench) |
| **Left Click + Drag** | Orbit Third-Person Camera |
| **Mouse Wheel** | Zoom In / Out |
| **R** | Reset Camera View |
| **Esc** | Toggle Avatar Customizer |

### Mobile Controls
| Touch Element | Action |
| :--- | :--- |
| **Virtual Stick / D-Pad** | Touch & drag to walk |
| **A / ACTION Button** | Interact with doors, agents, benches |
| **JUMP Button** | Jump |
| **Touch Drag** | Rotate Third-Person Camera |
| **Pinch Gesture** | Zoom Camera |
