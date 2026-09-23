/*
 * bubbleKeyScene: the math behind <BubbleKey>.
 *
 * No WebGL here. Every part (keycap, housing, stem, pins) is a stack of
 * rounded-rect "rings", an orthographic camera flattens them, and each frame
 * the component writes plain SVG:
 *
 *  - silhouettes are the convex hull of the projected rings,
 *  - rounded walls are one linear gradient whose stops are shaded from the
 *    real surface normals, so the light wraps around the corners,
 *  - flat faces (the key top, decals on the housing) map to a single SVG
 *    matrix(). That is why the camera is orthographic: the face drawn on the
 *    key stays exactly in perspective while the cap tilts and squashes.
 */

export type V3 = [number, number, number]
type P2 = [number, number]
type M3 = [number, number, number, number, number, number, number, number, number]

// ---- camera -----------------------------------------------------------------
const YAW = (-34 * Math.PI) / 180
const PITCH = (27 * Math.PI) / 180
/** svg units per model unit */
const S = 10
const cY = Math.cos(YAW)
const sY = Math.sin(YAW)
const cP = Math.cos(PITCH)
const sP = Math.sin(PITCH)

/** world -> view (x right, y up, z toward the viewer) */
function view(p: V3): V3 {
  const x = p[0] * cY + p[2] * sY
  const z = -p[0] * sY + p[2] * cY
  return [x, p[1] * cP - z * sP, p[1] * sP + z * cP]
}
function toSvg(p: V3): P2 {
  const v = view(p)
  return [v[0] * S, -v[1] * S]
}
/** svg offset of a world-space lift along y (the whole switch floats on this) */
export const liftPx = (y: number) => -y * cP * S
/** rotation that turns content drawn on a top face to face the viewer */
export const FACE_TURN = (YAW * 180) / Math.PI

// ---- tiny linear algebra --------------------------------------------------------
const mul = (a: M3, b: M3): M3 => [
  a[0] * b[0] + a[1] * b[3] + a[2] * b[6], a[0] * b[1] + a[1] * b[4] + a[2] * b[7], a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
  a[3] * b[0] + a[4] * b[3] + a[5] * b[6], a[3] * b[1] + a[4] * b[4] + a[5] * b[7], a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
  a[6] * b[0] + a[7] * b[3] + a[8] * b[6], a[6] * b[1] + a[7] * b[4] + a[8] * b[7], a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
]
const apply = (m: M3, p: V3): V3 => [
  m[0] * p[0] + m[1] * p[1] + m[2] * p[2],
  m[3] * p[0] + m[4] * p[1] + m[5] * p[2],
  m[6] * p[0] + m[7] * p[1] + m[8] * p[2],
]
const rotX = (a: number): M3 => [1, 0, 0, 0, Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a)]
const rotZ = (a: number): M3 => [Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0, 0, 0, 1]
const scale3 = (x: number, y: number, z: number): M3 => [x, 0, 0, 0, y, 0, 0, 0, z]
const IDENT: M3 = [1, 0, 0, 0, 1, 0, 0, 0, 1]
const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}

// ---- colour -------------------------------------------------------------------
// Shading happens in OKLCH so a ramp keeps its hue: shadows get deeper and a
// touch more saturated (jelly, not dirt), highlights go paler.
const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toGam = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

function oklch(hex: string): V3 {
  let h = hex.trim().replace('#', '')
  if (h.length === 3) h = h.replace(/./g, (c) => c + c)
  const n = parseInt(h.slice(0, 6), 16)
  const rgb = Number.isNaN(n) ? [0.5, 0.5, 0.5] : [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => toLin(c / 255))
  const l = Math.cbrt(0.4122214708 * rgb[0] + 0.5363325363 * rgb[1] + 0.0514459929 * rgb[2])
  const m = Math.cbrt(0.2119034982 * rgb[0] + 0.6806995451 * rgb[1] + 0.1073969566 * rgb[2])
  const s = Math.cbrt(0.0883024619 * rgb[0] + 0.2817188376 * rgb[1] + 0.6299787005 * rgb[2])
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const b = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return [L, Math.hypot(a, b), Math.atan2(b, a)]
}

function fromOklch(L: number, C: number, h: number): string {
  let rgb = [0, 0, 0]
  // pull chroma in until the colour fits sRGB
  for (let i = 0; i < 14; i++) {
    const a = C * Math.cos(h)
    const b = C * Math.sin(h)
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
    rgb = [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ]
    if (rgb.every((c) => c > -0.002 && c < 1.002)) break
    C *= 0.86
  }
  return '#' + rgb.map((c) => Math.round(toGam(Math.min(1, Math.max(0, c))) * 255).toString(16).padStart(2, '0')).join('')
}

