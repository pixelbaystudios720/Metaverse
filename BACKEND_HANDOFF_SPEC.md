# Nexora Metaverse - Backend Authoritative Hand-Off Specification

> **For Backend Developer Integration (Colyseus & Authority Server)**  
> **Repository:** `https://github.com/pixelbaystudios720/Metaverse.git`  
> **Branch:** `main`  
> **File Reference:** `shared/collision_data.json`  
> **Specification Version:** `1.3.0`

---

## 1. Avatar Catalog & Options (0-Indexed Schema)

All avatar archetypes, styles, and color options are indexed starting from `0` to allow flat, memory-efficient `uint8` serialization in Colyseus schema state.

### Primary Avatars (Archetype Index: `0` to `3`)
| Index | Avatar ID | Name | Category | Gender / Tag | Customization Scope | Target Height |
|:---:|:---|:---|:---|:---|:---|:---:|
| **0** | `chibi_netkid` | **Chibi Net Kid** | Nexora Heroes | Hero Chibi | **Full Modular (Hood, Skin, Hair, Clothes, Glow)** | 1.48 m |
| **1** | `muse_mascot` | **Musebot Sprout** | Nexora Mascots | Fluffy Mascot | Preset mascot (glow only, clothes ignored) | 1.45 m |
| **2** | `agent_gumdrop` | **Agent Gumdrop** | Nexora Mascots | Candy Agent | Preset mascot (glow only, clothes ignored) | 1.35 m |
| **3** | `plush_mascot` | **Plush Fur Mascot** | Nexora Mascots | Fluffy Plush | Preset mascot (glow only, clothes ignored) | 1.60 m |

> *Answers to Avatar Customization Questions:*
> 1. **Can archetypes 1 to 3 be customized?** No, only **Archetype 0 (`chibi_netkid`)** has modular clothing, hair, and skin. Archetypes 1 to 3 are preset mascots — the server can safely default clothing/hair/skin fields to `0` for them.
> 2. **Is headphone LED on/off toggle still in the game?** No separate boolean toggle is needed. Headphone LED color is controlled by `glowColor` (`0` to `5`).

---

### Modular Customization Options for Chibi Net Kid (`0`)

#### A. Hood Style (`hoodStyleIndex`: `0` to `2`)
| Index | Style ID | Name | Icon | Description |
|:---:|:---|:---|:---:|:---|
| **0** | `ears` | Cat Hood | 🐱 | Cute Cat Ears on Hood |
| **1** | `hood` | Hood Up | 🧥 | Soft Round Hood Framing Face |
| **2** | `down` | Hood Down | 💇 | Swept Anime Hair & Headphones |

#### B. Skin Tones (`skinToneIndex`: `0` to `7`)
| Index | Name | Hex Color |
|:---:|:---|:---:|
| **0** | Fair Light | `#ffd6ba` |
| **1** | Warm Peach | `#ffc7a6` |
| **2** | Golden Olive | `#eaab83` |
| **3** | Caramel Bronze | `#d08f63` |
| **4** | Deep Mocha | `#ad7049` |
| **5** | Rich Espresso | `#7d5136` |
| **6** | Cyber Neon | `#38bdf8` |
| **7** | Vibrant Coral | `#fb7185` |

#### C. Hair Colors (`hairColorIndex`: `0` to `7`)
| Index | Name | Hex Color |
|:---:|:---|:---:|
| **0** | Natural Black | `#1c1917` |
| **1** | Dark Chestnut | `#3b2a24` |
| **2** | Golden Blonde | `#e2b766` |
| **3** | Auburn Copper | `#c8613d` |
| **4** | Silver Platinum | `#cbd5e1` |
| **5** | Cyber Violet | `#8f7ad9` |
| **6** | Pastel Cyan | `#6fd3e0` |
| **7** | Sakura Pink | `#f2a3b8` |

