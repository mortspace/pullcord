/* PixelLoader mascot kit: one character, built from shared parts, so every scene looks like the same little creature.
   A scene is a list of frames; a frame is 32 rows of 32 palette letters, '.' is clear. Draw order is back to front:
   shadow, things behind, the mascot, things it holds, effects. */

const MN = 32;

/* the palette. Every colour has a job; a scene may only use these letters. Light comes from the top right, so each
   material has a base and a shade for its left and lower edges, and props get a darker contour where they meet
   something else. The body never gets an outline or a highlight: it is a flat clay orange with one shade */
const MPAL = {
  o: '#EC8560', O: '#C4603E', d: '#9A4A31',             // body: base, shade (left and lower edges), deep (under arms, hidden legs)
  k: '#1E1A1D',                                           // ink: eyes and brows
  p: '#F4A98E',                                           // blush
  w: '#FFFDF8', c: '#EEE6DA', C: '#CDBFAE',              // cream: chef hat, paper, pages, steam
  g: '#3A3538', G: '#232022', h: '#5C5559',              // charcoal: pan, laptop, lens rim
  b: '#7E5C49', B: '#513C31', n: '#A27D64',              // brown: wood, leather, the deerstalker
  u: '#3563B5', U: '#1F3C78', l: '#5C8BDE',              // blue: wizard hat, headphones
  y: '#F6C553', Y: '#D99A2B', z: '#FFE7A0',              // gold: sparkles, notes, food, stars
  e: '#71C66C', E: '#3F8F4A',                             // green: the bug, good news
  r: '#E5534B', R: '#A8332F',                             // red: warnings, hearts
  m: '#BDB6B0', M: '#8E8782',                             // smoke and steel
  s: 'rgba(30,20,15,0.16)',                               // shadow on the ground
};

const mPic = () => Array.from({ length: MN }, () => Array(MN).fill('.'));
const mDone = g => g.map(r => r.join(''));
/* put cells [x, y, letter] into a picture; later draws cover earlier ones, off-canvas cells are dropped */
const mPut = (g, cells) => { for (const [x, y, c] of cells) if (c && c !== '.' && x >= 0 && x < MN && y >= 0 && y < MN) g[y][x] = c; return g; };
/* ASCII art rows at (x, y), '.' and ' ' are clear */
const mArt = (rows, x = 0, y = 0) => rows.flatMap((r, j) => [...r].map((c, i) => [x + i, y + j, c]).filter(([, , c]) => c !== '.' && c !== ' '));
const mFlipX = rows => rows.map(r => [...r].reverse().join(''));
const mFrame = (ms, ...layers) => ({ ms, b: mDone(layers.reduce((g, l) => mPut(g, typeof l === 'function' ? l() : l), mPic())) });

/* ---------- the mascot ----------
   A clay block 13 wide and 9 tall with square corners, two stubby arms and four short legs, and no mouth: it speaks
   with its eyes, a brow, a blush and its whole body. Its home is x 9..21, y 15..23, feet on row 25, so a hat has rows
   5 to 14 above it. Options:
     x, y      top left of the body (home 9, 15)
     eyes      'open' 'blink' 'happy' 'closed' 'squint' 'wide' 'x' 'dot' or [left, right] (a wink is ['open', 'closed'])
     look      [dx, dy] the eyes look this way, one cell at most each way
     brows     null 'up' 'down' 'worry' 'flat' (two-cell brows, one clear row above the eyes)
     blush     true for two soft cells under the eyes
     arms      [left, right], each 'rest' 'up' 'down' 'out' 'hold' 'reach' 'hide' or a list of cells relative to the shoulder
     legs      'stand' 'stepA' 'stepB' 'crouch' 'tuck' 'air'
     squash    1 squashes (one row lower, one cell wider each side), -1 stretches (one row taller, a cell narrower) */