const RAMP_N = 48
const SHADOW_HUE = (330 * Math.PI) / 180
/** signed shortest angle from a to b */
const hueToward = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a))
/** A light -> colour lookup for one material; index with shadeAt(). */
export type Ramp = string[]

export function makeRamp(hex: string, spread = 0.46, pivot = 0.62, chroma: [number, number] = [1.12, 0.84]): Ramp {
  const [L0, C0, h0] = oklch(hex)
  const out: string[] = []
  for (let i = 0; i < RAMP_N; i++) {
    const k = i / (RAMP_N - 1)
    // light colours only get a little lighter, so lemon stays lemon on the lit side
    const lift = (k - pivot) * spread
    const L = Math.max(0.1, L0 + (lift > 0 ? Math.min(lift, (0.975 - L0) * 0.8) : lift))
    // shadows lean a little toward warm magenta: yellow goes golden, not olive; blue goes violet
    const shadow = Math.max(0, pivot - k) / pivot
    out.push(fromOklch(L, C0 * (chroma[0] + (chroma[1] - chroma[0]) * k), h0 + hueToward(h0, SHADOW_HUE) * shadow * 0.1))
  }
  return out
}
export const shadeAt = (r: Ramp, k: number) => r[Math.max(0, Math.min(RAMP_N - 1, Math.round(k * (RAMP_N - 1))))]

/** Dark tone of a colour, for the face / legend drawn on a cap. */
export function inkOf(hex: string): string {
  const [L, C, h] = oklch(hex)
  return fromOklch(Math.max(0.24, L - 0.5), Math.max(0.04, C * 1.05), h)
}

// ---- light --------------------------------------------------------------------
const LIGHT = norm([-0.55, 0.62, 0.56]) // view space: up-left and toward us
const HALF = norm([LIGHT[0], LIGHT[1], LIGHT[2] + 1])

/** 0..1 light on a view-space normal (wrap + a jelly rim at grazing angles) */
function lightOf(n: V3): number {
  const d = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]
  const rim = (1 - Math.max(0, n[2])) ** 3 * 0.16
  return Math.min(1, 0.14 + 0.86 * Math.max(0, d * 0.85 + 0.15) + rim)
}

// ---- geometry -----------------------------------------------------------------
/** A rounded-rect outline at height y, with outward normals. `up` tilts the
 *  normals (0 = straight wall, 1 = facing up, negative = facing down). */
interface Ring {
  pts: V3[]
  nrm: V3[]
  /** index where each corner arc starts; arcs are ARC+1 points long */
  arcs: number[]
}
const ARC = 7

function ring(hx: number, r: number, y: number, up: number, hz = hx, cx = 0, cz = 0): Ring {
  r = Math.min(r, hx, hz)
  const flat = Math.sqrt(Math.max(0, 1 - up * up))
  const pts: V3[] = []
  const nrm: V3[] = []
  const arcs: number[] = []
  // corners counter-clockwise seen from above, starting front-right
  const corners: P2[] = [
    [hx - r, hz - r],
    [-(hx - r), hz - r],
    [-(hx - r), -(hz - r)],
    [hx - r, -(hz - r)],
  ]
  corners.forEach(([ox, oz], c) => {
    arcs.push(pts.length)
    for (let i = 0; i <= ARC; i++) {
      const a = (c + i / ARC) * (Math.PI / 2)
      const nx = Math.cos(a)
      const nz = Math.sin(a)
      pts.push([cx + ox + r * nx, y, cz + oz + r * nz])
      nrm.push([nx * flat, up, nz * flat])
    }
  })
  return { pts, nrm, arcs }
}

function hull(p: P2[]): P2[] {
  const pts = p.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: P2, a: P2, b: P2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lo: P2[] = []
  const hi: P2[] = []
  for (const q of pts) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop()
    lo.push(q)
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const q = pts[i]
    while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop()
    hi.push(q)
  }
  lo.pop()
  hi.pop()
  return lo.concat(hi)
}

const f1 = (n: number) => (Math.round(n * 10) / 10).toString()