#### D. Clothing Colors (`hoodieColorIndex`, `pantsColorIndex`, `shoesColorIndex`: `0` to `9`)
| Index | Name | Hex Color |
|:---:|:---|:---:|
| **0** | Cyber Lavender | `#8f7cf2` |
| **1** | Bubblegum Pink | `#ff9ec0` |
| **2** | Neon Mint | `#6fd6bd` |
| **3** | Mustard Gold | `#ffd36e` |
| **4** | Sky Blue | `#7cb8ff` |
| **5** | Clean White | `#e8e4dc` |
| **6** | Midnight Navy | `#33364d` |
| **7** | Dark Slate | `#1f1e26` |
| **8** | Sage Olive | `#6b7a45` |
| **9** | Warm Cream | `#c9b8a0` |

#### E. LED Glow Colors (`glowColorIndex`: `0` to `5`)
| Index | Name | Hex Color |
|:---:|:---|:---:|
| **0** | Cyber Cyan | `#3ff0e0` |
| **1** | Hot Magenta | `#ff4fd8` |
| **2** | Neon Violet | `#b47cff` |
| **3** | Electric Lime | `#7dff6a` |
| **4** | Amber Gold | `#ffb13b` |
| **5** | Laser Red | `#ff4a5e` |

---

## 2. Sprint Speed Multiplier & Movement Physics

- **Standard Walk Velocity:** `4.5 m/s`
- **Sprint Speed Multiplier:** `1.45x`
- **Standard Sprint Velocity:** `6.525 m/s` (`4.5 × 1.45`)
- **Stamina System:** **Dropped for MVP** (`staminaEnabled: false`)
- **Collision Model:** **Flat 2D Infinite-Height Footprint Collision**
  - Jump is **purely visual/cosmetic**.
  - Players **cannot** clear or stand on raised objects, fountains, or benches.
  - Every object marked with `"kind": "blocker"` stops 2D horizontal motion completely.
- **Authoritative Server Tick Rate:** `20 Hz` (50 ms per tick)
- **Client Interpolation (Lerp Factor):** `0.15`
- **Client Input Payload:** `{ seq: number, moveX: number, moveZ: number, jump: boolean, sprint: boolean }`

---

## 3. Authoritative Collision & Arena Data (`shared/collision_data.json`)