const M_W = 13, M_H = 9;
const M_EYES = {
  open: [[0, 0], [0, 1]],
  wide: [[0, -1], [0, 0], [0, 1]],
  blink: [[0, 1]],
  closed: [[-1, 1], [0, 1]],
  sleepy: [[-1, 1], [0, 1]],
  happy: [[-1, 1], [0, 0], [1, 1]],
  squint: [[-1, 1], [0, 1], [1, 1]],
  x: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  dot: [[0, 1]],
};
const mEye = (kind, ex, ey, side) => (M_EYES[kind] || M_EYES.open).map(([dx, dy]) => [ex + (side === 'R' && kind !== 'x' && kind !== 'happy' ? -dx : dx), ey + dy, 'k']);
/* arms: cells relative to the shoulder, for the right arm; the left arm is the mirror. The shoulder is the body cell at
   the arm's root, row 5 of the body. Tone 'o' on top, 'O' underneath */
const M_ARMS = {
  rest: [[1, 0, 'o'], [2, 0, 'o'], [1, 1, 'O'], [2, 1, 'O']],
  out: [[1, 0, 'o'], [2, 0, 'o'], [3, 0, 'o'], [1, 1, 'O'], [2, 1, 'O'], [3, 1, 'O']],
  up: [[1, -1, 'o'], [2, -2, 'o'], [1, 0, 'O'], [2, -1, 'O'], [3, -3, 'o'], [3, -2, 'O']],
  down: [[1, 1, 'o'], [1, 2, 'O'], [2, 2, 'O']],
  hold: [[1, 0, 'o'], [2, 0, 'o'], [3, 0, 'o'], [4, 0, 'o'], [1, 1, 'O'], [2, 1, 'O'], [3, 1, 'O'], [4, 1, 'O']],
  reach: [[1, -1, 'o'], [2, -2, 'o'], [3, -3, 'o'], [1, 0, 'O'], [2, -1, 'O'], [3, -2, 'O']],
  hide: [],
};
const M_LEGS = { stand: [2, 2, 2, 2], stepA: [1, 2, 1, 2], stepB: [2, 1, 2, 1], crouch: [1, 1, 1, 1], tuck: [1, 0, 0, 1], air: [2, 2, 2, 2] };
const M_LEG_X = [1, 3, 9, 11];
function mascot(o = {}) {
  const sq = o.squash || 0, bx = (o.x ?? 9) - (sq > 0 ? 1 : sq < 0 ? -1 : 0), by = (o.y ?? 15) + (sq > 0 ? 1 : sq < 0 ? -1 : 0);
  const W = M_W + (sq > 0 ? 2 : sq < 0 ? -2 : 0), H = M_H - (sq > 0 ? 1 : 0) + (sq < 0 ? 1 : 0);
  const cells = [];
  /* legs first, they sit under the body */
  const legs = M_LEGS[o.legs || 'stand'];
  M_LEG_X.forEach((lx, i) => { const x = bx + lx + (sq > 0 ? (i < 2 ? 0 : 2) : sq < 0 ? (i < 2 ? 0 : -2) : 0);
    for (let k = 0; k < legs[i]; k++) cells.push([x, by + H + k, i === 0 || i === 2 ? 'O' : 'o']); });
  /* the body: base clay, the left column and the bottom row in shade */
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) cells.push([bx + x, by + y, x === 0 || y === H - 1 ? 'O' : 'o']);
  /* arms at body row 5 */
  const [la, ra] = o.arms || ['rest', 'rest'], ay = by + 5 - (sq > 0 ? 1 : 0);
  const arm = (a, side) => (Array.isArray(a) ? a : M_ARMS[a] || []).map(([dx, dy, t]) => side === 'R' ? [bx + W - 1 + dx, ay + dy, t] : [bx - dx, ay + dy, t === 'o' ? 'O' : 'd']);
  cells.push(...arm(la, 'L'), ...arm(ra, 'R'));
  /* eyes */
  const [le, re] = Array.isArray(o.eyes) ? o.eyes : [o.eyes || 'open', o.eyes || 'open'];
  const [lx, ly] = o.look || [0, 0], ey = by + 2 + ly - (sq > 0 ? 1 : 0) + (sq < 0 ? 1 : 0);
  const exL = bx + 3 + lx + (sq > 0 ? 1 : sq < 0 ? -1 : 0), exR = bx + W - 4 + lx - (sq > 0 ? 1 : sq < 0 ? -1 : 0);
  cells.push(...mEye(le, exL, ey, 'L'), ...mEye(re, exR, ey, 'R'));
  if (o.brows) {
    /* a brow sits one clear row above the top of the eye: raised, knitted down toward the middle, or worried */
    const top = Math.min(...[le, re].map(e => Math.min(...(M_EYES[e] || M_EYES.open).map(([, dy]) => dy)))) - 2;
    const b = { up: [[-1, top], [0, top - 1]], down: [[-1, top], [0, top + 1]], worry: [[-1, top + 1], [0, top]], flat: [[-1, top], [0, top]] }[o.brows];
    cells.push(...b.map(([dx, dy]) => [exL + dx, ey + dy, 'k']), ...b.map(([dx, dy]) => [exR - dx, ey + dy, 'k']));
  }
  if (o.blush) cells.push([exL - 1, ey + 3, 'p'], [exR + 1, ey + 3, 'p']);
  return cells;
}
/* the shadow under the feet: shorter as the mascot rises */
const mShadow = (lift = 0, x = 9, w = 13) => { const s = Math.max(5, w - lift * 2), x0 = x + Math.floor((w - s) / 2); return Array.from({ length: s }, (_, i) => [x0 + i, 26, 's']); };