/** closed path through the midpoints of a polygon, rounding every vertex */
function smoothPath(poly: P2[]): string {
  const n = poly.length
  if (n < 3) return ''
  const mid = (a: P2, b: P2): P2 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  let m = mid(poly[n - 1], poly[0])
  let d = `M${f1(m[0])} ${f1(m[1])}`
  for (let i = 0; i < n; i++) {
    m = mid(poly[i], poly[(i + 1) % n])
    d += `Q${f1(poly[i][0])} ${f1(poly[i][1])} ${f1(m[0])} ${f1(m[1])}`
  }
  return d + 'Z'
}

const polyPath = (poly: P2[]) => 'M' + poly.map((q) => `${f1(q[0])} ${f1(q[1])}`).join('L') + 'Z'

/** rounded rect in a face's local 2D space (for matrix()-mapped faces) */
export function rrect(hx: number, hy: number, r: number, cx = 0, cy = 0): string {
  r = Math.min(r, hx, hy)
  const x0 = cx - hx
  const x1 = cx + hx
  const y0 = cy - hy
  const y1 = cy + hy
  return (
    `M${x0 + r} ${y0}H${x1 - r}A${r} ${r} 0 0 1 ${x1} ${y0 + r}V${y1 - r}A${r} ${r} 0 0 1 ${x1 - r} ${y1}` +
    `H${x0 + r}A${r} ${r} 0 0 1 ${x0} ${y1 - r}V${y0 + r}A${r} ${r} 0 0 1 ${x0 + r} ${y0}Z`
  )
}

/** svg matrix() that maps a face's local (u, v) onto the screen */
function planeMatrix(origin: V3, u: V3, v: V3): string {
  const o = toSvg(origin)
  const a = view(u)
  const b = view(v)
  return `matrix(${[a[0] * S, -a[1] * S, b[0] * S, -b[1] * S, o[0], o[1]].map((n) => n.toFixed(3)).join(' ')})`
}

// ---- solids -------------------------------------------------------------------
export interface Grad {
  x1: number
  y1: number
  x2: number
  y2: number
  stops: string[]
}
export const GRAD_STOPS = 9

interface Placed {
  M: M3
  R: M3
  T: V3
}
const placePt = (pl: Placed, q: V3): V3 => {
  const a = apply(pl.M, q)
  return [a[0] + pl.T[0], a[1] + pl.T[1], a[2] + pl.T[2]]
}

/** silhouette + horizontally shaded walls of a stack of rings */
function solid(rings: Ring[], shadeRings: Ring[], pl: Placed, ramp: Ramp, from = 0): { d: string; grad: Grad } {
  const pts: P2[] = []
  for (let i = from; i < rings.length; i++) for (const q of rings[i].pts) pts.push(toSvg(placePt(pl, q)))
  const poly = hull(pts)

  // the screen direction across the walls: perpendicular to this solid's up
  const o = toSvg(placePt(pl, [0, 0, 0]))
  const up = toSvg(placePt(pl, [0, 1, 0]))
  let ux = up[0] - o[0]
  let uy = up[1] - o[1]
  const ul = Math.hypot(ux, uy) || 1
  ux /= ul
  uy /= ul
  const hx = -uy
  const hy = ux
  let t0 = Infinity
  let t1 = -Infinity
  for (const q of poly) {
    const t = (q[0] - o[0]) * hx + (q[1] - o[1]) * hy
    if (t < t0) t0 = t
    if (t > t1) t1 = t
  }

  // light on every front-facing wall sample, ordered left -> right
  const samples: P2[] = []
  for (const rg of shadeRings) {
    rg.pts.forEach((q, i) => {
      const n = view(norm(apply(pl.R, rg.nrm[i])))
      if (n[2] <= 0.02) return
      const s = toSvg(placePt(pl, q))
      samples.push([(s[0] - o[0]) * hx + (s[1] - o[1]) * hy, lightOf(n)])
    })
  }
  samples.sort((a, b) => a[0] - b[0])
  const stops: string[] = []
  for (let i = 0; i < GRAD_STOPS; i++) {
    const t = t0 + ((t1 - t0) * i) / (GRAD_STOPS - 1)
    let k = samples.length ? samples[0][1] : 0.5
    for (let j = 0; j < samples.length; j++) {
      if (samples[j][0] >= t) {
        const a = samples[j - 1]
        const b = samples[j]
        k = a ? a[1] + ((b[1] - a[1]) * (t - a[0])) / (b[0] - a[0] || 1) : b[1]
        break
      }
      k = samples[j][1]
    }
    stops.push(shadeAt(ramp, k))
  }
  return {
    d: smoothPath(poly),
    grad: { x1: o[0] + hx * t0, y1: o[1] + hy * t0, x2: o[0] + hx * t1, y2: o[1] + hy * t1, stops },
  }
}

