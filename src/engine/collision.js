// ============================================================================
// Nexora Metaverse - Global Continuous Collision & Move-And-Slide Physics Solver
// High-performance, zero-tunneling 2D infinite-height footprint collision system
// ============================================================================

export class GlobalCollisionSystem {
  constructor() {
    this.boxes = [];     // Array of { id, x0, z0, x1, z1, isBlocker: true, desc }
    this.circles = [];   // Array of { id, x, z, r, isBlocker: true, desc }
    this.mapBounds = { minX: -94, maxX: 94, minZ: -94, maxZ: 94 };
    this.spatialGrid = new Map(); // Spatial hash grid for O(1) broadphase lookup
    this.cellSize = 12; // 12-meter grid cells
  }

  clear() {
    this.boxes.length = 0;
    this.circles.length = 0;
    this.spatialGrid.clear();
  }

  // Register an axis-aligned box obstacle: center (cx, cz), dimensions (w, d)
  addBox(id, cx, cz, w, d, desc = '') {
    const hw = Math.abs(w) / 2;
    const hd = Math.abs(d) / 2;
    const box = {
      id,
      x0: cx - hw,
      z0: cz - hd,
      x1: cx + hw,
      z1: cz + hd,
      cx,
      cz,
      hw,
      hd,
      desc
    };
    this.boxes.push(box);
    this._insertSpatialBox(box);
    return box;
  }

  // Register a circular / cylindrical obstacle: center (cx, cz), radius r
  addCircle(id, cx, cz, r, desc = '') {
    const circle = { id, x: cx, z: cz, r: Math.abs(r), desc };
    this.circles.push(circle);
    this._insertSpatialCircle(circle);
    return circle;
  }

  // Spatial hash helpers for high-performance localized queries
  _gridKey(gx, gz) {
    return `${gx}:${gz}`;
  }

  _insertSpatialBox(box) {
    const minGX = Math.floor(box.x0 / this.cellSize);
    const maxGX = Math.floor(box.x1 / this.cellSize);
    const minGZ = Math.floor(box.z0 / this.cellSize);
    const maxGZ = Math.floor(box.z1 / this.cellSize);

    for (let gx = minGX; gx <= maxGX; gx++) {
      for (let gz = minGZ; gz <= maxGZ; gz++) {
        const key = this._gridKey(gx, gz);
        if (!this.spatialGrid.has(key)) this.spatialGrid.set(key, { boxes: [], circles: [] });
        this.spatialGrid.get(key).boxes.push(box);
      }
    }
  }

  _insertSpatialCircle(circle) {
    const minGX = Math.floor((circle.x - circle.r) / this.cellSize);
    const maxGX = Math.floor((circle.x + circle.r) / this.cellSize);
    const minGZ = Math.floor((circle.z - circle.r) / this.cellSize);
    const maxGZ = Math.floor((circle.z + circle.r) / this.cellSize);

    for (let gx = minGX; gx <= maxGX; gx++) {
      for (let gz = minGZ; gz <= maxGZ; gz++) {
        const key = this._gridKey(gx, gz);
        if (!this.spatialGrid.has(key)) this.spatialGrid.set(key, { boxes: [], circles: [] });
        this.spatialGrid.get(key).circles.push(circle);
      }
    }
  }

