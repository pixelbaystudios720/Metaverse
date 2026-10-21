# 🌐 Metaverse 3D Social Hub & Mini-Games MVP

A modular, browser-based 3D multiplayer-ready social metaverse lobby and competitive mini-game ecosystem featuring a Central Plaza, 360° Skyscraper Metropolis, Coin Catcher, and Hot Potato Arena. Built in accordance with the official **Metaverse 3D Game MVP Product Requirements Document (PRD v1.0)**.

---

## 📸 Key Features & Architecture Overview

### 🏙️ 1. Living 360° Cyber Metropolis Lobby
* **Central Plaza (`0, 0, 0`)**:
  * Stepped circular white fountain featuring a glossy blue sphere with water jet pipes and 6 orbiting warm amber orbs.
  * Park benches with interactive sitting prompts (`Press E to Sit / Stand`).
  * "NetKid" carved on the plaza step.
* **360° High-Rise Skyline**:
  * Surrounding high-density skyscrapers with procedural illuminated window textures, rooftop aviation beacons, antennas, and neon signs (`METROPOLIS`, `CYBER TOWER`, `NET CAFE`, `24H NOODLES`, `KARAOKE PLAZA`, `SOLANA TOWER`).
  * Elevated cyber skybridge spanning downtown towers across the South sector.
  * Moving cyber ground traffic loop with light trails.
* **Social Park (`0, 0, 42`)**:
  * Stylized low-poly trees, flowerbeds, wooden park benches, and glowing lanterns.
* **Arcade Building Facade (`0, 0, -22`)**:
  * Towering cyber facade with neon "ARCADE" header signage.
  * Two interactive mini-game entry doorways with glowing frames:
    * **🪙 Coin Catcher Portal** (`[-6.5, -16.8]`)
    * **🔥 Hot Potato Portal** (`[6.5, -16.8]`)

---

### 🎮 2. Two Distinct Mini-Games (PRD FR-04)

#### 🪙 Game A: Coin Catcher Cyber Arena (`x: 160, z: 0`)
* **Dedicated Stadium**: Dark reflective cyber floor with yellow & cyan energy circles, neon glass perimeter walls, floodlights, and giant stadium signboard.
* **Real Minted 3D Gold Coins**: 12 thick gold coin medallions with raised rims, embossed stars (`★`), hovering spin animation, and warm floor light reflections (no box/crate pedestals).
* **Game Rules & Match Loop**:
  * **Objective**: Collect spinning coins across the arena before the 45-second timer expires.
  * **Scoring**: +10 PTS per coin collected.
  * **Rewards**: Earn +2 XP and 1.5 $TICKER per point scored.
  * **Server Validation**: Proximity pickup verified authoritatively.

#### 🔥 Game B: Hot Potato Arena / Potato Run (`x: -160, z: 0`)
* **Dedicated Basketball Stadium**: Authentic hardwood blue & red basketball court with regulation free-throw keys, 3-point lines, and center court circle.
* **Basketball Hoops**: Full 3D hoops at East and West ends with steel posts, acrylic backboards, orange rims, and nets.
* **The Flaming Potato**: Glowing 3D sphere with animated flame, smoke, and spark trails that arcs between players.
* **Bot AI Opponents**: 4 AI bots (**ZEPH**, **PIB**, **TOFU**, **LUMEN**, **WISP**) with stateful pursuit behavior when holding the potato and panic-fleeing sprint when tagged.
* **Game Rules & Match Loop**:
  * **Objective**: Run up to another player/bot within 4.0m and press `[E]` to pass the flaming potato before the 18.0s detonation timer expires.
  * **Explosion Sequence**: At 0.0s, the potato detonates into shockwaves and eliminates the carrier.
  * **Rewards**: Round survival grants +50 PTS and 100 XP (Eliminated: -25 PTS).

---

### 🎨 3. Avatar Customizer (2-Column Architecture)

* **Left Box (`CHARACTERS`)**:
  * **Active Character Showcase**: 3D archetype icon, active badge, role title, and live status beacon.
  * **Archetypes**:
    1. **Chibi Net Kid** (Hero Archetype)
    2. **Musebot Sprout** (Fluffy Mascot)
    3. **Gigachad** (Cyber Chad)
    4. **Swole Gamer** (Buff Gym Gamer)
    5. **Confusion Kid** (Derpy Streetwear Kid)
    6. **Chill Pepe** (Frogge Streetwear)
    7. **Noob** (Classic Yellow/Cyan Archetype)
* **Right Box (`OPTIONS`, Full-Depth)**:
  * 🎨 **Skin Tone Palette**: 8 selectable tones (Fair Light, Warm Peach, Golden Olive, Caramel Bronze, Deep Mocha, Rich Espresso, Cyber Neon, Pastel Coral).
  * 👕 **Streetwear Hoodie & Outfit Colors**: Cyber Lavender, Bubblegum Pink, Neon Mint, Mustard Gold, Sky Blue, Clean White, Midnight Navy, Dark Slate.
  * 👖 **Baggy Joggers / Bottoms**: 6 streetwear fabric colors.
  * 👟 **Chunky Kicks / Footwear**: 6 sneaker colorways.
  * 🎧 **LED Cyber Headphones**: Emissive cyan glowing lighting rings toggle.
  * **Reset Default** and **Save & Apply** actions.

---