// ---- the keycap -------------------------------------------------------------------
// Local space: y = 0 at the bottom rim, centred on the stem.
const CAP = { base: 9, wallTop: 7.7, top: 5.3, height: 8.6, rBase: 5, rWallTop: 4.4, rTop: 2.5 }
const CAP_FILLET = CAP.wallTop - CAP.top // round top edge: this is what makes it puffy

const CAP_RINGS: Ring[] = []
// a soft, tucked-in bottom lip
CAP_RINGS.push(ring(CAP.base - 0.55, CAP.rBase - 0.55, 0, -0.8))
CAP_RINGS.push(ring(CAP.base - 0.14, CAP.rBase - 0.14, 0.34, -0.4))
const WALL_FROM = CAP_RINGS.length
const WALL_Y0 = 0.9
const WALL_Y1 = CAP.height - CAP_FILLET
for (let i = 0; i <= 4; i++) {
  const t = i / 4
  // linear taper plus an outward bulge in the middle: gummy, not machined
  const hs = CAP.base + (CAP.wallTop - CAP.base) * t + 0.42 * Math.sin(Math.PI * t)
  CAP_RINGS.push(ring(hs, CAP.rBase + (CAP.rWallTop - CAP.rBase) * t, WALL_Y0 + (WALL_Y1 - WALL_Y0) * t, 0.3 - 0.12 * t))
}
const FILLET_FROM = CAP_RINGS.length
for (let i = 1; i <= 6; i++) {
  const a = (i / 6) * (Math.PI / 2)
  CAP_RINGS.push(
    ring(
      CAP.top + CAP_FILLET * Math.cos(a),
      CAP.rTop + (CAP.rWallTop - CAP.rTop) * Math.cos(a),
      WALL_Y1 + CAP_FILLET * Math.sin(a),
      Math.sin(a),
    ),
  )
}
const WALL_SHADE = [CAP_RINGS[WALL_FROM + 2]]
const FILLET_SHADE = [CAP_RINGS[FILLET_FROM + 2]]
const RIM = CAP_RINGS[1]
const STREAK = [4, 3, 2, 1].map((i) => CAP_RINGS[WALL_FROM + i])

/** the key-top outline in its own plane */
export const CAP_TOP_PATH = rrect(CAP.top, CAP.top, CAP.rTop)

// ---- the switch ---------------------------------------------------------------------
// World space: y = 0 is the middle of the mounting lip.
const HOUSING_TOP = 3.6
/** cap bottom height with the key up; TRAVEL is how far it goes down */
export const CAP_REST = 7.4
export const TRAVEL = 3.3
const STEM_TOP = 9.1

export interface CapPose {
  /** cap bottom height (world y) */
  y: number
  /** + squashed, - stretched */
  squash: number
  /** radians: nod toward the viewer / roll sideways */
  tiltX: number
  tiltZ: number
}

export interface CapFrame {
  body: string
  wall: Grad
  band: string
  bandGrad: Grad
  top: string
  topK: number
  rim: string
  streak: string
  /** top -> bottom of the streak, for its fade */
  streakAxis: [number, number, number, number]
  streakAlpha: number
  shadow: string
  shadowAlpha: number
}

