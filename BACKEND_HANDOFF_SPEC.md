# Nexora Metaverse - Backend Authoritative Hand-Off Specification

> **For Backend Developer Integration (Colyseus & Authority Server)**  
> **Repository:** `https://github.com/pixelbaystudios720/Metaverse.git`  
> **Branch:** `main`  
> **File Reference:** `shared/collision_data.json`

---

## 1. Avatar Catalog & Options (0-Indexed Schema)

All avatar archetypes, styles, and color options are indexed starting from `0` to allow flat, memory-efficient `uint8` serialization in Colyseus schema state.

### Primary Avatars (Archetype Index: `0` to `3`)
| Index | Avatar ID | Name | Category | Gender / Tag | Target Height |
|:---:|:---|:---|:---|:---|:---:|
| **0** | `chibi_netkid` | **Chibi Net Kid** | Nexora Heroes | Hero Chibi | 1.48 m |
| **1** | `muse_mascot` | **Musebot Sprout** | Nexora Mascots | Fluffy Mascot | 1.45 m |
| **2** | `agent_gumdrop` | **Agent Gumdrop** | Nexora Mascots | Candy Agent | 1.35 m |
| **3** | `plush_mascot` | **Plush Fur Mascot** | Nexora Mascots | Fluffy Plush | 1.60 m |

> *Note: Static unrigged scans (`man.glb`, `woman.glb`, `child.glb`) have been fully retired to prevent T-pose glitches and mesh collisions.*

---

### Customization Options for Chibi Net Kid (`0`)

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

- **Sprint Speed Multiplier:** `1.45x`
- **Standard Walk Velocity:** `4.5 m/s` (or `7.0 m/s` in high-velocity outdoor areas)
- **Standard Sprint Velocity:** `6.525 m/s` (`4.5 * 1.45`)
- **Jump Impulse:** `8.8 m/s`
- **Gravity:** `-24.0 m/s²`
- **Server Tick Rate:** `20 Hz` (50ms per tick)
- **Client Interpolation (Lerp Factor):** `0.15`
- **Client Input Payload:** `{ seq: number, moveX: number, moveZ: number, jump: boolean, sprint: boolean }`

---

## 3. Authoritative Collision & Arena Data (`collision_data.json`)

The authoritative file is committed in the repository at:  
👉 [`shared/collision_data.json`](file:///e:/Game/shared/collision_data.json)  
GitHub URL: `https://github.com/pixelbaystudios720/Metaverse/blob/main/shared/collision_data.json`

### Full Raw JSON Content:
```json
{
  "version": "1.1.0",
  "mapName": "AttentionAgentsPlazaAndArenas",
  "coordinateSystem": "Y-up, right-handed",
  "authoritativeServerTickRateHz": 20,
  "clientInterpolationLerpFactor": 0.15,
  "sprintSpeedMultiplier": 1.45,
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
      "position": { "x": -6.5, "y": 2.8, "z": -16.8 },
      "size": { "w": 4.6, "h": 5.6, "d": 0.6 },
      "triggerRadius": 3.5,
      "teleportTarget": { "x": 160, "y": 1.5, "z": 0 },
      "gameId": "coin_catcher",
      "minPlayers": 2,
      "maxPlayers": 8,
      "matchDurationSeconds": 90
    },
    {
      "id": "door_hot_potato",
      "name": "Hot Potato Portal",
      "position": { "x": 6.5, "y": 2.8, "z": -16.8 },
      "size": { "w": 4.6, "h": 5.6, "d": 0.6 },
      "triggerRadius": 3.5,
      "teleportTarget": { "x": -160, "y": 1.5, "z": 0 },
      "gameId": "hot_potato",
      "minPlayers": 4,
      "maxPlayers": 10,
      "matchDurationSeconds": 180
    }
  ],
  "collisionBoxes": [
    {
      "id": "ground_plane",
      "type": "box",
      "pos": [0, -0.2, 0],
      "size": [260, 0.4, 260]
    },
    {
      "id": "arcade_building_facade",
      "type": "box",
      "pos": [0, 5.8, -20.0],
      "size": [32.0, 11.6, 6.0]
    },
    {
      "id": "arcade_roof_overhang",
      "type": "box",
      "pos": [0, 11.6, -19.8],
      "size": [32.5, 0.6, 6.5]
    },
    {
      "id": "arcade_door_left_frame",
      "type": "box",
      "pos": [-6.5, 2.8, -16.8],
      "size": [4.6, 5.6, 0.6]
    },
    {
      "id": "arcade_door_right_frame",
      "type": "box",
      "pos": [6.5, 2.8, -16.8],
      "size": [4.6, 5.6, 0.6]
    },
    {
      "id": "fountain_tier1_basin",
      "type": "cylinder",
      "pos": [0, 0.35, 0],
      "radius": 5.4,
      "height": 0.7
    },
    {
      "id": "fountain_tier2_step",
      "type": "cylinder",
      "pos": [0, 0.8, 0],
      "radius": 3.8,
      "height": 0.5
    },
    {
      "id": "fountain_blue_sphere",
      "type": "sphere",
      "pos": [0, 2.65, 0],
      "radius": 1.15
    },
    {
      "id": "bench_left_plaza",
      "type": "box",
      "pos": [-6.8, 0.45, 4.2],
      "size": [2.5, 0.9, 0.6]
    },
    {
      "id": "bench_right_plaza",
      "type": "box",
      "pos": [6.2, 0.45, 4.2],
      "size": [2.5, 0.9, 0.6]
    },
    {
      "id": "potato_court_boundary_north",
      "type": "box",
      "pos": [-42, 2.5, 14],
      "size": [30, 5.0, 0.8]
    },
    {
      "id": "potato_court_boundary_south",
      "type": "box",
      "pos": [-42, 2.5, 30],
      "size": [30, 5.0, 0.8]
    },
    {
      "id": "potato_court_boundary_west",
      "type": "box",
      "pos": [-57, 2.5, 22],
      "size": [0.8, 5.0, 16]
    },
    {
      "id": "potato_court_boundary_east",
      "type": "box",
      "pos": [-27, 2.5, 22],
      "size": [0.8, 5.0, 16]
    },
    {
      "id": "coin_arena_boundary_north",
      "type": "box",
      "pos": [-42, 2.5, -28],
      "size": [24, 5.0, 0.8]
    },
    {
      "id": "coin_arena_boundary_south",
      "type": "box",
      "pos": [-42, 2.5, -12],
      "size": [24, 5.0, 0.8]
    },
    {
      "id": "coin_arena_boundary_west",
      "type": "box",
      "pos": [-54, 2.5, -20],
      "size": [0.8, 5.0, 16]
    },
    {
      "id": "coin_arena_boundary_east",
      "type": "box",
      "pos": [-30, 2.5, -20],
      "size": [0.8, 5.0, 16]
    }
  ]
}
```

---

## 4. Repository Access & Clone Instructions

- **GitHub Repository:** `https://github.com/pixelbaystudios720/Metaverse.git`
- **Clone Command:**
  ```bash
  git clone https://github.com/pixelbaystudios720/Metaverse.git
  cd Metaverse
  ```
- **Shared Folder for Server & Client:**  
  `Metaverse/shared/collision_data.json` can be imported or read directly via `fs.readFileSync` or Colyseus module imports.