/* ---------- motion ----------
   Film a scene: fn(t) returns the layers at t ms. The loop is sampled every few milliseconds and a frame is cut wherever
   the picture changes, so easing lives in how long each pose holds. Frames shorter than minMs fold into the next */
const mEase = { inOut: p => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2, out: p => 1 - Math.pow(1 - p, 3), in: p => p * p * p,
  back: p => 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2) };
const mTween = (t, t0, t1, a, b, e = mEase.inOut) => t <= t0 ? a : t >= t1 ? b : a + (b - a) * e((t - t0) / (t1 - t0));
function mFilm(fn, total, minMs = 45) {
  const raw = [];
  for (let t = 0; t < total; t += 5) { const b = mDone([].concat(fn(t)).reduce((g, l) => mPut(g, l), mPic())), last = raw[raw.length - 1];
    if (last && last.b.join('') === b.join('')) last.ms += 5; else raw.push({ ms: 5, b }); }
  const out = [];
  raw.forEach((f, i) => { if (f.ms < minMs && i < raw.length - 1) raw[i + 1].ms += f.ms; else out.push(f); });
  if (out.length > 1 && out[out.length - 1].ms < minMs) out[out.length - 2].ms += out.pop().ms;
  return { frames: out };
}

/* ---------- effects: the shared vocabulary, so a sparkle is the same sparkle in every scene ----------
   Each takes a position (its centre or its foot) and a size or stage, and returns cells. */
/* a four-point sparkle: 0 a dot, 1 a plus, 2 a big star with a white heart */
const fxSparkle = (x, y, s = 1, tone = 'y') => s <= 0 ? [[x, y, tone === 'y' ? 'z' : tone]] : s === 1 ? [[x, y, 'w'], [x - 1, y, tone], [x + 1, y, tone], [x, y - 1, tone], [x, y + 1, tone]]
  : [[x, y, 'w'], [x - 1, y, 'z'], [x + 1, y, 'z'], [x, y - 1, 'z'], [x, y + 1, 'z'], [x - 2, y, tone], [x + 2, y, tone], [x, y - 2, tone], [x, y + 2, tone]];
/* a music note standing on (x, y): 'one' a quaver, 'two' two beamed quavers */
const fxNote = (x, y, kind = 'one') => mArt(kind === 'two' ? ['.yyyyy', '.y...y', '.y...y', 'yy..yy', 'YY..YY'] : ['..yY', '..y.Y', '..y', 'yyy', 'YY'], x, y - 4);
/* a puff of smoke or steam, sizes 1 to 3, and a lighter tone as it thins */
const fxPuff = (x, y, s = 2, thin = false) => { const a = thin ? 'm' : 'M', b = thin ? 'c' : 'm';
  return s <= 1 ? [[x, y, a]] : s === 2 ? [[x, y, b], [x + 1, y, a], [x, y + 1, a], [x + 1, y + 1, a]] : mArt(['.' + b + a, b + b + a + a, a + a + a + a, '.' + a + a], x - 1, y - 1); };