export function capFrame(p: CapPose, ramp: Ramp): CapFrame {
  const R = mul(rotZ(p.tiltZ), rotX(p.tiltX))
  // squash about the bottom rim, keeping the volume roughly constant
  const M = mul(R, scale3(1 + p.squash * 0.55, 1 - p.squash, 1 + p.squash * 0.55))
  const pl: Placed = { M, R, T: [0, p.y, 0] }

  const body = solid(CAP_RINGS, WALL_SHADE, pl, ramp)
  const band = solid(CAP_RINGS, FILLET_SHADE, pl, ramp, FILLET_FROM - 1)
  const topN = view(norm(apply(R, [0, 1, 0])))

  // glowing rim: the front-facing run of the bottom lip
  let rim = ''
  const vis = RIM.nrm.map((n) => view(norm(apply(R, n)))[2] > 0.08)
  const start = vis.findIndex((v, i) => v && !vis[(i + vis.length - 1) % vis.length])
  if (start >= 0) {
    const run: P2[] = []
    for (let i = 0; i < vis.length && vis[(start + i) % vis.length]; i++) run.push(toSvg(placePt(pl, RIM.pts[(start + i) % vis.length])))
    rim = 'M' + run.map((q) => `${f1(q[0])} ${f1(q[1])}`).join('L')
  }

  // specular streak down whichever rounded corner catches the light
  let best = -1
  let bestI = 0
  for (const a of STREAK[0].arcs) {
    for (let i = a; i <= a + ARC; i++) {
      const n = view(norm(apply(R, STREAK[0].nrm[i])))
      const s = n[0] * HALF[0] + n[1] * HALF[1] + n[2] * HALF[2]
      if (s > best) {
        best = s
        bestI = i
      }
    }
  }
  const line = STREAK.map((rg) => toSvg(placePt(pl, rg.pts[bestI])))
  const streak = 'M' + line.map((q) => `${f1(q[0])} ${f1(q[1])}`).join('L')

  // soft contact shadow on the housing top, darker as the cap closes in
  const c = placePt(pl, [0, 0, 0])
  const sx = 1 + p.squash * 0.55
  const gap = p.y - HOUSING_TOP
  return {
    body: body.d,
    wall: body.grad,
    band: band.d,
    bandGrad: band.grad,
    top: planeMatrix(placePt(pl, [0, CAP.height, 0]), apply(M, [1, 0, 0]), apply(M, [0, 0, 1])),
    topK: lightOf(topN),
    rim,
    streak,
    streakAxis: [line[0][0], line[0][1], line[line.length - 1][0], line[line.length - 1][1]],
    streakAlpha: Math.max(0, Math.min(1, (best - 0.55) / 0.35)),
    shadow: planeMatrix([c[0], HOUSING_TOP + 0.02, c[2]], [sx, 0, 0], [0, 0, sx]),
    shadowAlpha: Math.max(0, Math.min(0.5, 0.62 - gap * 0.16)),
  }
}

/** stem boxes (cross-shaped) from the housing top up to its current top */
export function stemFaces(top: number, ramp: Ramp): { d: string; fill: string }[] {
  if (top <= HOUSING_TOP + 0.05) return []
  const w = 0.62
  const L = 2.05
  // back, left, centre, right, front: far to near for this camera
  const boxes: [number, number, number, number][] = [
    [-w, w, -L, -w],
    [-L, -w, -w, w],
    [-w, w, -w, w],
    [w, L, -w, w],
    [-w, w, w, L],
  ]
  const y0 = HOUSING_TOP
  const out: { d: string; fill: string }[] = []
  for (const [x0, x1, z0, z1] of boxes) {
    const faces: [V3[], V3][] = [
      [[[x1, y0, z1], [x1, y0, z0], [x1, top, z0], [x1, top, z1]], [1, 0, 0]],
      [[[x0, y0, z1], [x1, y0, z1], [x1, top, z1], [x0, top, z1]], [0, 0, 1]],
      [[[x0, top, z0], [x1, top, z0], [x1, top, z1], [x0, top, z1]], [0, 1, 0]],
    ]
    for (const [q, n] of faces) {
      const nv = view(n)
      if (nv[2] <= 0) continue
      out.push({ d: polyPath(q.map(toSvg)), fill: shadeAt(ramp, lightOf(nv)) })
    }
  }
  return out
}

export const stemTop = (travel: number) => STEM_TOP - travel

// ---- static switch body -----------------------------------------------------------------
export interface Shape {
  d: string
  fill: string
  opacity?: number
  stroke?: string
  strokeWidth?: number
  transform?: string
  grad?: Grad
}

const PL0: Placed = { M: IDENT, R: IDENT, T: [0, 0, 0] }

function shaded(rings: Ring[], shade: Ring[], ramp: Ramp): Shape {
  const s = solid(rings, shade, PL0, ramp)
  return { d: s.d, fill: '', grad: s.grad }
}

/** flat top face of a solid, as a matrix-mapped rounded rect */
function flatTop(hs: number, r: number, y: number, fill: string, cx = 0, cz = 0): Shape {
  return { d: rrect(hs, hs, r), fill, transform: planeMatrix([cx, y, cz], [1, 0, 0], [0, 0, 1]) }
}

export interface SwitchParts {
  shapes: Shape[]
  /** outline of the housing top, used to keep the cap's shadow on it */
  topClip: string
}