### 👥 4. Living City Mascots & NPCs
* Populated with authentic **Muse Mascots** (**Sprout Mint**, **Vanilla Cream**, **Blush Pink**, **Sky Blue**, **Lemon Yellow**) with marshmallow bodies, sprout leaves, and waddling animations.
* Wandering **Chibi Streetwear Visitors** (**PixelQueen**, **NovaStar**, **BobaKid**, **ShadowX**) with oversized hoodies, cat-ear hoods, baggy joggers, and chunky sneakers.
* Upright floating name badges and proximity speech bubbles.

---

### 📱 5. Mobile & Cross-Device Responsiveness
* **Virtual Touch Controls**: On mobile/touch viewports (`< 640px`), an on-screen D-Pad appears on the bottom-left for walking (▲ ◀ ▶ ▼) and action buttons appear on the bottom-right (**⚡ ACTION** to interact/pass, **⬆ JUMP**).
* **Collapsible Mobile Chat**: Floating `💬` button expands into the chat log without blocking joystick controls.
* **Responsive Modals**: All modals (`AvatarSelectModal`, `GameEntryModal`, `ProfileModal`, `MatchResultsModal`) adapt seamlessly across phone, tablet, and desktop screens.

---

### 📋 6. PRD Compliance & Frontend Modals

| PRD Section | Feature | Implementation Details |
| :--- | :--- | :--- |
| **FR-01** | Authentication & Profile | Persistent player ID, display name editing, avatar model & skin tone selection. |
| **FR-02** | 3D World & Navigation | Central Plaza, Arcade Entrance, Social Park, and 360° Skyscraper skyline. |
| **FR-03** | Multiplayer Presence | Top-right circular radar minimap showing player and entity blips, active zone indicators. |
| **FR-04** | Mini-Games & Rules | Dedicated **Game Entry Modal** showing match duration, scoring rules, participant limit (1-4 players), authoritative room code (`#CC-XXXX` / `#HP-XXXX`), 3-2-1 countdown, and **Match Results Modal**. |
| **FR-05** | Social Interaction | Bottom-left chat feed, player follow/friend roster, mute and report actions. |
| **FR-06** | X (Twitter) Account Linking | Official OAuth 2.0 connection workflow UI with linked handle display (`@alex_runner`) and unlink toggle. |
| **FR-07** | Leaderboards & Match History | Persistent per-game leaderboard and match history drawer. |
| **FR-08** | Future Token Readiness | Configurable project branding and placeholder for future `$TICKER` balance. |

---

## 🛠️ Tech Stack

* **Frontend Framework**: React 18 / TypeScript
* **Build Tool**: Vite 6
* **3D Engine**: Three.js (r174) via `@react-three/fiber` & `@react-three/drei`
* **Physics Engine**: Rapier Physics via `@react-three/rapier`
* **Styling**: Tailwind CSS & Vanilla CSS
* **Audio Engine**: Synthesized Web Audio API sound effects (coin chime, potato pass, explosion blast, jump sfx, countdown tick)
* **Authoritative Collision Data**: Shared JSON bounding boxes in `shared/collision_data.json` & `react-app/src/collision_data.json`

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v18.0.0 or higher recommended)
* npm, yarn, or pnpm

### Installation & Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pixelbaystudios720/Metaverse.git
   cd Metaverse
   ```

2. **Navigate to the React application directory:**
   ```bash
   cd react-app
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173/` in your browser.

5. **Build for production:**
   ```bash
   npm run build
   ```

---

## 🎮 Controls Guide

### Desktop Controls
| Key | Action |
| :--- | :--- |
| **W / A / S / D** or **Arrow Keys** | Walk / Move Avatar |
| **Shift** | Sprint (Boosted Running Speed) |
| **Spacebar** | Jump |
| **E** | Interact (Enter Door / Sit on Bench / Pass Hot Potato) |
| **Left Click + Drag** | Orbit Third-Person Camera |
| **Mouse Wheel** | Zoom In / Out |
| **Esc** | Toggle Avatar Customizer |

### Mobile Controls
| Touch Element | Action |
| :--- | :--- |
| **Virtual D-Pad (Bottom-Left)** | Touch & hold ▲ ◀ ▶ ▼ to move |
| **⚡ ACTION Button (Bottom-Right)** | Interact with doors, benches, or pass the potato |
| **⬆ JUMP Button (Bottom-Right)** | Jump |
| **One-Finger Touch & Drag** | Rotate Third-Person Camera |
| **Pinch Gesture** | Zoom Camera |
| **💬 Icon (Bottom-Left)** | Toggle Chat Window |

---

## 🔌 Backend Developer Hand-off Specifications

For backend integration (Colyseus / WebSocket / Authoritative Server):

1. **Framework**: React Three Fiber (`@react-three/fiber`) on React 18 / TypeScript + Vite.
2. **Socket Client**: Compatible with `colyseus.js` (installed in `package.json`).
3. **Collision Data**: Authoritative collision boxes, interactive door trigger radiuses, and spawn coordinates are exported in:
   * [`shared/collision_data.json`](shared/collision_data.json)
   * [`react-app/src/collision_data.json`](react-app/src/collision_data.json)
4. **Target Specs**: 60 FPS on modern desktop and mobile browsers (Chrome 90+, Edge 90+, Safari 15+, Firefox 90+).
5. **Network Tick Rate**: Designed for 20–30 Hz position interpolation (`lerpFactor: 0.15`).

---

## 📄 License
Internal proprietary working document and codebase for Pixel Bay Studios.