/* a sweat drop beside the head */
const fxSweat = (x, y) => mArt(['.l.', '.lw', 'lll', 'Ulu', '.U.'], x - 1, y);
/* a heart, 0 small or 1 full */
const fxHeart = (x, y, s = 1) => s ? mArt(['rr.rr', 'rrrrr', 'Rrrrr', '.Rrr.', '..R..'], x - 2, y - 2) : mArt(['r.r', 'rrr', '.R.'], x - 1, y - 1);
/* sleep: a small and a big z */
const fxZ = (x, y, big = false) => mArt(big ? ['lllll', '...l.', '..l..', '.l...', 'lllll'] : ['llll', '..l.', '.l..', 'llll'], x, y);
/* a burst of motion: short dashes behind something moving, in the direction it came from */
const fxDash = (x, y, len = 2, dir = -1, tone = 'm') => Array.from({ length: len }, (_, i) => [x + dir * i, y, tone]);
/* a point of surprise or alarm above the head: '!' or '?' */
const fxMark = (x, y, kind = '!', tone = kind === '!' ? 'r' : 'l') => (kind === '!' ? [[x, y], [x, y + 1], [x, y + 2], [x, y + 4]] : mArt(['.kk.', 'k..k', '..k.', '.k..', '....', '.k..'], x - 1, y)).map(([a, b]) => [a, b, tone]);

/* ---------- scenes ---------- */

/* Jamming: headphones on, eyes shut, lost in the music. The beat lands every 600 ms: the body dips a cell and the
   headphones follow a beat behind, the way a loose band settles on a bobbing head; one foot taps; on every beat a note
   leaves a cup and floats up and out, slowing as it goes, and fades to a dot. Use it for: waiting in a queue, a
   long job that runs in the background, hold music. */
const jamPhones = (bx, by) => mArt([
  '....UUUUUUUUU....',
  '..UUuuuuuuuuuUU..',
  '.Uu...........uU.',
  'UuU...........UuU',
  'Uul...........Uul',
  'Uuu...........Uuu',
  'UUU...........UUU'], bx - 2, by - 3);
const JAM_BEAT = 600;
const jamBob = t => { const p = ((t % JAM_BEAT) + JAM_BEAT) % JAM_BEAT; return p < 70 ? 0 : p < 230 ? 1 : 0; };
const jamNote = (t, k) => { /* the note born on beat k, from the right cup on even beats and the left on odd ones */
  const age = t - k * JAM_BEAT; if (age < 0 || age > 1300) return [];
  const p = mEase.out(age / 1300), side = k % 2 ? -1 : 1;
  const x = Math.round(side > 0 ? 24 + 3 * p : 5 - 3 * p), y = Math.round(17 - 11 * p);
  return age > 1100 ? [[x + 1, y - 2, 'y']] : fxNote(x, y, k % 4 === 2 ? 'two' : 'one');
};
const MSC_JAM = {
  mascot_jam: Object.assign(mFilm(t => {
    const bob = jamBob(t), beat = Math.floor(t / JAM_BEAT);
    const tap = (t % JAM_BEAT) < 230 && (t % JAM_BEAT) >= 70;
    return [mShadow(), ...[-1, 0, 1, 2, 3].map(k => jamNote(t + 2400 * (k < 0 ? 1 : 0), k < 0 ? 3 : k)),
      mascot({ y: 15 + bob, eyes: 'happy', blush: true, legs: bob ? (beat % 2 ? 'stepA' : 'stepB') : 'stand', arms: bob ? ['down', 'down'] : ['rest', 'rest'] }),
      jamPhones(9, 15 + bob)];
  }, 2400), {}),
};
const MSC_JAM_META = { mascot_jam: ['Jamming', 'Headphones on and eyes shut, it bobs to the beat while notes float out of the cups.', 'Use it for: waiting in a queue, a long background job, hold music.'] };

/* ---------- every scene, ready for the page: a sprite with its frames, its still pose and its loop length ---------- */
const MASCOT_SPRITES = {};
for (const [id, sp] of Object.entries({ ...MSC_JAM }))
  MASCOT_SPRITES[id] = Object.assign(sp, { mascot: true, N: MN, period: sp.frames.reduce((a, f) => a + f.ms, 0) / 1000 });
const MASCOT_META = { ...MSC_JAM_META };
if (typeof module !== 'undefined') module.exports = { MASCOT_SPRITES, MASCOT_META, MPAL };