export function buildSwitch(housing: Ramp, gold: Ramp): SwitchParts {
  const shapes: Shape[] = []
  const lit = (n: V3) => lightOf(view(norm(n)))

  // centre post + two gold pins, drawn first: the housing sits in front of them
  const cyl = (r0: number, r1: number, y0: number, y1: number, cx: number, cz: number, ramp: Ramp) => {
    const rings = [
      ring(r0, r0, y0, 0, r0, cx, cz),
      ring(r1, r1, y1 + 0.35, -0.3, r1, cx, cz),
      ring(r1 * 0.55, r1 * 0.55, y1, -0.9, r1 * 0.55, cx, cz),
    ]
    return shaded(rings, [rings[0]], ramp)
  }
  shapes.push(cyl(0.36, 0.32, -4.6, -8.6, -3.1, -1.4, gold))
  shapes.push(cyl(0.36, 0.32, -4.6, -8.3, 2.7, 3.6, gold))
  shapes.push(cyl(1.75, 1.3, -4.6, -9.4, 0, 0, housing))

  // bottom housing
  const bot = [ring(6.1, 1.3, -4.8, -0.6), ring(6.4, 1.5, -4.45, 0), ring(6.5, 1.6, -0.5, 0.04)]
  shapes.push(shaded(bot, [bot[2]], housing))
  // front: latch window with a little tab, two grooves
  const front = planeMatrix([0, 0, 6.52], [1, 0, 0], [0, -1, 0])
  shapes.push({ d: rrect(2.3, 1.25, 0.55, 0, 2.75), fill: shadeAt(housing, 0.08), transform: front })
  shapes.push({ d: rrect(1.55, 0.42, 0.3, 0, 3.55), fill: shadeAt(housing, lit([0, 0.4, 1]) * 0.85), transform: front })
  for (const x of [-4.3, 4.3]) shapes.push({ d: rrect(0.2, 1.7, 0.2, x, 2.6), fill: shadeAt(housing, 0.12), transform: front })
  // right side: a chunky clip
  const side = planeMatrix([6.52, 0, 0], [0, 0, -1], [0, -1, 0])
  shapes.push({ d: rrect(1.9, 1.5, 0.6, 0, 2.55), fill: shadeAt(housing, lit([1, 0.1, 0]) + 0.1), transform: side })
  shapes.push({ d: rrect(1.3, 0.28, 0.28, 0, 1.55), fill: shadeAt(housing, 0.06), transform: side })

  // mounting lip
  const lip = [ring(7.4, 1.5, -0.55, -0.7), ring(7.75, 1.8, -0.3, 0), ring(7.75, 1.8, 0.25, 0), ring(7.5, 1.6, 0.55, 0.75)]
  shapes.push(shaded(lip, [lip[2]], housing))
  shapes.push(flatTop(7.5, 1.6, 0.55, shadeAt(housing, lit([0, 1, 0]))))
  // its light-catching edge (the top housing covers the back half)
  shapes.push({
    d: rrect(7.5, 7.5, 1.6),
    fill: 'none',
    stroke: '#ffffff',
    strokeWidth: 0.14,
    opacity: 0.16,
    transform: planeMatrix([0, 0.55, 0], [1, 0, 0], [0, 0, 1]),
  })

  // top housing: tapered, with a round top edge
  const topRings = [
    ring(7.0, 2.2, 0.55, 0.3),
    ring(6.2, 2.0, 2.7, 0.35),
    ring(5.85, 1.9, 3.25, 0.7),
    ring(5.35, 1.7, HOUSING_TOP, 0.97),
  ]
  const topBody = shaded(topRings, [topRings[1]], housing)
  shapes.push(topBody)
  shapes.push(flatTop(5.4, 1.75, HOUSING_TOP, shadeAt(housing, lit([0, 1, 0]))))
  // stem well + an LED window, both recessed
  const topPlane = planeMatrix([0, HOUSING_TOP, 0], [1, 0, 0], [0, 0, 1])
  shapes.push({ d: rrect(2.55, 2.55, 0.9), fill: shadeAt(housing, 0.02), transform: topPlane })
  shapes.push({ d: rrect(1.7, 0.62, 0.5, 0, -3.95), fill: shadeAt(housing, 0.04), transform: topPlane })
  shapes.push({
    d: rrect(1.7, 0.62, 0.5, 0, -3.95),
    fill: 'none',
    stroke: '#ffffff',
    strokeWidth: 0.16,
    opacity: 0.18,
    transform: topPlane,
  })

  return { shapes, topClip: topBody.d }
}

/** world -> svg, for things that fly around (bubbles) */
export const project = toSvg

/** a flat circle of radius r lying on the floor at height y, as an svg ellipse */
export function floorEllipse(y: number, r: number) {
  const c = toSvg([0, y, 0])
  return { cx: c[0], cy: c[1], rx: r * S, ry: r * S * sP }
}