  // Retrieve nearby candidates around a position
  getNearby(x, z, radius = 2) {
    const gx = Math.floor(x / this.cellSize);
    const gz = Math.floor(z / this.cellSize);
    const result = { boxes: new Set(), circles: new Set() };

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const cell = this.spatialGrid.get(this._gridKey(gx + dx, gz + dz));
        if (cell) {
          for (let i = 0; i < cell.boxes.length; i++) result.boxes.add(cell.boxes[i]);
          for (let i = 0; i < cell.circles.length; i++) result.circles.add(cell.circles[i]);
        }
      }
    }
    return result;
  }

  // Load authoritative collision data from collision_data.json
  loadFromCollisionData(collisionData) {
    if (!collisionData || !collisionData.collisionBoxes) return;
    
    collisionData.collisionBoxes.forEach((item) => {
      if (item.kind !== 'blocker') return; // Skip floors
      const [x, y, z] = item.pos || [0, 0, 0];

      if (item.type === 'box') {
        const [w, h, d] = item.size || [1, 1, 1];
        this.addBox(item.id, x, z, w, d, item.desc || item.id);
      } else if (item.type === 'cylinder' || item.type === 'sphere') {
        const r = item.radius || 1;
        this.addCircle(item.id, x, z, r, item.desc || item.id);
      }
    });
  }

  // Add all static structures from living_world.js (Arcade, bus stop, market, cafe, barriers)
  loadLivingWorldObstacles() {
    // 1. Arcade Building Facade & Solid Enclosure (16.0, 3.6, -18.0)
    // The facade spans 15.0m wide, 4.0m deep
    this.addBox('lw_arcade_facade_body', 16.0, -18.5, 16.0, 4.5, 'Arcade Facade Complex');
    // Solid wings flanking the doors
    this.addBox('lw_arcade_left_wall', 10.5, -17.5, 3.2, 3.0, 'Arcade Left Solid Wing');
    this.addBox('lw_arcade_right_wall', 22.5, -17.5, 3.2, 3.0, 'Arcade Right Solid Wing');
    this.addBox('lw_arcade_mid_wall', 16.75, -17.8, 3.8, 3.2, 'Arcade Divider Wall');

    // Solid Glass Doors (Allow player to stand directly in front to press E, but stop walking through!)
    this.addBox('lw_arcade_door_coincatch', 12.3, -16.8, 3.6, 0.7, 'Arcade Coin Catcher Solid Glass Door');
    this.addBox('lw_arcade_door_hotpotato', 19.3, -14.3, 3.6, 0.7, 'Arcade Hot Potato Solid Glass Door');

    // 2. Bus Stop Transit Shelter (15.6, 0.24, -14.0)
    // Back glass wall and roof structure
    this.addBox('lw_bus_shelter_back', 14.6, -14.0, 0.8, 5.4, 'Bus Shelter Back Wall');
    this.addBox('lw_bus_shelter_bench', 15.1, -14.0, 1.0, 3.8, 'Bus Shelter Seating Bench');
    this.addCircle('lw_bus_shelter_post_n', 14.6, -16.4, 0.45, 'Bus Shelter North Post');
    this.addCircle('lw_bus_shelter_post_s', 14.6, -11.6, 0.45, 'Bus Shelter South Post');

    // 3. Overhead Cyber Highway Gantry Towers (22, 0, -45)
    this.addBox('lw_gantry_tower_west', 15.8, -45.0, 1.2, 1.2, 'Highway Gantry West Tower');
    this.addBox('lw_gantry_tower_east', 28.2, -45.0, 1.2, 1.2, 'Highway Gantry East Tower');

    // 4. Cyber Cafe Center Tower (0, 0, -0.3)
    // The cafe building body sits behind the entrance
    this.addBox('lw_cafe_main_tower', 0, -1.8, 5.2, 4.2, 'Cyber Cafe Main Tower Body');
    this.addCircle('lw_cafe_beacon_post', 1.1, -1.2, 0.55, 'Cyber Cafe Corner Post');
    this.addBox('lw_cafe_vending_left', -4.15, 0.2, 1.3, 1.2, 'Cafe Left Vending Machine');
    this.addBox('lw_cafe_vending_right', 4.15, 0.2, 1.3, 1.2, 'Cafe Right Vending Machine');

    // 5. Market Stalls & Live Trades Board (10.6, 0, 7.2)
    this.addBox('lw_market_counter', 10.6, 7.2, 4.2, 2.8, 'Market Trading Counter');

    // 6. Central Plaza Fountain (0, 0, 0)
    this.addCircle('lw_fountain_basin', 0, 0, 5.4, 'Fountain Tier 1 Marble Basin');
    this.addCircle('lw_fountain_mid_tier', 0, 0, 3.8, 'Fountain Tier 2 Pedestal');

    // 7. Park Benches (Plaza, Pond, Social Park)
    this.addBox('lw_bench_nw', -5.5, -4.5, 1.4, 2.8, 'Plaza Northwest Bench');
    this.addBox('lw_bench_ne', 5.5, -4.5, 1.4, 2.8, 'Plaza Northeast Bench');
    this.addBox('lw_bench_sw', -6.5, 6.5, 2.6, 2.6, 'Plaza Southwest Bench');
    this.addBox('lw_bench_se', 6.5, 6.5, 2.6, 2.6, 'Plaza Southeast Bench');
    this.addBox('lw_bench_pond', -25.0, 8.2, 3.0, 1.4, 'Pond Edge Bench');
    this.addBox('lw_bench_park_w', -8.0, 42.0, 3.0, 1.4, 'Social Park West Bench');
    this.addBox('lw_bench_park_e', 8.0, 42.0, 3.0, 1.4, 'Social Park East Bench');

    // 8. Social Park Trees & Wishing Pond
    this.addCircle('lw_wishing_pond', -5.0, 54.0, 5.2, 'Wishing Pond Stone Edge');
    [
      [-14, 38], [14, 38], [-18, 48], [18, 48], [-12, 58], [12, 58],
      [-26, 14], [26, 14], [-30, 28], [30, 28]
    ].forEach(([tx, tz], idx) => {
      this.addCircle(`lw_park_tree_${idx}`, tx, tz, 1.0, 'Park Tree Trunk');
    });

    // 9. World Perimeter Guardrails (Prevent walking into the void / sky!)
    // North, South, West, East boundary fences at 92m
    this.addBox('lw_world_barrier_north', 0, -92, 194, 2.4, 'North City Perimeter Guardrail');
    this.addBox('lw_world_barrier_south', 0, 92, 194, 2.4, 'South City Perimeter Guardrail');
    this.addBox('lw_world_barrier_west', -92, 0, 2.4, 194, 'West City Perimeter Guardrail');
    this.addBox('lw_world_barrier_east', 92, 0, 2.4, 194, 'East City Perimeter Guardrail');
  }

  // Load procedural obstacles from world3d.js
  loadLegacyObstacles(obstacles) {
    if (!Array.isArray(obstacles)) return;
    obstacles.forEach((o, i) => {
      if (o.rect) {
        const [x0, z0, x1, z1] = o.rect;
        const w = Math.abs(x1 - x0);
        const d = Math.abs(z1 - z0);
        const cx = (x0 + x1) / 2;
        const cz = (z0 + z1) / 2;
        this.addBox(`legacy_rect_${i}`, cx, cz, w, d, 'Station Rect Blocker');
      } else if (o.x != null && o.z != null && o.r != null) {
        this.addCircle(`legacy_circle_${i}`, o.x, o.z, o.r, 'Station Cylinder Blocker');
      }
    });
  }

  // ==========================================================================
  // Move-And-Slide Physics Solver with Substepping
  // Resolves collisions before moving, cancels normal velocity, enables smooth sliding
  // ==========================================================================
  moveAndSlide(player, dt) {
    const targetVx = player.vx;
    const targetVz = player.vz;
    const speed = Math.hypot(targetVx, targetVz);
    const radius = player.r || 0.36; // Collision cylinder radius
    const skin = 0.04; // Safety margin to prevent precision stickiness

    // Substepping: Prevent tunneling at high sprint speeds (6.525 m/s)
    const displacement = speed * dt;
    const substeps = Math.max(1, Math.min(4, Math.ceil(displacement / 0.10)));
    const subDt = dt / substeps;

    for (let s = 0; s < substeps; s++) {
      let vx = player.vx;
      let vz = player.vz;

      // -------------------------------------------------------------
      // 1. Move & Test along X axis
      // -------------------------------------------------------------
      if (Math.abs(vx) > 1e-4) {
        const nextX = player.x + vx * subDt;
        const hitX = this._testPenetration(nextX, player.z, radius);

        if (!hitX) {
          player.x = nextX;
        } else {
          // Push player out to boundary and zero normal velocity
          player.x = hitX.resolveX;
          player.vx = 0;
          vx = 0;
        }
      }

      // -------------------------------------------------------------
      // 2. Move & Test along Z axis
      // -------------------------------------------------------------
      if (Math.abs(vz) > 1e-4) {
        const nextZ = player.z + vz * subDt;
        const hitZ = this._testPenetration(player.x, nextZ, radius);

        if (!hitZ) {
          player.z = nextZ;
        } else {
          // Push player out to boundary and zero normal velocity
          player.z = hitZ.resolveZ;
          player.vz = 0;
          vz = 0;
        }
      }

      // -------------------------------------------------------------
      // 3. Resolve any diagonal corner or circular pushout
      // -------------------------------------------------------------
      this._resolveOverlap(player, radius + skin);

      // -------------------------------------------------------------
      // 4. Map Boundary Clamp (Ensure player NEVER leaves the map!)
      // -------------------------------------------------------------
      if (player.x < this.mapBounds.minX + radius) { player.x = this.mapBounds.minX + radius; player.vx = Math.max(0, player.vx); }
      if (player.x > this.mapBounds.maxX - radius) { player.x = this.mapBounds.maxX - radius; player.vx = Math.min(0, player.vx); }
      if (player.z < this.mapBounds.minZ + radius) { player.z = this.mapBounds.minZ + radius; player.vz = Math.max(0, player.vz); }
      if (player.z > this.mapBounds.maxZ - radius) { player.z = this.mapBounds.maxZ - radius; player.vz = Math.min(0, player.vz); }
    }

    // Return the actual achieved sliding speed for smooth animation blending
    return Math.hypot(player.vx, player.vz);
  }

  // Check if position (px, pz) penetrates any obstacle
  _testPenetration(px, pz, radius) {
    const nearby = this.getNearby(px, pz, radius + 1);

    // 1. Check Boxes
    for (const b of nearby.boxes) {
      if (px > b.x0 - radius && px < b.x1 + radius && pz > b.z0 - radius && pz < b.z1 + radius) {
        const dLeft = px - (b.x0 - radius);
        const dRight = (b.x1 + radius) - px;
        const dTop = pz - (b.z0 - radius);
        const dBottom = (b.z1 + radius) - pz;
        const minD = Math.min(dLeft, dRight, dTop, dBottom);

        let resolveX = px;
        let resolveZ = pz;
        if (minD === dLeft) resolveX = b.x0 - radius - 0.001;
        else if (minD === dRight) resolveX = b.x1 + radius + 0.001;
        else if (minD === dTop) resolveZ = b.z0 - radius - 0.001;
        else resolveZ = b.z1 + radius + 0.001;

        return { hit: true, resolveX, resolveZ };
      }
    }

    // 2. Check Circles
    for (const c of nearby.circles) {
      const dx = px - c.x;
      const dz = pz - c.z;
      const d = Math.hypot(dx, dz);
      const minDist = c.r + radius;

      if (d < minDist && d > 1e-4) {
        const nx = dx / d;
        const nz = dz / d;
        return {
          hit: true,
          resolveX: c.x + nx * (minDist + 0.001),
          resolveZ: c.z + nz * (minDist + 0.001)
        };
      }
    }

    return null;
  }

  // Resolve residual overlap with corners or round obstacles
  _resolveOverlap(player, radius) {
    const nearby = this.getNearby(player.x, player.z, radius + 1);

    // Circles
    for (const c of nearby.circles) {
      const dx = player.x - c.x;
      const dz = player.z - c.z;
      const d = Math.hypot(dx, dz);
      const minDist = c.r + radius;
      if (d < minDist && d > 1e-4) {
        const nx = dx / d;
        const nz = dz / d;
        player.x = c.x + nx * minDist;
        player.z = c.z + nz * minDist;

        // Cancel velocity into obstacle
        const dot = player.vx * nx + player.vz * nz;
        if (dot < 0) {
          player.vx -= dot * nx;
          player.vz -= dot * nz;
        }
      }
    }

    // Boxes
    for (const b of nearby.boxes) {
      if (player.x > b.x0 - radius && player.x < b.x1 + radius && player.z > b.z0 - radius && player.z < b.z1 + radius) {
        const dLeft = player.x - (b.x0 - radius);
        const dRight = (b.x1 + radius) - player.x;
        const dTop = player.z - (b.z0 - radius);
        const dBottom = (b.z1 + radius) - player.z;
        const minD = Math.min(dLeft, dRight, dTop, dBottom);

        if (minD === dLeft) { player.x = b.x0 - radius; if (player.vx > 0) player.vx = 0; }
        else if (minD === dRight) { player.x = b.x1 + radius; if (player.vx < 0) player.vx = 0; }
        else if (minD === dTop) { player.z = b.z0 - radius; if (player.vz > 0) player.vz = 0; }
        else { player.z = b.z1 + radius; if (player.vz < 0) player.vz = 0; }
      }
    }
  }
}

// Global Singleton Instance
export const globalCollision = new GlobalCollisionSystem();