👉 File Location: [`shared/collision_data.json`](file:///e:/Game/shared/collision_data.json)  
👉 GitHub URL: `https://github.com/pixelbaystudios720/Metaverse/blob/main/shared/collision_data.json`

### Key Enhancements in Version 1.3.0:
1. **Explicit `kind: "floor"` vs `kind: "blocker"`:** Floors will never block player walking; blockers are 2D infinite-height obstacles.
2. **Safe Spawns with Obstacle Clearance:** All arena and plaza spawns are verified to sit inside open floor space.
3. **Grand Arcade Complex Bounds:** Scaled up from 22m to 38m facade width to comfortably host large multiplayer lobbies.
4. **All Benches Indexed:** Plaza NW/NE/SW/SE, Pond bench, and Social Park benches marked as blockers.

### Full Raw JSON Content:
```json
{
  "version": "1.3.0",
  "mapName": "NexoraPlazaAndArenas",
  "coordinateSystem": "Y-up, right-handed",
  "authoritativeServerTickRateHz": 20,
  "clientInterpolationLerpFactor": 0.15,
  "walkSpeed": 4.5,
  "sprintSpeedMultiplier": 1.45,
  "sprintSpeed": 6.525,
  "staminaEnabled": false,
  "jumpCosmeticOnly": true,
  "collisionMode": "2d_infinite_height_footprint",
  "chatMaxCharacters": 140,
  "gameRules": {
    "coinCatcher": {
      "minPlayers": 2,
      "maxPlayers": 8,
      "countdownSeconds": 5,
      "matchDurationSeconds": 90,
      "coinSpawnIntervalSeconds": 0.8,
      "maxCoinsOnMap": 15,
      "normalCoinPoints": 1,
      "goldCoinPoints": 5,
      "goldCoinProbability": 0.10,
      "pickupRadiusMeters": 1.2
    },
    "hotPotato": {
      "minPlayers": 4,
      "maxPlayers": 10,
      "maxMatchDurationSeconds": 180,
      "autoPassRadiusMeters": 1.2,
      "tagbackCooldownSeconds": 2.0,
      "fuseMinSeconds": 10,
      "fuseMaxSeconds": 15,
      "eliminatedSpectate": true
    },
    "placementPoints": {
      "first": 5,
      "second": 3,
      "third": 2,
      "other": 1,
      "leftEarly": 0
    }
  },
  "spawns": {
    "defaultPlaza": { "x": 0, "y": 1.5, "z": 7.8, "rotY": 3.14159 },
    "arcadeEntrance": { "x": 0, "y": 1.5, "z": -12, "rotY": 3.14159 },
    "coinCatcherArena": { "x": 160, "y": 1.5, "z": 0, "rotY": 0 },
    "hotPotatoCourt": { "x": -160, "y": 1.5, "z": 0, "rotY": 0 },
    "socialPark": { "x": 0, "y": 1.5, "z": 42, "rotY": 0 }
  },
  "interactiveDoors": [
    {
      "id": "door_coin_catcher",
      "name": "Coin Catcher Portal",
      "position": { "x": -9.0, "y": 2.8, "z": -16.8 },
      "size": { "w": 4.8, "h": 5.6, "d": 0.6 },
      "triggerRadius": 4.5,
      "teleportTarget": { "x": 160, "y": 1.5, "z": 0 },
      "gameId": "coin_catcher",
      "minPlayers": 2,
      "maxPlayers": 8,
      "matchDurationSeconds": 90
    },
    {
      "id": "door_hot_potato",
      "name": "Hot Potato Portal",
      "position": { "x": 9.0, "y": 2.8, "z": -16.8 },
      "size": { "w": 4.8, "h": 5.6, "d": 0.6 },
      "triggerRadius": 4.5,
      "teleportTarget": { "x": -160, "y": 1.5, "z": 0 },
      "gameId": "hot_potato",
      "minPlayers": 4,
      "maxPlayers": 10,
      "matchDurationSeconds": 180
    }
  ],
  "collisionBoxes": [
    {
      "id": "ground_plane_plaza",
      "kind": "floor",
      "type": "box",
      "pos": [0, -0.2, 0],
      "size": [260, 0.4, 260],
      "desc": "Main plaza, boulevard, and park ground surface"
    },
    {
      "id": "coin_arena_floor",
      "kind": "floor",
      "type": "box",
      "pos": [160, -0.2, 0],
      "size": [40, 0.4, 30],
      "desc": "Dedicated ground floor for Coin Catcher Arena at x=160"
    },
    {
      "id": "potato_court_floor",
      "kind": "floor",
      "type": "box",
      "pos": [-160, -0.2, 0],
      "size": [40, 0.4, 30],
      "desc": "Dedicated ground floor for Hot Potato Court at x=-160"
    },
    {
      "id": "arcade_building_facade",
      "kind": "blocker",
      "type": "box",
      "pos": [0, 6.25, -20.0],
      "size": [38.0, 12.5, 8.0],
      "desc": "Grand Cyber Arcade Complex main facade"
    },
    {
      "id": "arcade_roof_overhang",
      "kind": "blocker",
      "type": "box",
      "pos": [0, 12.5, -19.8],
      "size": [39.0, 0.8, 8.5]
    },
    {
      "id": "arcade_door_left_frame",
      "kind": "blocker",
      "type": "box",
      "pos": [-9.0, 2.8, -16.8],
      "size": [4.8, 5.6, 0.6]
    },
    {
      "id": "arcade_door_right_frame",
      "kind": "blocker",
      "type": "box",
      "pos": [9.0, 2.8, -16.8],
      "size": [4.8, 5.6, 0.6]
    },
    {
      "id": "fountain_tier1_basin",
      "kind": "blocker",
      "type": "cylinder",
      "pos": [0, 0.35, 0],
      "radius": 5.4,
      "height": 0.7
    },
    {
      "id": "fountain_tier2_step",
      "kind": "blocker",
      "type": "cylinder",
      "pos": [0, 0.8, 0],
      "radius": 3.8,
      "height": 0.5
    },
    {
      "id": "fountain_blue_sphere",
      "kind": "blocker",
      "type": "sphere",
      "pos": [0, 2.65, 0],
      "radius": 1.15
    },
    {
      "id": "bench_plaza_northwest",
      "kind": "blocker",
      "type": "box",
      "pos": [-5.5, 0.45, -4.5],
      "size": [0.9, 0.9, 2.5]
    },
    {
      "id": "bench_plaza_northeast",
      "kind": "blocker",
      "type": "box",
      "pos": [5.5, 0.45, -4.5],
      "size": [0.9, 0.9, 2.5]
    },
    {
      "id": "bench_plaza_southwest",
      "kind": "blocker",
      "type": "box",
      "pos": [-6.5, 0.45, 6.5],
      "size": [2.2, 0.9, 2.2]
    },
    {
      "id": "bench_plaza_southeast",
      "kind": "blocker",
      "type": "box",
      "pos": [6.5, 0.45, 6.5],
      "size": [2.2, 0.9, 2.2]
    },
    {
      "id": "bench_park_pond",
      "kind": "blocker",
      "type": "box",
      "pos": [-25, 0.45, 8.2],
      "size": [2.5, 0.9, 0.9]
    },
    {
      "id": "bench_social_park_west",
      "kind": "blocker",
      "type": "box",
      "pos": [-8.0, 0.45, 42.0],
      "size": [2.5, 0.9, 0.9]
    },
    {
      "id": "bench_social_park_east",
      "kind": "blocker",
      "type": "box",
      "pos": [8.0, 0.45, 42.0],
      "size": [2.5, 0.9, 0.9]
    },
    {
      "id": "coin_arena_boundary_north",
      "kind": "blocker",
      "type": "box",
      "pos": [160, 2.5, -8.0],
      "size": [24.0, 5.0, 0.8]
    },
    {
      "id": "coin_arena_boundary_south",
      "kind": "blocker",
      "type": "box",
      "pos": [160, 2.5, 8.0],
      "size": [24.0, 5.0, 0.8]
    },
    {
      "id": "coin_arena_boundary_west",
      "kind": "blocker",
      "type": "box",
      "pos": [148.0, 2.5, 0],
      "size": [0.8, 5.0, 16.0]
    },
    {
      "id": "coin_arena_boundary_east",
      "kind": "blocker",
      "type": "box",
      "pos": [172.0, 2.5, 0],
      "size": [0.8, 5.0, 16.0]
    },
    {
      "id": "potato_court_boundary_north",
      "kind": "blocker",
      "type": "box",
      "pos": [-160, 2.5, -8.0],
      "size": [30.0, 5.0, 0.8]
    },
    {
      "id": "potato_court_boundary_south",
      "kind": "blocker",
      "type": "box",
      "pos": [-160, 2.5, 8.0],
      "size": [30.0, 5.0, 0.8]
    },
    {
      "id": "potato_court_boundary_west",
      "kind": "blocker",
      "type": "box",
      "pos": [-175.0, 2.5, 0],
      "size": [0.8, 5.0, 16.0]
    },
    {
      "id": "potato_court_boundary_east",
      "kind": "blocker",
      "type": "box",
      "pos": [-145.0, 2.5, 0],
      "size": [0.8, 5.0, 16.0]
    }
  ]
}
```

---

## 4. Doors & Matchmaking Queue Integration
1. The server retains authoritative control over room entry and matchmaking queues.
2. When the player presses **E** (or taps the interact button on mobile) within 4.5 m of a portal door, the client sends:
   ```json
   { "action": "interact_door", "doorId": "door_coin_catcher" }
   ```
3. The server places the player in the queue. When the countdown completes or the room is ready, the server responds with room join credentials.
4. The client plays the visual warp/portal animation upon receiving confirmation from the server.

---

## 5. Repository Access & Clone Instructions

- **GitHub Repository:** `https://github.com/pixelbaystudios720/Metaverse.git`
- **Clone Command:**
  ```bash
  git clone https://github.com/pixelbaystudios720/Metaverse.git
  cd Metaverse
  ```
- **Shared Collision Data File:**  
  Copy or directly read `Metaverse/shared/collision_data.json` into your server's `shared/` directory. Whenever this file is updated, changes are versioned and synced here.
