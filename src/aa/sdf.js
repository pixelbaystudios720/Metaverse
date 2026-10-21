// Signed-distance modelling for shapes that spheres and lathes can't make: sculpted hair locks, shorts with two
// leg openings, shoes with a toe and a heel, arms that bend without seams. meshSDF samples a distance function on
// a grid (coarse first, fine only near the surface), builds a surface-nets mesh, snaps every vertex onto the
// surface and takes its normal from the gradient, so the result shades smoothly. No three.js here, so it also
// runs in Node for timing.
// Math.hypot is slow in V8; these run millions of times per mesh
export const len2 = (a, b) => Math.sqrt(a * a + b * b);
export const len3 = (a, b, c) => Math.sqrt(a * a + b * b + c * c);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const mix = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; };
export const smax = (a, b, k) => -smin(-a, -b, k);

// an ellipsoid at the origin (a close bound, not exact)
export function ellipsoid(x, y, z, rx, ry, rz) {
  const k0 = len3(x / rx, y / ry, z / rz), k1 = len3(x / (rx * rx), y / (ry * ry), z / (rz * rz));
  return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
}
// a cone with rounded ends, radius r1 at a and r2 at b (exact)
export function roundCone(px, py, pz, ax, ay, az, bx, by, bz, r1, r2) {
  const bax = bx - ax, bay = by - ay, baz = bz - az, l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pax = px - ax, pay = py - ay, paz = pz - az, y = pax * bax + pay * bay + paz * baz, z = y - l2;
  const qx = pax * l2 - bax * y, qy = pay * l2 - bay * y, qz = paz * l2 - baz * y, x2 = qx * qx + qy * qy + qz * qz;
  const y2 = y * y * l2, z2 = z * z * l2, k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
// a chain of round cones through points [[x,y,z,r], ...], with a bounding box so far-away samples skip it
export function chain(pts) {
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (const [x, y, z, r] of pts) { x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); z0 = Math.min(z0, z - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r); z1 = Math.max(z1, z + r); }
  const S = [];
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; S.push((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, len3(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 2 + Math.max(a[3], b[3])); }
  return {
    box: [x0, y0, z0, x1, y1, z1],
    d(x, y, z, far = Infinity) {
      const out = Math.max(x0 - x, x - x1, y0 - y, y - y1, z0 - z, z - z1);
      if (out > far) return out; // a lower bound is enough when the caller only cares about values under `far`
      let d = Infinity, lo = Infinity;
      for (let i = 0; i < S.length; i += 4) {
        const lb = len3(x - S[i], y - S[i + 1], z - S[i + 2]) - S[i + 3]; // bounding sphere of this segment
        if (lb >= d || lb > far) { if (lb < lo) lo = lb; continue; }
        const a = pts[i / 4], b = pts[i / 4 + 1]; d = Math.min(d, roundCone(x, y, z, a[0], a[1], a[2], b[0], b[1], b[2], a[3], b[3]));
      }
      return Math.min(d, lo);
    },
  };
}

const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
export function meshSDF(f, [x0, y0, z0], [x1, y1, z1], h, { snap = 2 } = {}) {
  const nx = Math.ceil((x1 - x0) / h) + 1, ny = Math.ceil((y1 - y0) / h) + 1, nz = Math.ceil((z1 - z0) / h) + 1;
  const I = (i, j, k) => i + nx * (j + ny * k);
  // coarse pass: one sample every C cells; a coarse cell whose corners are all far from the surface is skipped
  const C = 4, cx = Math.ceil((nx - 1) / C) + 1, cy = Math.ceil((ny - 1) / C) + 1, cz = Math.ceil((nz - 1) / C) + 1;
  const cv = new Float32Array(cx * cy * cz), CI = (i, j, k) => i + cx * (j + cy * k);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) cv[CI(i, j, k)] = f(x0 + i * C * h, y0 + j * C * h, z0 + k * C * h);
  const v = new Float32Array(nx * ny * nz), done = new Uint8Array(nx * ny * nz), band = C * h * 1.8;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) v[I(i, j, k)] = cv[CI(Math.min(cx - 1, Math.round(i / C)), Math.min(cy - 1, Math.round(j / C)), Math.min(cz - 1, Math.round(k / C)))];
  for (let ck = 0; ck < cz - 1; ck++) for (let cj = 0; cj < cy - 1; cj++) for (let ci = 0; ci < cx - 1; ci++) {
    let lo = Infinity, neg = false, pos = false;
    for (let c = 0; c < 8; c++) { const d = cv[CI(ci + (c & 1), cj + ((c >> 1) & 1), ck + ((c >> 2) & 1))]; lo = Math.min(lo, Math.abs(d)); if (d < 0) neg = true; else pos = true; }
    if (!(neg && pos) && lo > band) continue;
    for (let k = ck * C; k <= Math.min(nz - 1, ck * C + C); k++) for (let j = cj * C; j <= Math.min(ny - 1, cj * C + C); j++) for (let i = ci * C; i <= Math.min(nx - 1, ci * C + C); i++) {
      const n = I(i, j, k); if (done[n]) continue; done[n] = 1; v[n] = f(x0 + i * h, y0 + j * h, z0 + k * h);
    }
  }
  // surface nets: one vertex per cell the surface crosses, at the mean of its edge crossings
  const cell = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1), CL = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k);
  const P = [], c8 = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let m = 0;
    for (let c = 0; c < 8; c++) { c8[c] = v[I(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1))]; if (c8[c] < 0) m |= 1 << c; }
    if (m === 0 || m === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of EDGES) {
      const da = c8[a], db = c8[b]; if ((da < 0) === (db < 0)) continue;
      const t = da / (da - db);
      sx += (a & 1) + t * ((b & 1) - (a & 1)); sy += ((a >> 1) & 1) + t * (((b >> 1) & 1) - ((a >> 1) & 1)); sz += ((a >> 2) & 1) + t * (((b >> 2) & 1) - ((a >> 2) & 1)); n++;
    }
    cell[CL(i, j, k)] = P.length / 3; P.push(x0 + (i + sx / n) * h, y0 + (j + sy / n) * h, z0 + (k + sz / n) * h);
  }
  // a quad around every grid edge the surface crosses, turned so it faces from inside (negative) to outside
  const T = [];
  const quad = (a, b, c, d, dir, axis) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    const e1 = [P[c * 3] - P[a * 3], P[c * 3 + 1] - P[a * 3 + 1], P[c * 3 + 2] - P[a * 3 + 2]], e2 = [P[d * 3] - P[b * 3], P[d * 3 + 1] - P[b * 3 + 1], P[d * 3 + 2] - P[b * 3 + 2]];
    const nrm = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    if (nrm[axis] * dir < 0) T.push(a, d, c, a, c, b); else T.push(a, b, c, a, c, d);
  };
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const d0 = v[I(i, j, k)], in0 = d0 < 0;
    if (i < nx - 1 && j > 0 && k > 0 && j < ny - 1 && k < nz - 1 && in0 !== (v[I(i + 1, j, k)] < 0)) quad(cell[CL(i, j - 1, k - 1)], cell[CL(i, j, k - 1)], cell[CL(i, j, k)], cell[CL(i, j - 1, k)], in0 ? 1 : -1, 0);
    if (j < ny - 1 && i > 0 && k > 0 && i < nx - 1 && k < nz - 1 && in0 !== (v[I(i, j + 1, k)] < 0)) quad(cell[CL(i - 1, j, k - 1)], cell[CL(i, j, k - 1)], cell[CL(i, j, k)], cell[CL(i - 1, j, k)], in0 ? 1 : -1, 1);
    if (k < nz - 1 && i > 0 && j > 0 && i < nx - 1 && j < ny - 1 && in0 !== (v[I(i, j, k + 1)] < 0)) quad(cell[CL(i - 1, j - 1, k)], cell[CL(i, j - 1, k)], cell[CL(i, j, k)], cell[CL(i - 1, j, k)], in0 ? 1 : -1, 2);
  }
  // snap onto the surface along the gradient (four samples on a tetrahedron give the value and the gradient),
  // and keep that gradient as the normal: the step is under a cell, so it barely turns
  const pos = new Float32Array(P), nor = new Float32Array(P.length), e = h * .3;
  for (let p = 0; p < pos.length; p += 3) {
    let x = pos[p], y = pos[p + 1], z = pos[p + 2], gx = 0, gy = 1, gz = 0;
    for (let s = 0; s < snap; s++) {
      const a = f(x + e, y - e, z - e), b = f(x - e, y - e, z + e), c = f(x - e, y + e, z - e), d4 = f(x + e, y + e, z + e);
      const d = (a + b + c + d4) / 4; gx = a - b - c + d4; gy = -a - b + c + d4; gz = -a + b - c + d4;
      const gl = len3(gx, gy, gz) / (4 * e); if (gl < 1e-6) break;
      let step = -d / gl; if (Math.abs(step) > h) step = Math.sign(step) * h;
      const k = step / (gl * 4 * e); x += gx * k; y += gy * k; z += gz * k;
    }
    const l = len3(gx, gy, gz) || 1;
    pos[p] = x; pos[p + 1] = y; pos[p + 2] = z; nor[p] = gx / l; nor[p + 1] = gy / l; nor[p + 2] = gz / l;
  }
  const index = pos.length / 3 > 65535 ? new Uint32Array(T) : new Uint16Array(T);
  return { position: pos, normal: nor, index };
}
