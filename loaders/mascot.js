/* PixelLoader mascot kit: one character, built from shared parts, so every scene looks like the same little creature.
   A scene is a list of frames; a frame is 32 rows of 32 palette letters, '.' is clear. Draw order is back to front:
   shadow, things behind, the mascot, things it holds, effects. */

const MN = 32;

/* the palette. Every colour has a job; a scene may only use these letters. Light comes from the top right, so each
   material has a base and a shade for its left and lower edges, and props get a darker contour where they meet
   something else; the ramps that dress the big props carry a fourth, deepest tone for that contour. The body never
   gets an outline or a highlight: it is a flat clay orange with one shade */
const MPAL = {
  o: '#EC8560', O: '#C4603E', d: '#9A4A31',             // body: base, shade (left and lower edges), deep (under arms, hidden legs)
  k: '#1E1A1D',                                           // ink: the eyes
  p: '#F4A98E',                                           // blush
  w: '#FFFDF8', c: '#EEE6DA', C: '#CDBFAE', T: '#A8927A',  // cream: chef hat, paper, pages, steam; T the page edges and gutter
  g: '#3A3538', G: '#232022', h: '#5C5559',              // charcoal: pan, laptop, lens rim
  b: '#7E5C49', B: '#513C31', n: '#A27D64', D: '#33241C',  // brown: wood, leather, the deerstalker; D its contour
  u: '#3563B5', U: '#1F3C78', l: '#5C8BDE',              // blue: headphones, the book cover
  y: '#F6C553', Y: '#D99A2B', z: '#FFE7A0', Z: '#A8641A',  // gold: sparkles, notes, food, stars, the hard hat; Z its contour
  i: '#8F86EA', v: '#5D5DBB', V: '#5A3A93', q: '#2D1F57',  // violet: the wizard hat, light, base, shade, contour
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

/* Jamming: headphones on (a padded band lit along its top, round cups with dark cushions against its head), eyes
   shut, lost in the music. The beat lands every 600 ms: the body dips a cell and the
   headphones follow a beat behind, the way a loose band settles on a bobbing head; one foot taps; on every beat a note
   leaves a cup and floats up and out, slowing as it goes, and fades to a dot. Use it for: waiting in a queue, a
   long job that runs in the background, hold music. */
const jamPhones = (bx, by) => mArt([
  '....UUUUUUUUU....',
  '..UUuuuuuuullUU..',
  '.Uuu.........luU.',
  'UuG...........GlU',
  'UuG...........GuU',
  'UuG...........GuU',
  '.UU...........UU.'], bx - 2, by - 3);
const JAM_BEAT = 600;
const jamBob = t => { const p = ((t % JAM_BEAT) + JAM_BEAT) % JAM_BEAT; return p < 70 ? 0 : p < 230 ? 1 : 0; };
const jamNote = (t, k) => { /* the note born on beat k, from the right cup on even beats and the left on odd ones */
  const age = t - k * JAM_BEAT; if (age < 0 || age > 1300) return [];
  const p = mEase.out(age / 1300), side = k % 2 ? -1 : 1;
  const x = Math.round(side > 0 ? 24 + 3 * p : 5 - 3 * p), y = Math.round(17 - 11 * p);
  return age > 1100 ? [[x + 1, y - 2, 'y']] : fxNote(x, y, k % 4 === 2 ? 'two' : 'one');
};
/* the picture at t ms into a filmed loop */
const jamAt = (film, t) => { let acc = 0, i = 0; while (i < film.frames.length - 1 && acc + film.frames[i].ms <= t) acc += film.frames[i++].ms; return film.frames[i].b; };
const jamFilm = mFilm(t => {
    const bob = jamBob(t), beat = Math.floor(t / JAM_BEAT);
    const tap = (t % JAM_BEAT) < 230 && (t % JAM_BEAT) >= 70;
    return [mShadow(), ...[-1, 0, 1, 2, 3].map(k => jamNote(t + 2400 * (k < 0 ? 1 : 0), k < 0 ? 3 : k)),
      mascot({ y: 15 + bob, eyes: 'happy', blush: true, legs: bob ? (beat % 2 ? 'stepA' : 'stepB') : 'stand', arms: bob ? ['down', 'down'] : ['rest', 'rest'] }),
      jamPhones(9, 15 + bob)];
  }, 2400);
/* the still: mid-bob with a note in the air on each side */
const MSC_JAM = { mascot_jam: Object.assign(jamFilm, { still: jamAt(jamFilm, 1400) }) };
const MSC_JAM_META = { mascot_jam: ['Jamming', 'Headphones on and eyes shut, it bobs to the beat while notes float out of the cups.', 'Use it for: waiting in a queue, a long background job, hold music.'] };

/* Mascot scenes, set A: Cooking, Magic, Building. Built only from kit.js; every helper here is prefixed 'ma'. */

/* where the body actually is for a given set of mascot options, mirroring mascot() in the kit: its top left, width,
   the right shoulder (the body cell at arm row) and the centre column. Props use it so they stay attached on a squash */
const maBody = (o = {}) => {
  const sq = o.squash || 0, x = o.x ?? 9, y = o.y ?? 15;
  const bx = x - (sq > 0 ? 1 : sq < 0 ? -1 : 0), by = y + (sq > 0 ? 1 : sq < 0 ? -1 : 0), W = 13 + (sq > 0 ? 2 : sq < 0 ? -2 : 0);
  return { bx, by, W, sx: bx + W - 1, sy: by + 5 - (sq > 0 ? 1 : 0), cx: bx + (W >> 1) };
};
/* a hat sits with its lowest row on body top minus 1, centred on the body (off moves it sideways); a hat whose
   last row is its contour sinks one row, so that row rests on the top of the head */
const maHat = (rows, o, off = 0, sink = 0) => { const b = maBody(o); return mArt(rows, b.cx - (rows[0].length >> 1) + off, b.by - rows.length + sink); };
/* a right arm as cells from the shoulder, and the hand: the last top cell of the arm */
const maHand = (o, arm) => { const b = maBody(o), top = arm.filter(c => c[2] === 'o'), h = top[top.length - 1]; return [b.sx + h[0], b.sy + h[1]]; };
/* keep a layer inside the safe area x 1..30, y 2..29 */
const maClip = cells => cells.filter(([x, y]) => x >= 1 && x <= 30 && y >= 2 && y <= 29);
/* the frame at a given time, so a hero still can be cut from the same film */
const maAt = (fn, t) => mDone([].concat(fn(t)).reduce((g, l) => mPut(g, l), mPic()));

/* ---------- Cooking ----------
   A pan toss. The chef holds a pan out to its right with a pancake in it. Its eyes drop to the pan first, then the
   pan dips (the wind up, the body sinks a cell with it), flicks up with its far lip raised, and the pancake leaves.
   It rises on a real arc, turning over as it goes, while the eyes ride up with it and come back down a beat before it
   lands. The pan catches it with a little give: the pancake squashes flat for two frames and a puff of steam rolls up.
   The reaction is a happy blink with a blush and a small hop. The rest of the loop is idle: a breath, a plain blink,
   a thin wisp of steam. The mascot stands 3 cells left so the pan has room on the right. */
const MA_CX = 5;
/* the toque: three puffs of starched cotton, each lit at its top right and shaded underneath, a crease where they meet
   the band, and a pleated band. Cream with a smoke contour so it reads on a white page */
const MA_CHEF = [
  '...mmm..mmm....',
  '..mcwwm.mcwwm..',
  '.mcccwwmccwwwm.',
  'mccccccccccwwwm',
  'mCcccccccccccwm',
  '.mCCcccccccccm.',
  '..mmmmmmmmmmm..',
  '..mcCcCcCcCwm..',
  '..mcCcCcCcCwm..',
  '..mmmmmmmmmmm..'];
/* the skillet from the side: a rim lit along its top with a glint, a charcoal body that darkens to its base, a rivet
   where the wooden handle joins */
const MA_PAN = [
  '....Ghhhhwh',
  'Bnbmggggggg',
  '.....GggggG',
  '......GGGG.'];
/* the pan held at hand (hx, hy): its handle starts one cell right of the hand. tilt lifts (-1) or drops (+1) the far half */
const maPan = (hx, hy, tilt = 0) => mArt(MA_PAN, hx + 1, hy - 1).map(([x, y, c]) => [x, y + (x >= hx + 8 ? tilt : 0), c]);
/* right arm poses for the pan: held level, dipped, the toss (pan tilted up), and the peak it follows through to */
const MA_ARM_HOLD = [[1, 0, 'o'], [2, 0, 'o'], [1, 1, 'O'], [2, 1, 'O']];
const MA_ARM_DIP = [[1, 0, 'o'], [2, 1, 'o'], [1, 1, 'O'], [2, 2, 'O']];
const MA_ARM_TOSS = [[1, 0, 'o'], [2, -1, 'o'], [1, 1, 'O'], [2, 0, 'O']];
const MA_ARM_PEAK = [[1, -1, 'o'], [2, -2, 'o'], [1, 0, 'O'], [2, -1, 'O']];
/* the pancake turning over in the air: side on, tipped, face on (a round disc), tipped back. Gold, lit top right */
const MA_CAKE = [
  ['yyyyz', 'YYYYY'],
  ['..yyz', 'ybyyY', 'YYYY.'],
  ['.yyz.', 'ybyyz', 'Yyyby', '.YYY.'],
  ['yyz..', 'Yyyby', '.YYYY']];
const maCake = (cx, cy, k) => { const a = MA_CAKE[k]; return mArt(a, cx - (a[0].length >> 1), cy - (a.length >> 1)); };
const MA_COOK_T = 2600, MA_UP = 790, MA_DOWN = 1490;
/* the pancake's centre in flight, p from 0 (leaves the pan) to 1 (back in it) */
const maCakePos = t => { const p = (t - MA_UP) / (MA_DOWN - MA_UP); return [26 - Math.round(Math.sin(p * Math.PI) * 1.4), Math.round(17 + 2 * p - 13 * 4 * p * (1 - p))]; };
function maCook(t) {
  const L = [];
  /* the body: a sink for the dip, a sink on the catch, a hop of joy, a breath */
  let y = 15, legs = 'stand', arm = MA_ARM_HOLD, tilt = 0;
  if (t >= 520 && t < 770) { y = 16; legs = 'crouch'; arm = MA_ARM_DIP; }
  else if (t >= 770 && t < 830) { arm = MA_ARM_TOSS; tilt = -1; }
  else if (t >= 830 && t < 930) { arm = MA_ARM_PEAK; }
  else if (t >= MA_DOWN && t < MA_DOWN + 110) { y = 16; legs = 'crouch'; arm = MA_ARM_DIP; }
  else if (t >= 1760 && t < 1900) { y = 14; }
  else if (t >= 2330 && t < 2480) { y = 16; legs = 'crouch'; }
  const o = { x: MA_CX, y, legs, arms: ['rest', arm] };
  /* the eyes: idle ahead, down to the pan before the dip, then they ride with the pancake, a beat ahead of it */
  let look = [0, 0], eyes = 'open', blush = false;
  if (t >= 380 && t < 790) look = [1, 1];
  else if (t >= 790 && t < MA_DOWN + 200) { const ahead = Math.min(t + 90, MA_DOWN), cy = maCakePos(ahead)[1]; look = cy < 11 ? [1, -1] : cy < 16 ? [1, 0] : [1, 1]; }
  if (t >= 160 && t < 260) eyes = 'blink';
  if (t >= 1690 && t < 1760) { eyes = 'closed'; blush = true; }
  else if (t >= 1760 && t < 2200) { eyes = 'happy'; blush = true; }
  o.eyes = eyes; o.look = eyes === 'open' ? look : [0, 0]; o.blush = blush;
  const [hx, hy] = maHand(o, arm);
  L.push(mShadow(y < 15 ? 1 : 0, MA_CX));
  /* steam: a thin wisp in the idle, two puffs on the catch. Each rises, thins and shrinks to a dot */
  const puff = (t0, x0, life, big) => { const a = t - t0; if (a < 0 || a > life) return [];
    const p = mEase.out(a / life), x = Math.round(x0 + (big ? 2 * Math.sign(x0 - 26) * p : p)), yy = Math.round(hy - 3 - 5 * p);
    return fxPuff(x, yy, big ? (p < 0.6 ? 2 : 1) : p < 0.45 ? 2 : 1, true); };
  L.push(puff(MA_DOWN + 30, 24, 600, true), puff(MA_DOWN + 90, 28, 560, true), puff(2150, 26, 600, false), puff(2150 - MA_COOK_T, 26, 600, false));
  L.push(mascot(o), maHat(MA_CHEF, o), maPan(hx, hy, tilt));
  /* the pancake: in the pan, in the air turning over, squashed flat on the catch */
  const cy = hy - 2;
  if (t < MA_UP) L.push(mArt(['yyyyz'], hx + 6, cy));
  else if (t < MA_DOWN) { const [x, yy] = maCakePos(t), k = Math.floor(((t - MA_UP) / (MA_DOWN - MA_UP)) * 4.6) % 4; L.push(maCake(x, yy, k)); }
  else if (t < MA_DOWN + 100) L.push(mArt(['Yyyyyyz'], hx + 5, cy));
  else L.push(mArt(['yyyyz'], hx + 6, cy));
  return L.map(maClip);
}

/* ---------- Magic ----------
   A spell. The wizard holds its wand up at its right, the tip glinting. Its eyes go to the tip first, then it winds
   the wand back, raising it high as it leans away and sinks a cell, squinting hard while the tip gathers a spark. It snaps the wand
   forward past the star and back to point at it: the body lunges a cell, and the bent tip of the hat lags behind, drooping, then swings past and settles.
   A sparkle shoots off the wand tip on a curve with two dots trailing behind it, and blooms into a big star that
   throws off three specks. The reaction is happy eyes and a blush while the star twinkles and fades. The mascot
   stands 2 cells left so the wand and the star have room on the right. */
const MA_MX = 7;
/* the hat in two parts so its tip can swing. The cone is violet, lit down its right side with a fold down its front,
   and leans a little to the left; a red band curves round its foot; the brim is wide and seen a little from above,
   dark on its left, lit along its right rim, with a deep contour all round. Its last row sits on the top of the head.
   Then the bent tip, which hooks over to the left: it lags, droops and lifts with the flick */
const MA_WIZ = [
  '....qVvviq.......',
  '....qVVvviq......',
  '....qVVvvviq.....',
  '...qVVVvvvviq....',
  '..qVVRRRrrrrqq...',
  '.qVVvVVRRRrrvviq.',
  'qVVVvvvvvvvvvviiq',
  'qVVvvvvvvvvvvvviq',
  '.qqqVvvvvvvvviqq.',
  '....qqqqqqqqqq...'];
const MA_WIZ_TIP = {
  rest: ['..qqqqq...', '.qVvvviq..', '.qVqqVviq.', '..q.......'],
  droop: ['..........', '...qqqqq..', '..qVvvViq.', '.qVq......', '.qq.......'],
  lift: ['..qq......', '..qViq....', '...qVviq..'] };
const maWizHat = (o, tip) => { const b = maBody(o), x = b.cx - 8, y = b.by - 12;
  return [...mArt(MA_WIZ, x, y + 3), ...mArt(MA_WIZ_TIP[tip], x, y)]; };
/* arm poses for the wand: held up, raised high, snapped straight out, and pointing at the star */
const MA_ARM_WAND = [[1, 0, 'o'], [2, -1, 'o'], [1, 1, 'O'], [2, 0, 'O']];
const MA_ARM_BACK = M_ARMS.up;
const MA_ARM_OUT = M_ARMS.out;
const MA_ARM_POINT = [[1, 0, 'o'], [2, 0, 'o'], [3, -1, 'o'], [1, 1, 'O'], [2, 1, 'O'], [3, 0, 'O']];
/* the wand from the hand: a dark wooden grip, a brown shaft lit toward the end, and a glowing gold tip. Returns [cells, tip] */
const MA_WAND = {
  up: [[1, -1, 'B'], [2, -2, 'b'], [3, -3, 'b'], [4, -4, 'n'], [5, -5, 'z']],
  back: [[0, -1, 'B'], [0, -2, 'b'], [0, -3, 'b'], [0, -4, 'n'], [0, -5, 'z']],
  out: [[1, 0, 'B'], [2, 0, 'b'], [3, -1, 'b'], [4, -1, 'n'], [5, -2, 'z']],
};
const maWand = (hx, hy, k, glint) => { const c = MA_WAND[k].map(([dx, dy, t]) => [hx + dx, hy + dy, t]), tip = c[c.length - 1];
  if (glint) tip[2] = 'w'; return [c, [tip[0], tip[1]]]; };
const MA_MAGIC_T = 2800, MA_FLICK = 900, MA_BLOOM = 1330;
const MA_STAR = [25, 6];
/* the spark's path from the wand tip to the bloom: a curve that swings out to the right */
const maSpark = (p, from) => { const [x0, y0] = from, [x2, y2] = MA_STAR, x1 = 30, y1 = 12, q = 1 - p;
  return [Math.round(q * q * x0 + 2 * q * p * x1 + p * p * x2), Math.round(q * q * y0 + 2 * q * p * y1 + p * p * y2)]; };
function maMagic(t) {
  const L = [];
  let x = MA_MX, y = 15, legs = 'stand', arm = MA_ARM_WAND, wand = 'up', tip = 'rest';
  if (t >= 520 && t < MA_FLICK) { x = MA_MX - 1; y = 16; legs = 'crouch'; arm = MA_ARM_BACK; wand = 'back'; if (t < 600) tip = 'lift'; }
  else if (t >= MA_FLICK && t < MA_FLICK + 50) { arm = MA_ARM_POINT; wand = 'up'; tip = 'droop'; }
  else if (t >= MA_FLICK + 50 && t < MA_FLICK + 110) { x = MA_MX + 1; arm = MA_ARM_OUT; wand = 'out'; tip = 'droop'; }
  else if (t >= MA_FLICK + 110 && t < 2150) { arm = MA_ARM_POINT; wand = 'up'; if (t < MA_FLICK + 230) { x = MA_MX + 1; tip = 'droop'; } else if (t < MA_FLICK + 360) tip = 'lift'; }
  else if (t >= 2480 && t < 2630) { y = 16; legs = 'crouch'; }
  const o = { x, y, legs, arms: ['rest', arm] };
  /* the eyes: on the tip before the wind up, squinting through it, then riding with the spark to the star */
  let eyes = 'open', look = [0, 0], blush = false;
  if (t >= 420 && t < 560) look = [1, -1];
  else if (t >= 560 && t < MA_FLICK) eyes = 'squint';
  else if (t >= MA_FLICK && t < MA_BLOOM + 80) look = [1, -1];
  else if (t >= MA_BLOOM + 80 && t < 2150) { eyes = 'happy'; blush = true; }
  else if (t >= 2150 && t < 2300) look = [1, -1];
  if (t >= 200 && t < 300) eyes = 'blink';
  Object.assign(o, { eyes, look: eyes === 'open' ? look : [0, 0], blush });
  const [hx, hy] = maHand(o, arm);
  const [wc, wt] = maWand(hx, hy, wand, (t % 400) < 120 && (t < 520 || t > 2300));
  L.push(mShadow(0, x));
  L.push(mascot(o), maWizHat(o, tip), wc);
  /* the tip gathers a spark while it is wound back */
  if (t >= 700 && t < MA_FLICK) L.push(fxSparkle(wt[0], wt[1] - 1, t < 800 ? 0 : 1));
  /* the spark and its trail, then the star: it pops, twinkles, shrinks to a dot and is gone */
  const from = [26, 14];
  if (t >= MA_FLICK + 40 && t < MA_BLOOM) {
    const at = d => mEase.out(Math.max(0, Math.min(1, (t - d - MA_FLICK - 40) / (MA_BLOOM - MA_FLICK - 40))));
    const [ax, ay] = maSpark(at(0), from), [bx, by] = maSpark(at(70), from), [cx, cy] = maSpark(at(140), from);
    if (t - MA_FLICK - 40 > 140) L.push(fxSparkle(cx, cy, 0, 'Y'));
    if (t - MA_FLICK - 40 > 70) L.push(fxSparkle(bx, by, 0, 'Y'));
    L.push(fxSparkle(ax, ay, 1));
  }
  const sa = t - MA_BLOOM, [sx, sy] = MA_STAR;
  if (sa >= 0 && sa < 950) L.push(fxSparkle(sx, sy, sa < 60 ? 1 : sa < 420 ? 2 : sa < 520 ? 1 : sa < 680 ? 2 : sa < 800 ? 1 : 0));
  if (sa >= 60 && sa < 360) { const p = mEase.out((sa - 60) / 300), d = Math.round(2 + 2 * p);
    for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1]]) L.push(fxSparkle(sx + dx * d, sy + dy * d, 0, 'Y')); }
  return L.map(maClip);
}
/* ---------- Building ----------
   Nailing a plank. A board lies on the ground at its right with nails standing along it, one every 5 cells. The
   builder grips its claw hammer in a fist and holds it a cell above the nail to aim, eyes on it. The hammer lifts high (it leans back a cell),
   swings down through a half-way frame and lands: the body squashes, the board dents under the blow, a spark flies and the nail
   sinks halfway. It aims again, lifts, and the second blow drives the nail flush with a puff of sawdust either side.
   The proud look: eyes shut, a blush, the hammer held up like a trophy while the nail head glints. Then its eyes go
   to the next nail and the board slides one nail along, so the loop ends where it began with one more nail done.
   The mascot stands 3 cells left to leave the board room. */
const MA_BX = 6, MA_NAIL = 24, MA_GAP = 5;
/* the hard hat: a gold dome with a raised ridge down its middle (dark on its left, lit on its right, with a bright
   specular near the top), lit on its right, a band where the dome meets the brim, and a deep brim that runs all the
   way round, lit along its top and right and dark underneath. A deep amber contour holds it together on any page.
   Its last row sits on the top of the head */
const MA_HARD = [
  '......ZZZ......',
  '....ZZYzZZZ....',
  '...ZyyYzwzzZ...',
  '..ZYyyYzyzzzZ..',
  '.ZYyyyYzyyyzzZ.',
  '.ZYyyyYzyyyyzZ.',
  'ZZZZZZZZZZZZZZZ',
  'ZyyyyyyyyyzzzwZ',
  '.ZYYYYYYYYYYYZ.',
  '..ZZZZZZZZZZZ..'];
/* a right arm from the shoulder to a hand cell, as a staircase one cell per column: clay on top, shade underneath.
   The hand may rise or drop at most one row per column, like the kit's own arms */
const maArmTo = (o, hx, hy) => { const b = maBody(o), dx = hx - b.sx, dy = hy - b.sy, c = [];
  for (let i = 1; i <= dx; i++) { const yy = Math.round(dy * i / dx); c.push([i, yy, 'o'], [i, yy + 1, 'O']); }
  return c; };
/* the hammer, one shape at three angles, always gripped by a fist at (hx, hy): a charcoal head lit at its top right
   with a steel glint, so it never mixes with the nails, and a wooden handle running light to dark from the head down to
   a red rubber grip at the fist.
   'strike': the handle level and the head standing on its end, face down. 'up': the handle upright over the fist and
   the head across its top, face toward the nail. 'swing': half way, handle and head at 45 degrees */
const maHammer = (hx, hy, k) => {
  const fist = [[hx, hy, 'o'], [hx - 1, hy, 'o'], [hx, hy + 1, 'O'], [hx - 1, hy + 1, 'O']];
  if (k === 'strike') return [[hx + 1, hy, 'R'], [hx + 2, hy, 'b'], [hx + 3, hy, 'b'], [hx + 4, hy, 'n'], ...mArt(['G.', 'Gh', 'gw', 'gh', 'GG'], hx + 5, hy - 3), ...fist];
  if (k === 'up') return [[hx, hy - 1, 'R'], [hx, hy - 2, 'b'], [hx, hy - 3, 'b'], [hx, hy - 4, 'n'], ...mArt(['GGghw', '.GggG'], hx - 2, hy - 6), ...fist];
  return [[hx + 1, hy - 1, 'R'], [hx + 2, hy - 2, 'b'], [hx + 3, hy - 3, 'b'], [hx + 4, hy - 4, 'n'], ...mArt(['.Gw', 'Ggh', '.gG'], hx + 4, hy - 7), ...fist];
};
/* a nail with its shank at x and its head on row r; it sinks as r grows, flush at row 22 */
const maNail = (x, r) => [[x - 1, r, 'M'], [x, r, 'm'], [x + 1, r, 'w'], ...Array.from({ length: Math.max(0, 22 - r) }, (_, j) => [x, r + 1 + j, 'M'])];
/* the board on the ground, rows 23 to 25, slid s cells left: a lit top face, a grain line with knots, a dark edge.
   dent drops its top a row under a blow at that x */
const maPlank = (s, dent) => { const c = [];
  for (let x = 17; x <= 30; x++) { const u = ((x + s) % MA_GAP + MA_GAP) % MA_GAP, d = dent != null && Math.abs(x - dent) <= 1 ? 1 : 0;
    c.push([x, 25, 'B'], [x, 26, 's']); if (d) c.push([x, 24, 'B']); else c.push([x, 23, x === 17 ? 'B' : 'n'], [x, 24, u === 3 ? 'B' : 'b']); }
  return c; };
const MA_BUILD_T = 2800, MA_HIT1 = 560, MA_HIT2 = 1180, MA_SLIDE = 2120;
function maBuild(t) {
  const L = [];
  /* the board: it slides one nail along after the proud look, so the loop closes on the same picture */
  const s = Math.round(mTween(t, MA_SLIDE, MA_SLIDE + 380, 0, MA_GAP));
  /* the current nail's head row: standing 20, half in 21, flush 22 */
  const head = t < MA_HIT1 ? 20 : t < MA_HIT2 ? 21 : 22;
  let x = MA_BX, y = 15, legs = 'stand', squash = 0, pose = 'aim', dent = null, eyes = 'open', look = [1, 1], blush = false;
  const lift = (a, b) => t >= a && t < b;
  if (lift(260, MA_HIT1 - 60) || lift(880, MA_HIT2 - 60)) { pose = 'up'; x = MA_BX - 1; }
  else if (lift(MA_HIT1 - 60, MA_HIT1) || lift(MA_HIT2 - 60, MA_HIT2)) pose = 'swing';
  else if (lift(MA_HIT1, MA_HIT1 + 110) || lift(MA_HIT2, MA_HIT2 + 110)) { pose = 'aim'; dent = MA_NAIL; if (lift(MA_HIT1, MA_HIT1 + 60) || lift(MA_HIT2, MA_HIT2 + 60)) squash = 1; }
  else if (lift(MA_HIT1 + 110, MA_HIT1 + 220) || lift(MA_HIT2 + 110, MA_HIT2 + 220)) pose = 'recoil';
  else if (lift(1500, MA_SLIDE + 420)) pose = 'proud';
  if (lift(1500, 1960)) { eyes = 'closed'; blush = true; }
  else if (lift(1960, MA_SLIDE + 300)) look = [1, 0];
  if (lift(100, 200)) eyes = 'blink';
  if (lift(2580, 2720)) { y = 16; legs = 'crouch'; }
  const o = { x, y, legs, squash, eyes, look: eyes === 'open' ? look : [0, 0], blush };
  /* hand positions: aim puts the hammer face on the nail head; up raises it; swing is half way down */
  /* once the board has slid, the nail under the hammer is the next one, still standing */
  const aimAt = t >= MA_SLIDE + 380 ? 20 : head;
  /* the fist: striking, the head's face sits on the nail head (or on it as it lands); raised, the hammer is up beside
     the brim of the hat, clear of it; swinging, half way between */
  const b = maBody(o), hand = pose === 'aim' ? [MA_NAIL - 5, aimAt - 3 + (dent != null ? 1 : 0)] : pose === 'recoil' ? [MA_NAIL - 5, head - 4]
    : pose === 'up' || pose === 'proud' ? [b.sx + 4, b.sy - 2] : [b.sx + 3, b.sy - 1];
  const arm = maArmTo(o, hand[0] - 1, hand[1]);
  o.arms = ['rest', arm];
  const hk = pose === 'aim' || pose === 'recoil' ? 'strike' : pose === 'up' || pose === 'proud' ? 'up' : 'swing';
  L.push(maPlank(s, dent));
  for (let k = -1; k <= 2; k++) { const nx = MA_NAIL + k * MA_GAP - s, r = k < 0 ? 22 : k === 0 ? head : 20; if (nx >= 18 && nx <= 29) L.push(maNail(nx, r)); }
  L.push(mShadow(0, x), mascot(o), maHat(MA_HARD, o, 0, 1), maHammer(hand[0], hand[1], hk));
  /* effects: a spark at each blow, sawdust on the second, a glint on the finished nail */
  const sp = (t0, xx, yy) => { const a = t - t0; return a >= 0 && a < 200 ? fxSparkle(xx, yy, a < 110 ? 1 : 0) : []; };
  L.push(sp(MA_HIT1, 27, 19), sp(MA_HIT2, 27, 20));
  const dust = (dir) => { const a = t - MA_HIT2; if (a < 0 || a > 380) return []; const p = mEase.out(a / 380);
    return dir < 0 ? fxPuff(MA_NAIL - 3 - Math.round(1.5 * p), 21, p < 0.5 ? 2 : 1, true) : fxPuff(MA_NAIL + 2 + Math.round(2 * p), Math.round(21 - 2 * p), p < 0.5 ? 2 : 1, true); };
  L.push(dust(-1), dust(1));
  const g = t - 1560; if (g >= 0 && g < 360) L.push(fxSparkle(MA_NAIL + 2, 20, g < 120 ? 0 : g < 260 ? 1 : 0));
  return L.map(maClip);
}
const MSC_A = {
  mascot_cook: Object.assign(mFilm(maCook, MA_COOK_T), { still: maAt(maCook, 1130) }),
  mascot_magic: Object.assign(mFilm(maMagic, MA_MAGIC_T), { still: maAt(maMagic, MA_BLOOM + 150) }),
  mascot_build: Object.assign(mFilm(maBuild, MA_BUILD_T), { still: maAt(maBuild, MA_HIT2 + 30) }),
};
const MSC_A_META = {
  mascot_cook: ['Cooking', 'A little chef dips its pan, flicks a pancake high into the air, follows it with its eyes and catches it in a puff of steam.', 'Use it for: generating, cooking something up, a result being prepared.'],
  mascot_magic: ['Magic', 'A little wizard winds its wand back, squints, and flicks a trail of sparkles that blooms into a big star.', 'Use it for: generating, something being conjured, a creative result on its way.'],
  mascot_build: ['Building', 'A little builder in a hard hat drives a nail home in two good blows, beams with pride, and slides the board along to the next one.', 'Use it for: building, compiling, deploying, anything assembled step by step.'],
};

/* ---------- shared helpers for this file ---------- */
/* the body geometry the kit uses, so props can hang off the real shoulder and the real top of the head */
const mbBody = (x, y, sq = 0) => { const bx = x - (sq > 0 ? 1 : sq < 0 ? -1 : 0), by = y + (sq > 0 ? 1 : sq < 0 ? -1 : 0), W = 13 + (sq > 0 ? 2 : sq < 0 ? -2 : 0);
  return { bx, by, W, sx: bx + W - 1, ay: by + 5 - (sq > 0 ? 1 : 0) }; };
/* one picture of a film, for the still */
const mbAt = (fn, t) => mDone([].concat(fn(t)).reduce((g, l) => mPut(g, l), mPic()));

/* ---------- Detective (state: searching) ----------
   A deerstalker on its head (an ear flap tied up with a bow, peaks front and back), it holds a magnifying
   glass right up to its right eye, and we see that eye through the
   glass: big, round, with a catchlight, the way a magnifier blows up whatever is behind it. The other eye squints. It
   searches by leaning one way and the other while the big eye darts ahead of it, then ducks to peer at the floor. Then
   it finds it: the big eye pops taller, the squint springs open under a raised brow, it jumps a little and a glint
   flares off the rim. It holds the look, settles, and goes back to searching. The glass and the eye behind it are the
   whole idea, so they move with the face every frame. */
/* the deerstalker, turned a little to its right: a round tweed crown with a soft highlight on its right, the ear
   flap folded up against its left side (darker, with its edge drawn) and tied with a little bow on top, the front
   peak jutting out to the right, lit on top, and the back peak under the flap on the left. A deep brown contour runs
   round it. Its last row is the underside of the front peak, which hangs beside the head */
const mbHat = [
  '.......DD.......',
  '......DbnD......',
  '....DDBDDDDD....',
  '...DBBDbnnnnD...',
  '..DBBBDbbnnnnD..',
  '..DBBBDbbbbnbD..',
  '.DBBBBDbbbbbbbD.',
  '.DBBBDbbbbbbbnnD',
  'DDDDDDDDDDDnnnnD',
  '...........DDDD.'];
const mbHatAt = (x, y, sq = 0) => mArt(mbHat, mbBody(x, y, sq).bx - 2 + (sq > 0 ? 1 : sq < 0 ? -1 : 0), mbBody(x, y, sq).by - mbHat.length + 1);
/* the glass over the right eye: a round charcoal rim, lit at the top right and dark at the bottom left, a pale lens
   that shows the clay behind it lighter, a two-cell glint, a steel collar, and a wooden handle leaving the bottom
   right where the hand holds it. (cx, cy) is the centre of the lens */
const MB_RIM = [
  '..ggh..',
  '.g...h.',
  'g.....h',
  'g.....g',
  'G.....g',
  '.G...g.',
  '..GGg..'];
const mbGlass = (cx, cy, glint = 0) => {
  const c = mArt(MB_RIM, cx - 3, cy - 3);
  for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (Math.abs(x) + Math.abs(y) < 4) c.unshift([cx + x, cy + y, 'p']);
  c.push([cx + 1, cy - 2, 'w'], [cx + 2, cy - 1, 'w']);
  if (glint) c.push(...fxSparkle(cx + 5, cy - 2, glint));
  c.push([cx + 3, cy + 3, 'm'], [cx + 4, cy + 4, 'n'], [cx + 5, cy + 5, 'b'], [cx + 6, cy + 6, 'B']);
  return c;
};
/* the eye seen through the glass, magnified: 'open' two wide and three tall with a catchlight, 'wide' a row taller,
   'blink' a two-cell lid. It keeps a clear cell from the rim: dx 0 looks left, 1 looks right */
const mbBigEye = (cx, cy, kind, dx = 0) => {
  const x = cx - 1 + dx, y = cy - 1;
  if (kind === 'blink') return [[x, y + 2, 'k'], [x + 1, y + 2, 'k']];
  if (kind === 'wide') return mArt(['kw', 'kk', 'kk', 'kk'], x, y - 1);
  return mArt(['kw', 'kk', 'kk'], x, y);
};
const MB_FIND = 1400;
const mbDetective = t => {
  /* look left, then step right (the eye leads), duck to peer at the floor, find it: the eyes go wide first, then an
     arc up off the ground and a squash on landing, a held look, a blink to settle, and two steps back to the start */
  let x = 6, y = 15, legs = 'stand', sq = 0, eye = 'open', dx = 0, left = 'squint', glint = 0, lift = 0;
  const at = (a, b) => t >= a && t < b;
  if (t >= 470) dx = 1;                                                   /* the eye leads the steps */
  if (at(560, 660)) { x = 7; legs = 'stepA'; } else if (at(660, 760)) x = 7;
  else if (at(760, 860)) { x = 8; legs = 'stepB'; } else if (t >= 860) x = 8;
  if (at(1000, MB_FIND + 80)) { y = 16; legs = 'crouch'; dx = t < 1200 ? 1 : 0; }   /* duck to peer at the floor */
  if (at(300, 400) || at(1220, 1300)) eye = 'blink';
  if (t >= MB_FIND && t < 2200) { eye = 'wide'; left = 'wide'; dx = 1; }  /* found it: the eyes first */
  if (at(MB_FIND + 80, MB_FIND + 140)) { y = 15; sq = -1; lift = 1; }      /* the arc up */
  else if (at(MB_FIND + 140, MB_FIND + 200)) { y = 14; legs = 'air'; lift = 1; }
  else if (at(MB_FIND + 200, MB_FIND + 320)) { y = 13; legs = 'air'; lift = 2; }
  else if (at(MB_FIND + 320, MB_FIND + 380)) { y = 14; legs = 'air'; lift = 1; }
  else if (at(MB_FIND + 380, MB_FIND + 460)) { sq = 1; legs = 'crouch'; }  /* and down */
  if (at(MB_FIND + 140, MB_FIND + 520)) glint = t < MB_FIND + 220 ? 1 : t < MB_FIND + 400 ? 2 : 1;
  if (at(2200, 2290)) { eye = 'blink'; left = 'blink'; dx = 1; }            /* a blink to settle */
  if (t >= 2290) { eye = 'open'; left = 'squint'; dx = t < 2380 ? 1 : 0; }  /* and the eye looks left first */
  if (at(2450, 2550)) { x = 7; legs = 'stepB'; } else if (at(2550, 2650)) x = 7;
  else if (at(2650, 2750)) { x = 6; legs = 'stepA'; } else if (t >= 2750) x = 6;
  const b = mbBody(x, y, sq), cx = b.bx + 10, cy = b.by + 3;
  return [mShadow(lift, x), mascot({ x, y, legs, squash: sq, eyes: [left, 'open'], arms: ['rest', 'rest'] }),
    mbHatAt(x, y, sq), mbGlass(cx, cy, glint), mbBigEye(cx, cy, eye, dx)];
};

/* ---------- Bug hunt (state: debugging) ----------
   A tiny green beetle scuttles in from the right, pauses, and stops just in front of the mascot. The mascot's eyes are
   on it the whole way; they narrow as it locks on, it crouches and wiggles like a cat (the anticipation), and with
   its eyes wide it stretches off the ground and pounces with both paws up. At the top of the arc the beetle bolts, straight under the mascot, which
   lands in a squash with its eyes squeezed shut. A happy blink (got it!), a peek underneath, then its eyes shrink to
   dots and a question mark pops up as it looks right and left: nothing. It shuffles back in a huff, squinting the
   wrong way while the beetle wanders back in from the other side, which starts the hunt again. Debugging is a chase,
   and the joke is the near miss. */
/* a beetle facing left: a feeler, a dark head, a round green shell with its contour and a glint, and legs that tick
   between two poses */
const mbBugF = [['G..EE.', '.GEewE', '.GEeeE', '..G.G.'], ['G..EE.', '.GEewE', '.GEeeE', '.G.G.G']];
const mbBug = (x, ph) => mArt(mbBugF[ph & 1], x, 22);
/* where the bug is at time t: it scuttles in from the right edge with a pause, waits, then darts left in 50 ms hops */
const MB_HUNT = 3200;
const mbBugAt = t => {
  if (t >= 1260 && t < 1610) { const k = Math.floor((t - 1260) / 50), x = [18, 14, 10, 6, 2, -2, -6][k];
    return { x, ph: k, dash: k >= 1 }; }
  if (t >= 1610 && t < 2900) return null;
  const te = (t + 300) % MB_HUNT;                                /* the entrance clock starts at 2900 */
  if (te < 300) return { x: 31 - Math.floor(te / 60), ph: Math.floor(te / 60) };
  if (te < 440) return { x: 26, ph: 0 };                        /* a pause, as bugs do */
  if (te < 800) { const k = Math.floor((te - 440) / 60) + 1; return { x: 26 - k, ph: k }; }
  return { x: 20, ph: 0 };
};
const mbHunt = t => {
  let x = 6, y = 15, legs = 'stand', sq = 0, eyes = 'open', look = [1, 1], brows = null, arms = ['rest', 'rest'], lift = 0, blush = false;
  if (t >= 640 && t < 1100) eyes = 'squint';                                        /* it locks on */
  if (t >= 700 && t < 1100) { y = 16; legs = 'crouch'; x = [6, 5, 6, 5, 6][Math.floor((t - 700) / 80)]; }   /* crouch and wiggle */
  if (t >= 1100 && t < 1160) { sq = -1; arms = ['up', 'up']; eyes = 'wide'; }       /* take-off */
  if (t >= 1160 && t < 1400) {                                                       /* the pounce */
    const p = (t - 1160) / 240; x = 6 + Math.round(5 * mEase.out(p)); y = 15 - Math.round(4 * Math.sin(Math.PI * p)); lift = 15 - y;
    legs = 'air'; arms = ['up', 'up']; eyes = 'wide'; if (t < 1210) sq = -1; }
  if (t >= 1400 && t < 2300) x = 11;
  if (t >= 1400 && t < 1500) { sq = 1; eyes = 'closed'; arms = ['out', 'out']; }    /* splat */
  if (t >= 1500 && t < 1660) { eyes = 'happy'; blush = true; look = [0, 0]; }       /* got it! */
  if (t >= 1660 && t < 1800) { eyes = 'open'; look = [0, 1]; }                      /* a peek underneath */
  if (t >= 1800 && t < 2300) { eyes = 'dot'; look = t < 2050 ? [1, 0] : [-1, 0]; }  /* nothing there: tiny eyes, right, left */
  if (t >= 2300 && t < 3020) { look = [-1, 0]; eyes = 'squint'; }                   /* huffy, staring the wrong way */
  if (t >= 2300 && t < 2750) { const k = Math.floor((t - 2300) / 90); x = 10 - k; legs = k % 2 ? 'stepB' : 'stepA'; }
  if (t >= 3020 && t < 3110) eyes = 'blink';
  const b = mbBugAt(t), bug = b ? [mbBug(b.x, b.ph), b.dash ? fxDash(b.x + 6, 24, 2, 1) : []] : [];
  /* the question mark pops up over its head when it finds nothing, bobs once and goes */
  const fx = [], qa = t - 1820;
  if (qa >= 0 && qa < 480) fx.push(...fxMark(x + 6, 7 - (qa < 80 ? 0 : qa < 160 ? 1 : 0) + (qa > 400 ? 1 : 0), '?'));
  return [mShadow(lift, x), ...bug, mascot({ x, y, legs, squash: sq, eyes, look, brows, arms, blush }), fx];
};

/* ---------- Reading (state: reading docs) ----------
   An open book lies in front of it, wide and low the way a real one lies open on a table, and it reads with its eyes
   down on the pages, its hands resting on the far corners. The eyes follow each line, left page then right, while a
   small gold mark keeps pace along the text, with a little nod at each new line. At the end of the spread its hand
   flicks, and the right page swings over the spine like a real sheet: it lifts with its text, rises edge on in front
   of its face, shows its back as it falls to the left, and lands with a puff of air. A happy nod follows: curved
   eyes, a blush and a sparkle. It is the wait while something is read, and the turned page is the progress. */
/* the open book, 25 x 9, in perspective: the pages are six rows, narrow at the far edge and one cell wider each row
   toward the near one, so the sides are clean diagonals; the far edge dips into the spine, a crease runs down the
   gutter with a soft shade beside it, the left page is cream and the right one lit, and each page has two lines of
   words. Under the pages, the edge of the page block, the blue cover lit at its right corner, and a navy contour */
const MB_BK = { x: 3, y: 21, W: 25, S: 12, rows: 6, wf: 6 };
const mbHalf = r => MB_BK.wf + r;
const MB_TEXT = [[2, [[3, 4], [6, 8]]], [4, [[3, 5], [7, 10]]]];   /* rows of words, as [from, to] cells out from the spine */
const mbBookArt = (() => {
  const S = MB_BK.S, R = MB_BK.rows, g = Array.from({ length: R + 3 }, () => Array(MB_BK.W).fill('.'));
  for (let r = 0; r < R; r++) { const h = mbHalf(r);
    for (let x = S - h; x <= S + h; x++) g[r][x] = x < S ? 'c' : x > S ? 'w' : 'T';
    g[r][S - h - 1] = 'U'; g[r][S + h + 1] = 'U'; }
  const h0 = mbHalf(0); for (let x = S - h0; x <= S + h0; x++) g[0][x] = 'U'; g[0][S] = '.'; g[1][S] = 'U';
  for (let r = 1; r < R; r++) { g[r][S - 1] = 'C'; if (r > 1) g[r][S + 1] = r > 2 ? 'w' : 'C'; }
  for (const [r, words] of MB_TEXT) for (const [a, b] of words) for (let d = a; d <= b; d++) { g[r][S - d] = 'C'; g[r][S + d] = 'C'; }
  const hn = mbHalf(R - 1);
  for (let x = S - hn - 1; x <= S + hn + 1; x++) { g[R][x] = 'T'; g[R + 1][x] = 'u'; g[R + 2][x] = 'U'; }
  for (const r of [R, R + 1]) { g[r][S - hn - 1] = 'U'; g[r][S + hn + 1] = 'U'; g[r][S] = 'U'; }
  g[R + 1][S + hn] = 'l'; g[R + 2][S - hn - 1] = '.'; g[R + 2][S + hn + 1] = '.';
  return g.map(r => r.join(''));
})();
/* the lines in reading order, as [row, first column, length] in the book: left page then right, top line first */
const MB_LINES = [[2, 4, 6], [4, 2, 8], [2, 15, 6], [4, 15, 8]];
/* the page being turned, at angle a (0 lying on the right, PI lying on the left), in book cells: every cell of the
   right page swings round the spine, rising as it goes, the far rows a touch behind the near ones so the sheet bends.
   It carries its words on both faces, lit on the front and cream on the back, with a shade line round it so it
   reads against the pages under it; lying flat at either end it matches the page it lands on */
const mbPage = a => {
  const S = MB_BK.S, R = MB_BK.rows, k = 0.7, cells = new Map();
  const word = (r, d) => MB_TEXT.some(([rr, ws]) => rr === r && ws.some(([p, q]) => d >= p && d <= q));
  for (let r = 0; r < R; r++) { const h = mbHalf(r);
    for (let d = 0.5; d <= h + 0.01; d += 0.5) {
      /* the near outer corner leads, so the turn starts as a peel and the sheet bends as it goes over */
      const ar = Math.min(Math.PI, Math.max(0, a + 0.5 * Math.sin(Math.min(Math.PI, a * 1.4 + 0.25)) * (r / (R - 1)) * (d / h)));
      const x = Math.round(S + d * Math.cos(ar)), y = Math.round(r - d * Math.sin(ar) * k);
      cells.set(x + ',' + y, [x, y, word(r, Math.round(d)) && Math.sin(ar) < 0.22 ? 'C' : ar < Math.PI / 2 ? 'w' : 'c', d]); } }
  /* a shade line only where the sheet's edge stands clear of the pages, so a sheet still lying flat looks like the
     page it is, and one rising shows its edge */
  const onPage = (x, y) => y >= 0 && y < R && 'cwCT'.includes(mbBookArt[y][x] || '.');
  const out = [...cells.values()], has = (x, y) => cells.has(x + ',' + y);
  for (const c of out) { const [x, y, , d] = c, edge = !has(x - 1, y) || !has(x + 1, y) || !has(x, y - 1) || !has(x, y + 1);
    if (edge && (!onPage(x, y) || d >= mbHalf(Math.max(0, Math.min(R - 1, y))) - 0.5 && Math.sin(a) > 0.25)) c[2] = 'C'; }
  return out.map(([x, y, c]) => [x, y, c]);
};
const MB_READ_END = 1400, MB_TURN = 480;
const mbRead = t => {
  let y = 15, eyes = 'open', look = [0, 1], arms = ['rest', 'rest'], turn = null, blush = false, cursor = null;
  if (t < MB_READ_END) { const k = Math.floor(t / 350), u = (t % 350) / 350, [r, c0, n] = MB_LINES[k];
    cursor = [c0 + Math.min(n - 1, Math.floor(u * n)), r]; look = [k < 2 ? (u < 0.5 ? -1 : 0) : (u < 0.5 ? 0 : 1), 1];
    if (t % 350 < 70) y = 16; }                                                 /* a nod at each new line */
  if (t >= 560 && t < 650) eyes = 'blink';
  if (t >= MB_READ_END) look = [1, 1];                                        /* the eyes go to the corner first */
  if (t >= MB_READ_END && t < MB_READ_END + 180) arms = ['rest', [[1, -1, 'o'], [2, -2, 'o'], [1, 0, 'O'], [2, -1, 'O']]];   /* a flick */
  const ta = t - MB_READ_END - 60;
  if (ta >= 0 && ta < MB_TURN) { turn = Math.PI * mEase.inOut(ta / MB_TURN); look = [turn < 1.2 ? 1 : turn < 1.9 ? 0 : -1, turn < 1.2 ? 0 : -1]; }
  if (ta >= MB_TURN) look = [-1, 1];
  if (t >= 2000 && t < 2560) { eyes = 'happy'; blush = true; look = [0, 0]; }
  if ((t >= 2060 && t < 2160) || (t >= 2280 && t < 2380)) y = 16;
  if (t >= 2560) look = [-1, 1];
  if (t >= 2760 && t < 2850) eyes = 'blink';
  const bx = 9, { x: kx, y: ky } = MB_BK;
  const book = mArt(mbBookArt, kx, ky);
  if (cursor) book.push([kx + cursor[0], ky + cursor[1], 'y']);
  const fx = [], sa = t - 2080;
  if (sa >= 0 && sa < 440) { const p = mEase.out(sa / 440); fx.push(...fxSparkle(Math.round(bx + 16 + p), Math.round(14 - 4 * p), sa < 280 ? 1 : 0)); }
  const pa = ta - MB_TURN + 40;                                                /* the air the page pushes out as it lands */
  if (pa >= 0 && pa < 220) fx.push(...fxPuff(kx + 1 - Math.round(2 * mEase.out(pa / 220)), ky + 1, pa < 120 ? 2 : 1, true));
  return [mascot({ x: bx, y, eyes, look, arms, blush }), book, turn == null ? [] : mbPage(turn).map(([a, b, c]) => [a + kx, b + ky, c]), fx];
};

/* the stills: the find with its wide eyes, a line being read, the pounce with the beetle already bolting beneath */
const MSC_B = {
  mascot_detective: Object.assign(mFilm(mbDetective, 3000), { still: mbAt(mbDetective, 1950) }),
  mascot_read: Object.assign(mFilm(mbRead, 3000), { still: mbAt(mbRead, 1100) }),
  mascot_bughunt: Object.assign(mFilm(mbHunt, MB_HUNT), { still: mbAt(mbHunt, 1330) }),
};
const MSC_B_META = {
  mascot_read: ['Reading', 'An open book lies in front of it; its eyes follow each line with a nod, then it flicks the page over and gives a happy little nod.', 'Use it for: reading docs, parsing a file, loading an article.'],
  mascot_bughunt: ['Bug hunt', 'A tiny green bug scuttles in. It squints, wiggles and pounces wide-eyed, thinks it got it, then finds nothing: tiny eyes, a question mark, and a huff while the bug wanders back in behind it.', 'Use it for: debugging, running tests, fixing an error.'],
  mascot_detective: ['Detective', 'In a deerstalker, it holds a magnifying glass up to one eye, so we see that eye big and round through the lens. It leans and peers about, ducks to check the floor, then the big eye pops wide, it jumps, and the rim flashes: found it.', 'Use it for: searching, scanning files, looking something up.'],
};

/* PixelLoader mascot scenes by the c folder: typing, thinking and snoozing. Built only from kit.js. Every top level
   name starts with mc. */

/* the arms alone, exactly as the kit draws them, so they can be layered in front of a prop that hides the lower body */
const mtKey = c => c[0] + ',' + c[1];
const mtArms = o => { const bare = new Set(mascot({ ...o, arms: ['hide', 'hide'] }).map(mtKey));
  return mascot(o).filter(c => !bare.has(mtKey(c))); };

/* Typing: it sits behind its laptop, seen from the front: the back of the lid toward us, a charcoal panel lit along
   its top edge with a small ring for a logo, and the thin deck below. Its happy eyes say it is enjoying this. It types
   a careful phrase, its hands taking turns on the keys behind the lid in a gentle rhythm with a small nod, then lifts
   its hands to think: the eyes open and look up, three little dots appear one by one, and the idea arrives with a
   raised hand and a sparkle. It types the rest a little quicker, winds up and presses Enter with a bounce, and the
   logo on the lid glints. */
const MT_LAP_X = 8, MT_LAP_Y = 21;
/* the laptop from the front: lid lit along its top edge and right side, dark on its left and lower edges, a ring
   logo in the middle; under it the front of the deck, a thin plate lit on top */
const MT_LAPTOP = [
  '..hhhhhhhhh..',
  '.Gggggcggggh.',
  '.Ggggcgcgggh.',
  '.Gggggcggggh.',
  '.GGGGGGGGGGG.',
  'GhhhhhhhhhhhG',
  '.GGGGGGGGGGG.'];
const MT_LOGO = [[6, 1], [5, 2], [7, 2], [6, 3]].map(([x, y]) => [MT_LAP_X + x, MT_LAP_Y + y]);
const mtLaptop = glint => { const c = mArt(MT_LAPTOP, MT_LAP_X, MT_LAP_Y);
  if (glint) c.push(...MT_LOGO.map(([x, y]) => [x, y, 'w']), [MT_LAP_X + 6, MT_LAP_Y + 2, glint > 1 ? 'z' : 'y']);
  return c; };
const mtShadow = () => Array.from({ length: 13 }, (_, i) => [MT_LAP_X + i, MT_LAP_Y + 7, 's']);
/* the hands (right arm, relative to the shoulder; the kit mirrors the left): they hover at the sides of the lid and
   drop one cell for a key; the wind up before Enter lifts the hand above the lid */
const MT_HOVER = 'rest';
const MT_PRESS = [[1, 1, 'o'], [2, 1, 'o'], [1, 2, 'O'], [2, 2, 'O']];
const MT_LIFT = [[1, -1, 'o'], [2, -2, 'o'], [1, 0, 'O'], [2, -1, 'O']];
/* the beats of a careful phrase with a breath in the middle, and of the quicker one after the idea */
const MT_TAPS = [0, 170, 340, 620, 790, 960];
const MT_TAPS2 = [1960, 2080, 2200, 2320, 2440];
const mtTypePose = t => {
  const o = { x: 8, y: 15, eyes: 'happy', blush: true, arms: [MT_HOVER, MT_HOVER] }, fx = [];
  /* the hands take turns, left then right, each key a short press */
  const tapIn = list => { const k = list.findIndex(t0 => t >= t0 && t < t0 + 90); return k < 0 ? null : k % 2; };
  const hands = k => k === null ? [MT_HOVER, MT_HOVER] : k === 0 ? [MT_PRESS, MT_HOVER] : [MT_HOVER, MT_PRESS];
  let glint = 0;
  if (t < 1200) { o.arms = hands(tapIn(MT_TAPS)); if ((t < 90) || (t >= 620 && t < 710)) o.y = 16; }   /* a nod on each first key */
  else if (t < 1880) {                                                    /* hands up off the keys, a pause to think */
    o.eyes = 'open'; o.blush = false; o.look = [1, -1];
    if (t >= 1240 && t < 1340) o.eyes = 'blink';
    const dots = Math.min(3, Math.floor((t - 1360) / 120) + 1);
    if (t >= 1360 && t < 1720) for (let k = 0; k < dots; k++) fx.push([23 + 2 * k, 12 - k, 'y']);
    if (t >= 1720) {                                                      /* the idea: a raised hand and a sparkle */
      o.eyes = 'happy'; o.blush = true; o.look = [0, 0]; o.arms = [MT_HOVER, 'up']; o.y = t < 1780 ? 14 : 15;
      fx.push(...fxSparkle(26, 10, t < 1780 ? 1 : 2));
    }
  }
  else if (t < 2520) { o.arms = hands(tapIn(MT_TAPS2)); if (t < 1940) fx.push([26, 10, 'z']); }
  else if (t < 2620) o.arms = [MT_HOVER, MT_LIFT];                         /* the wind up */
  else if (t < 2720) { o.y = 16; o.squash = 1; o.legs = 'crouch'; o.arms = [MT_HOVER, MT_PRESS]; glint = 2; }   /* Enter */
  else if (t < 2820) { o.y = 14; glint = 2; }
  else if (t < 2920) glint = 1;
  return { o, fx, glint };
};
const mtType = t => { const { o, fx, glint } = mtTypePose(t);
  return [mtShadow(), mascot({ ...o, arms: ['hide', 'hide'] }), mtLaptop(glint), mtArms(o), fx,
    glint > 1 ? fxSparkle(24, 17, t < 2720 ? 1 : 0) : []]; };

/* Thinking: arms at rest and eyes turned up to the side, it ponders. Little puffs rise off the top of its head and a
   thought bubble forms, three dots light one by one while one pair of feet taps in time, and it gives one slow blink
   as they fill. Then it squints as the dots draw together and become a gold sparkle: the idea. The bubble pops, the
   eyes go wide, it crouches and hops for joy, lands with a squash and a happy blush, then the eyes
   drift back up to the bubble's corner.
   Use it for: thinking, planning, working out an answer before it streams. */
const MT_TX = 7;
const MT_CLOUD = [
  '...MMMM.MMM..',
  '.MMccccMcwwM.',
  'MccccccccccwM',
  'McccccccccccM',
  'MmccccccccccM',
  '.MmmcccccccM.',
  '..MMMMMMMMM..'];
const MT_CLOUD_S = [
  '.MMMMM.',
  'MccccwM',
  'MmccccM',
  '.MMMMM.'];
const mtDot = (x, y, lit) => [[x, y, lit ? 'y' : 'm'], [x + 1, y, lit ? 'y' : 'm'], [x, y + 1, lit ? 'Y' : 'M'], [x + 1, y + 1, lit ? 'Y' : 'M']];
const mtThought = t => {
  const out = [], cx = 17, cy = 2;
  if (t < 120 || t >= 2080) return [];
  out.push(fxPuff(19, t < 200 ? 14 : 13, 1, true));
  if (t >= 280) out.push(fxPuff(20, t < 360 ? 11 : 10, 2, true));
  if (t >= 460 && t < 540) out.push(mArt(MT_CLOUD_S, 20, 3));
  if (t < 540) return out.flat();
  out.push(mArt(MT_CLOUD, cx, cy));
  if (t < 1800) { const lit = t < 880 ? -1 : t < 1650 ? Math.floor((t - 880) / 250) : 3;
    [0, 1, 2].forEach(i => out.push(mtDot(cx + 3 + 3 * i, cy + 3, lit === i || lit === 3))); }
  else if (t < 1880) out.push(mtDot(cx + 4, cy + 3, 1), mtDot(cx + 8, cy + 3, 1));
  else if (t < 1960) out.push(mtDot(cx + 6, cy + 3, 1));
  else out.push(fxSparkle(cx + 6, cy + 4, 1));
  return out.flat();
};
const mtPop = t => t >= 2080 && t < 2200 ? [...fxPuff(18, 6, t < 2140 ? 2 : 1, true), ...fxPuff(28, 4, t < 2140 ? 2 : 1, true)] : [];
const mtIdea = t => { const a = t - 1960; if (a < 0 || a >= 560) return [];
  const y = Math.round(6 - 2 * mEase.out(a / 560));
  return fxSparkle(23, y, a < 90 ? 1 : a < 300 ? 2 : a < 440 ? 1 : 0); };
const mtThinkPose = t => {
  const o = { x: MT_TX, y: 15, look: [1, -1], arms: ['rest', 'rest'], lift: 0 };
  if ([880, 1130, 1380].some(k => t >= k && t < k + 110)) o.legs = 'stepA';            /* a foot taps as each dot lights */
  if (t >= 1490 && t < 1740) o.eyes = t < 1570 || t >= 1660 ? 'blink' : 'closed';      /* one slow blink while they fill */
  if (t >= 1800 && t < 1960) o.eyes = 'squint';                                         /* straining as the dots gather */
  if (t >= 1960 && t < 2040) { o.eyes = 'wide'; }                       /* the idea lands */
  else if (t >= 2040 && t < 2120) { o.eyes = 'wide'; o.squash = 1; o.arms = ['down', 'down']; }
  else if (t >= 2120 && t < 2180) { o.eyes = 'wide'; o.squash = -1; o.y = 14; o.arms = ['up', 'up']; o.lift = 1; }
  else if (t >= 2180 && t < 2380) { o.eyes = 'wide'; o.y = 13; o.legs = 'air'; o.arms = ['up', 'up']; o.lift = 2; }
  else if (t >= 2380 && t < 2460) { o.eyes = 'happy'; o.blush = true; o.squash = 1; o.arms = ['down', 'down']; o.look = [0, 0]; }
  else if (t >= 2460 && t < 2820) { o.eyes = 'happy'; o.blush = true; o.arms = ['rest', 'rest']; o.look = [0, 0]; }
  return o;
};
const mtThink = t => { const o = mtThinkPose(t);
  return [mShadow(o.lift, MT_TX), mtThought(t), mtPop(t), mascot(o), mtIdea(t)]; };

/* Snoozing: it has dozed off on its feet, eyes shut and cheeks blushing, slumped a little with its arms hanging. It
   breathes slowly: up a cell on the in-breath, a soft squash on the way out. Zs drift up from its head, a small z
   that swells into a big one and fades to a dot. Mid loop it nods off, sinking and squashing as its eyes slide down,
   then catches itself with a jolt: eyes wide, arms out, the z it was blowing pops. It looks left and right,
   blinks, the lids grow heavy and it dozes off again.
   Use it for: paused jobs, idle sessions, anything waiting on you. */
const MT_SX = 8;
const mtZ = (t, born, popAt) => {
  const a = ((t - born) % 3200 + 3200) % 3200;
  if (a >= 1300) return [];
  const p = mEase.out(a / 1300), x = Math.round(21 + 5 * p), y = Math.round(12 - 8 * p);
  if (popAt !== undefined && t >= popAt && t - popAt < 110 && (popAt - born) < 1300 && popAt >= born) return fxPuff(x + 1, y + 1, 2, true);
  if (popAt !== undefined && t >= popAt && popAt >= born) return [];
  return a < 110 ? [[x, y + 2, 'l']] : a < 560 ? fxZ(x, y) : a < 1140 ? fxZ(x, y, true) : [[x + 2, y + 2, 'l']];
};
const mtSleepPose = t => {
  const o = { x: MT_SX, y: 16, legs: 'crouch', eyes: 'closed', blush: true, arms: ['rest', 'rest'] };
  if (t >= 320 && t < 880) { o.y = 15; o.legs = 'stand'; }                                   /* in-breath */
  else if (t >= 1040 && t < 1200) { o.look = [0, 1]; o.arms = ['down', 'down']; }           /* nodding, arms gone limp */
  else if (t >= 1200 && t < 1330) { o.look = [0, 1]; o.squash = 1; o.arms = ['down', 'down']; }   /* sinks */
  else if (t >= 1330 && t < 2350) {                                                          /* the catch */
    Object.assign(o, { y: 15, legs: 'stand', eyes: 'wide', blush: false, arms: ['out', 'out'] });
    if (t < 1400) o.squash = -1;
    else if (t < 1580) o.look = [-1, 0];
    else if (t < 1750) o.look = [1, 0];
    else if (t < 1850) { o.eyes = 'blink'; o.brows = null; o.arms = ['rest', 'rest']; }
    else if (t < 2050) { o.eyes = 'open'; o.brows = null; o.arms = ['rest', 'rest']; }
    else { o.eyes = 'squint'; o.brows = null; o.arms = ['rest', 'rest']; }
  }
  else if (t >= 2650 && t < 3020) { o.y = 15; o.legs = 'stand'; }                            /* in-breath */
  else if (t >= 3090) o.squash = 1;                                                          /* and softly out */
  return o;
};
const mtSleep = t => [mShadow(0, MT_SX), mascot(mtSleepPose(t)), mtZ(t, 2700), mtZ(t, 500, 1330)];

const MSC_C = {
  mascot_type: Object.assign(mFilm(mtType, 3000), { still: mDone([].concat(mtType(180)).reduce((g, l) => mPut(g, l), mPic())) }),
  mascot_think: Object.assign(mFilm(mtThink, 3200), { still: mDone([mShadow(0, MT_TX), mArt(MT_CLOUD, 17, 2),
    mtDot(20, 5, 1), mtDot(23, 5, 1), mtDot(26, 5, 0), fxPuff(19, 13, 1, true), fxPuff(20, 10, 2, true),
    mascot({ x: MT_TX, look: [1, -1] })].reduce((g, l) => mPut(g, l), mPic())) }),
  mascot_sleep: Object.assign(mFilm(mtSleep, 3200), { still: mDone([mShadow(0, MT_SX),
    mascot({ x: MT_SX, y: 16, legs: 'crouch', eyes: 'closed', blush: true }),
    fxZ(21, 10), fxZ(24, 4, true)].reduce((g, l) => mPut(g, l), mPic())) }),
};
const MSC_C_META = {
  mascot_type: ['Typing', 'Happy behind its laptop, it types a careful phrase, stops to think as three little dots appear, raises a hand when the idea sparkles, types on, and presses Enter as the logo glints.', 'Use it for: writing, composing a reply, saving or sending.'],
  mascot_think: ['Thinking', 'Eyes turned up and a foot tapping, it watches three dots light in a thought bubble until they spark into an idea and it hops for joy.', 'Use it for: thinking, planning, working out an answer.'],
  mascot_sleep: ['Snoozing', 'It dozes on its feet, breathing slowly with Zs drifting up, nods off, catches itself wide eyed, and drifts back to sleep.', 'Use it for: paused jobs, idle sessions, anything waiting on you.'],
};

/* Three mascot scenes: Celebrate, Oops and Paper plane. Every top-level name here starts with md. */

/* ---------- small helpers this file needs (the kit has no way to ask where a squashed body sits) ---------- */

/* where the body really is for a set of mascot options: squash and stretch move and resize it, so a hat or a held prop
   asks this and stays glued to the clay */
const mdBody = (o = {}) => {
  const s = Math.sign(o.squash || 0), x = o.x ?? 9, y = o.y ?? 15;
  const bx = x - s, by = y + s, W = 13 + 2 * s;
  return { bx, by, W, cx: x + 6, ay: by + 5 - (s > 0 ? 1 : 0), rx: bx + W - 1, lx: bx };
};
/* art centred on (x, y) */
const mdAt = (rows, x, y) => mArt(rows, Math.round(x - (Math.max(...rows.map(r => r.length)) - 1) / 2), Math.round(y - (rows.length - 1) / 2));
/* turn art a quarter to the left */
const mdRotL = rows => { const w = Math.max(...rows.map(r => r.length)); return Array.from({ length: w }, (_, r) => rows.map(row => row[w - 1 - r] || '.').join('')); };
/* the kit's shadow, under the mascot wherever it stands */
const mdShadowAt = (o, lift = 0) => mShadow(lift, o.x ?? 9);

/* =====================================================================================================================
   Celebrate (done). A red party hat with gold dots sits a cell right of centre. The mascot looks up, sinks into a
   crouch, squashes, and springs up with both arms high, stretched for the take-off. At the top of the jump a burst of
   confetti pops out above its head: four bits, gold, red, blue and green, fly apart, then flip and tumble down as they
   fall and shrink away. It lands with a squash, eyes turned to happy arcs and a blush, and gives a second little hop
   for good measure before it settles. The big jump is the action, the second hop is the delight.
   ===================================================================================================================== */
/* the party hat: a fluffy gold pom-pom, a red cone with gold stripes running round it, lit down its right side, and
   a dark rim where it sits */
const MD_HAT = [
  '...zwz...',
  '...Yyz...',
  '....R....',
  '...Rrp...',
  '...yRrp..',
  '..Rrryp..',
  '..Ryrrrp.',
  '.Rrrryrp.',
  '.RRRRRRR.'];
const mdHat = o => { const b = mdBody(o); return mArt(MD_HAT, b.cx - 3, b.by - 9); };

const MD_PARTY_MS = 2800, MD_BURST = 1000;
/* one confetti bit: it flies out of the burst with ease-out, then falls with a little sway, flipping between a flat
   bar, a tilt, an upright bar and an edge-on dot, and ends as a dot */
const MD_BITS = [
  { c: 'yY', dx: -11, dy: 2, sw: 1, d: 0, ph: 0 },
  { c: 'rR', dx: 10, dy: 3, sw: -1, d: 40, ph: 2 },
  { c: 'uU', dx: -8, dy: 0, sw: -1, d: 80, ph: 1 },
  { c: 'eE', dx: 7, dy: 1, sw: 1, d: 120, ph: 3 },
];
const mdBit = (t, b) => {
  const a = t - MD_BURST - b.d; if (a < 0 || a > 1250) return [];
  const p = mEase.out(Math.min(1, a / 260)), f = Math.max(0, a - 180);
  const X = Math.round(16 + b.dx * p + b.sw * Math.sin(f / 150)), Y = Math.round(2 + b.dy * p + f / 80), [k, K] = b.c;
  if (a > 1110) return [[X, Y, k]];
  const s = (Math.floor(a / 110) + b.ph) % 4;
  return s === 0 ? [[X, Y, k], [X + 1, Y, K]] : s === 1 ? [[X, Y, k], [X + 1, Y + 1, K]] : s === 2 ? [[X, Y, k], [X, Y + 1, K]] : [[X, Y, k]];
};
const mdPartyPose = t => {
  const o = { y: 15, legs: 'stand', arms: ['rest', 'rest'], eyes: 'open' };
  if (t >= 150 && t < 250) o.eyes = 'blink';
  if (t >= 380 && t < 1300) o.look = [0, -1];                                                   /* the eyes go up first */
  if (t >= 470 && t < 620) Object.assign(o, { y: 16, legs: 'crouch', arms: ['down', 'down'] }); /* sink */
  else if (t >= 620 && t < 700) Object.assign(o, { y: 16, squash: 1, legs: 'crouch', arms: ['down', 'down'], eyes: 'closed' });
  else if (t >= 700 && t < 770) Object.assign(o, { y: 14, squash: -1, legs: 'air', arms: ['up', 'up'] }); /* spring */
  else if (t >= 770 && t < 1150) Object.assign(o, { y: Math.round(mTween(t, 770, 1020, 13, 11, mEase.out)), legs: 'tuck', arms: ['up', 'up'] });
  else if (t >= 1150 && t < 1300) Object.assign(o, { y: Math.round(mTween(t, 1150, 1300, 11, 15, mEase.in)), legs: 'air', arms: ['up', 'up'] });
  else if (t >= 1300 && t < 1385) Object.assign(o, { y: 16, squash: 1, legs: 'crouch', arms: ['out', 'out'] }); /* land */
  else if (t >= 1385 && t < 1480) Object.assign(o, { y: 16, legs: 'crouch', arms: ['rest', 'rest'] });
  else if (t >= 1680 && t < 1760) Object.assign(o, { y: 16, legs: 'crouch', arms: ['down', 'down'] }); /* the little hop */
  else if (t >= 1760 && t < 1990) Object.assign(o, { y: Math.round(15 - 2.4 * Math.sin(Math.PI * (t - 1760) / 230)), legs: 'tuck', arms: ['up', 'up'] });
  else if (t >= 1990 && t < 2070) Object.assign(o, { y: 16, squash: 1, legs: 'crouch', arms: ['out', 'out'] });
  else if (t >= 2070 && t < 2150) Object.assign(o, { y: 16, legs: 'crouch' });
  if (t >= 1300 && t < 2560) Object.assign(o, { eyes: 'happy', blush: true, look: [0, 0] });
  return o;
};
const mdParty = t => { const o = mdPartyPose(t);
  return [mdShadowAt(o, Math.max(0, 15 - o.y)), mascot(o), mdHat(o), ...MD_BITS.map(b => mdBit(t, b))]; };
/* the hero frame: mid-leap, arms up, happy and blushing, confetti all around */
const mdPartyStill = () => { const o = { y: 12, legs: 'tuck', arms: ['up', 'up'], eyes: 'happy', blush: true };
  return [mdShadowAt(o, 3), mascot(o), mdHat(o), [[5, 6, 'y'], [6, 6, 'Y']], [[26, 5, 'r'], [26, 6, 'R']], [[8, 11, 'u'], [9, 12, 'U']], [[23, 10, 'e'], [24, 10, 'E']]]; };

/* =====================================================================================================================
   Oops (something went wrong). It walks along carrying two cardboard boxes stacked on its right arm. Its eyes go wide
   a beat before its foot catches; it stumbles, the stack wobbles one way and the other, and then everything goes:
   the top box sails over its head to the left, the bottom box drops to the right, and the mascot lands flat in a
   squash with 'x' eyes. A sweat drop and small dazed eyes glancing at each box. It shakes it off, crouches, grabs a box in
   each hand, and tosses the left one over its head back onto the stack, then gives a relieved happy blink and walks
   on. The toss and the happy eyes are the delight: the mishap is funny and it is fine.
   ===================================================================================================================== */
/* cardboard boxes in light tan, shaded down the left with a dark base, sealed with a strip of tape; the big one has a label */
const MD_BOX_A = ['bnnCnn', 'bnnCnn', 'bnnCwn', 'BBBBBB'];   /* the bottom box */
const MD_BOX_B = ['bnCnn', 'bnCnn', 'bnCnn', 'BBBBB'];       /* the smaller top box */
const MD_OOPS_MS = 3200;
/* a thrown thing: a parabola that rises h cells above the straight line; lead > 0 lets it cover ground sooner */
const mdArc = (t, t0, t1, a, b, h, lead = 0) => { const p = Math.min(1, Math.max(0, (t - t0) / (t1 - t0))), q = p + lead * p * (1 - p);
  return [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * p - 4 * h * p * (1 - p)]; };
const mdOopsPose = t => {
  const o = { x: 8, y: 15, legs: 'stand', arms: ['rest', 'hold'], eyes: 'open' };
  const w = t % 400; if (t < 800) Object.assign(o, w < 140 ? { legs: 'stepA' } : w < 200 ? { y: 16, legs: 'crouch' } : w < 340 ? { legs: 'stepB' } : { y: 16, legs: 'crouch' });
  if (t >= 410 && t < 510) o.eyes = 'blink';
  if (t >= 800 && t < 1140) Object.assign(o, { eyes: 'wide' });                      /* the eyes know first */
  if (t >= 800 && t < 880) o.legs = 'stepA';
  else if (t >= 880 && t < 980) Object.assign(o, { x: 9, legs: 'tuck', arms: ['up', 'hold'] });  /* the foot catches */
  else if (t >= 980 && t < 1060) Object.assign(o, { x: 9, y: 16, legs: 'crouch', arms: ['up', 'hold'] });
  else if (t >= 1060 && t < 1140) Object.assign(o, { x: 9, y: 15, legs: 'tuck', arms: ['out', 'reach'] }); /* it lets go */
  else if (t >= 1140 && t < 1230) Object.assign(o, { x: 9, y: 16, squash: 1, legs: 'crouch', arms: ['out', 'out'], eyes: 'x' });
  else if (t >= 1230 && t < 1650) Object.assign(o, { x: 9, y: 16, legs: 'crouch', arms: ['down', 'down'], eyes: t < 1460 ? 'x' : 'dot',
    look: t < 1460 ? [0, 0] : t < 1560 ? [1, 1] : [-1, 1] });
  else if (t >= 1650 && t < 1900) Object.assign(o, { x: [10, 8, 10, 9, 8][Math.floor((t - 1650) / 50)] ?? 8, legs: 'stand', arms: ['rest', 'rest'], eyes: 'closed' });
  else if (t >= 1900 && t < 2060) Object.assign(o, { arms: ['rest', 'rest'], look: [0, 1] });
  else if (t >= 2060 && t < 2200) Object.assign(o, { y: 16, legs: 'crouch', arms: ['down', 'down'], look: [0, 1] }); /* grab both */
  else if (t >= 2200 && t < 2270) Object.assign(o, { y: 16, legs: 'crouch', arms: ['out', 'out'], look: [-1, 0] });
  else if (t >= 2270 && t < 2380) Object.assign(o, { arms: ['out', 'hold'], look: [-1, 0] });
  else if (t >= 2380 && t < 2720) Object.assign(o, { arms: [t < 2500 ? 'up' : 'rest', 'hold'], look: t < 2520 ? [-1, -1] : t < 2630 ? [0, -1] : [1, -1] }); /* toss */
  else if (t >= 2720 && t < 2800) Object.assign(o, { y: 16, legs: 'crouch', arms: ['rest', 'hold'], eyes: 'happy' }); /* it lands on the stack */
  else if (t >= 2800 && t < 2980) Object.assign(o, { eyes: 'happy' });
  else if (t >= 2980) Object.assign(o, t < 3120 ? { legs: 'stepB' } : { y: 16, legs: 'crouch' });
  return o;
};
/* where the boxes are: on the arm, wobbling, flying, on the ground, picked up, tossed */
const mdOopsBoxes = (t, o) => {
  const b = mdBody(o), ha = [b.rx + 1, b.ay - 4], hb = [b.rx + 1, b.ay - 8];    /* held: A on the arm, B on A */
  const gA = [23, 22], gB = [1, 22];                                              /* where they land */
  let A = ha, B = hb;
  if (t >= 880 && t < 980) B = [hb[0] + 1, hb[1]];
  else if (t >= 980 && t < 1060) { A = [ha[0] + 1, ha[1]]; B = [hb[0] - 1, hb[1]]; }
  else if (t >= 1060 && t < 2060) {
    A = t < 1240 ? mdArc(t, 1060, 1240, [24, 14], gA, 2) : gA;
    B = t < 1460 ? mdArc(t, 1060, 1460, [21, 10], gB, 6, 0.7) : gB;
  } else if (t >= 2060 && t < 2200) { A = gA; B = gB; }
  else if (t >= 2200 && t < 2270) { A = [b.rx + 2, b.ay - 3]; B = [b.lx - 6, b.ay - 3]; }
  else if (t >= 2270 && t < 2380) B = [b.lx - 5, b.ay - 4];
  else if (t >= 2380 && t < 2720) B = t < 2440 ? [b.lx - 6, b.ay - 7] : mdArc(t, 2440, 2720, [b.lx - 6, b.ay - 7], hb, 6);
  const r = v => v.map(Math.round);
  return [mArt(MD_BOX_A, ...r(A)), mArt(MD_BOX_B, ...r(B))];
};
/* a puff of dust where a box lands, and the sweat drop that appears, slides and is shaken off: as it flies it
   becomes a smaller drop and then a dot, the kit's fxSweat shrinking the way every effect does */
const mdOopsFx = t => {
  const fx = [];
  if (t >= 1240 && t < 1420) fx.push(fxPuff(t < 1330 ? 29 : 30, 24, t < 1330 ? 2 : 1, t >= 1330));
  if (t >= 1460 && t < 1620) fx.push(fxPuff(t < 1540 ? 7 : 8, 24, t < 1540 ? 2 : 1, t >= 1540));
  if (t >= 1460 && t < 1650) fx.push(fxSweat(23, Math.round(mTween(t, 1460, 1650, 12, 13, mEase.out))));
  else if (t >= 1650 && t < 1800) { const p = (t - 1650) / 150, x = Math.round(24 + 3 * mEase.out(p)), y = Math.round(12 - 3 * mEase.out(p));
    fx.push(p < 0.5 ? mArt(['.l.', 'lll', 'Ulu'], x - 1, y) : [[x, y, 'l']]); }
  return fx;
};
const mdOops = t => { const o = mdOopsPose(t); return [mdShadowAt(o), mascot(o), ...mdOopsBoxes(t, o), ...mdOopsFx(t)]; };

/* =====================================================================================================================
   Paper plane (uploading, sending). It holds a folded cream paper plane by the tail. Its eyes go to the sky first,
   then one eye squints to take aim as it raises the plane and draws back; it lunges and lets go. The plane climbs
   the right side, loops over the top upside down, levels out just above the mascot's head trailing little speed
   dashes, and dives home. The mascot watches the whole flight, reaches up wide-eyed, hops to meet it and catches
   it, then lands with a squash, happy eyes, a blush and a sparkle. The plane is drawn at two angles by hand and
   turned in quarter turns for the rest, so its fold stays on the outside of the loop like a real plane's belly.
   ===================================================================================================================== */
/* a folded paper plane: bright wings, a shaded belly along the fold, and a smoke contour so it reads on a white page */
const MD_PLANE_R = ['MMM......', 'MwwMMM...', '.MwwwwMMM', '..MCCCMM.', '..MCMM...', '..MM.....'];
const MD_PLANE_UR = ['......MM', '....MMwM', '..MMwwwM', 'MMwwwwM.', '.MMMwCM.', '...MCCM.', '...MCM..', '...MM...'];
/* the eight headings, counter-clockwise from right, each a quarter turn of the one two places before */
const MD_PLANES = (() => { const a = [MD_PLANE_R, MD_PLANE_UR]; for (let i = 2; i < 8; i++) a.push(mdRotL(a[i - 2])); return a; })();
const mdPlaneAt = (x, y, ang) => { const k = ((Math.round(-ang / (Math.PI / 4)) % 8) + 8) % 8; return mdAt(MD_PLANES[k], x, y); };
const MD_PLANE_MS = 3000, MD_THROW = 900, MD_CATCH = 2340;
/* the flight: a smooth open curve through these centres, walked by arc length */
const MD_FLIGHT = (() => {
  const P = [[23.5, 15.5], [27, 10], [25.5, 5], [19, 4.5], [12.5, 5], [10, 7.5], [12.5, 9.5], [18, 9.5], [22.5, 11.5], [25, 15.5]];
  const pts = [P[0], ...P, P[P.length - 1]], d = [];
  for (let i = 1; i < pts.length - 2; i++) { const [p0, p1, p2, p3] = [pts[i - 1], pts[i], pts[i + 1], pts[i + 2]];
    for (let k = 0; k < 30; k++) { const s = k / 30, s2 = s * s, s3 = s2 * s;
      d.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * s + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * s2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * s3))); } }
  d.push(P[P.length - 1]);
  const L = [0]; for (let i = 1; i < d.length; i++) L.push(L[i - 1] + Math.hypot(d[i][0] - d[i - 1][0], d[i][1] - d[i - 1][1]));
  return { d, L, len: L[L.length - 1] };
})();
const mdFly = dist => { const { d, L, len } = MD_FLIGHT, q = Math.max(0, Math.min(len, dist)); let i = 1; while (i < L.length - 1 && L[i] < q) i++;
  const p = (q - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]), x = d[i - 1][0] + (d[i][0] - d[i - 1][0]) * p, y = d[i - 1][1] + (d[i][1] - d[i - 1][1]) * p;
  return [x, y, Math.atan2(d[i][1] - d[i - 1][1], d[i][0] - d[i - 1][0])]; };
/* fast off the hand, a slow glide over the top, a quicker swoop home */
const mdFlightDist = t => { const p = Math.min(1, Math.max(0, (t - MD_THROW) / (MD_CATCH - MD_THROW))); return MD_FLIGHT.len * (p + 0.06 * Math.sin(2 * Math.PI * p)); };
const mdPlanePose = t => {
  const o = { x: 6, y: 15, legs: 'stand', arms: ['rest', 'out'], eyes: 'open' };
  if (t >= 150 && t < 250) o.eyes = 'blink';
  if (t >= 380 && t < 860) o.look = [1, -1];                                                      /* eyes on the sky */
  if (t >= 480 && t < 700) Object.assign(o, { arms: ['rest', 'up'], eyes: ['squint', 'open'] });  /* take aim */
  else if (t >= 700 && t < 860) Object.assign(o, { x: 5, legs: 'stepB', arms: ['out', [[1, 0, 'o'], [1, -1, 'o'], [2, -2, 'o'], [1, 1, 'O'], [2, -1, 'O']]], eyes: ['squint', 'open'] });
  else if (t >= 860 && t < 960) Object.assign(o, { x: 7, legs: 'stepA', arms: ['out', 'reach'], look: [1, -1] }); /* lunge, let go */
  else if (t >= 960 && t < 1120) Object.assign(o, { x: t < 1040 ? 7 : 6, arms: ['rest', 'reach'] });
  if (t >= 960 && t < MD_CATCH) { const [px, py] = mdFly(mdFlightDist(t)), b = mdBody(o);
    o.look = [Math.abs(px - b.cx) < 4 ? 0 : Math.sign(px - b.cx), py < b.by + 1 ? -1 : 0]; }
  if (t >= 2120 && t < MD_CATCH) Object.assign(o, { arms: ['rest', 'reach'], eyes: 'wide' });  /* ready */
  if (t >= 2200 && t < 2260) Object.assign(o, { y: 16, legs: 'crouch' });                       /* a hop to meet it */
  else if (t >= 2260 && t < 2300) Object.assign(o, { y: 14, legs: 'air' });
  else if (t >= 2300 && t < 2440) Object.assign(o, { y: 13, legs: 'tuck' });
  else if (t >= 2440 && t < 2490) Object.assign(o, { y: 14, legs: 'air' });
  else if (t >= 2490 && t < 2570) Object.assign(o, { y: 16, squash: 1, legs: 'crouch', arms: ['out', 'reach'] }); /* land */
  if (t >= MD_CATCH && t < 2780) Object.assign(o, { arms: [o.arms[0], t < 2640 ? 'reach' : 'out'], eyes: 'happy', blush: true, look: [0, 0] });
  return o;
};
const mdPlaneHeld = (t, o) => { const b = mdBody(o), a = o.arms[1];
  if (a === 'out') return mArt(MD_PLANE_R, b.rx + 3, b.ay - 2);                 /* the hand pinches the tail notch */
  if (a === 'reach' && t >= MD_CATCH) return mArt(MD_PLANE_R, b.rx + 3, b.ay - 5);
  if (a === 'up' || a === 'reach') return mArt(MD_PLANE_UR, b.rx + 1, b.ay - 8);
  return mArt(MD_PLANE_UR, b.rx, b.ay - 7);                                      /* drawn back */
};
const mdPlaneFx = t => {
  const fx = [];
  if (t >= MD_THROW && t < MD_CATCH) { const s = mdFlightDist(t), [x, y, a] = mdFly(s); fx.push(mdPlaneAt(x, y, a));
    const fast = Math.cos(2 * Math.PI * (t - MD_THROW) / (MD_CATCH - MD_THROW)) > -0.2;
    if (t > MD_THROW + 120 && t < MD_CATCH - 60) for (const [k, n] of fast ? [[6, 2], [9, 1]] : [[6, 1]]) {   /* speed dashes behind */
      if (s - k < 1) continue; for (let i = 0; i < n; i++) { const [dx, dy] = mdFly(s - k - i); fx.push([[Math.round(dx), Math.round(dy), 'm']]); } } }
  if (t >= MD_CATCH && t < MD_CATCH + 400) { const a = t - MD_CATCH; fx.push(fxSparkle(28, 10, a < 130 ? 1 : a < 270 ? 2 : 0)); }
  return fx;
};
/* the hero frame: just thrown, arm still out, eyes on the plane as it climbs away with its dashes */
const mdPlaneStill = () => { const o = { x: 7, y: 15, legs: 'stepA', arms: ['rest', 'reach'], look: [1, -1] };
  return [mdShadowAt(o), mascot(o), mdPlaneAt(25.5, 6.5, -Math.PI / 4), [[21, 11, 'm'], [20, 12, 'm'], [18, 14, 'm']]]; };
const mdPlane = t => { const o = mdPlanePose(t), held = t < MD_THROW || t >= MD_CATCH;
  return [mdShadowAt(o, Math.max(0, 15 - o.y)), mascot(o), held ? mdPlaneHeld(t, o) : [], ...mdPlaneFx(t)]; };

const MSC_D = {
  mascot_party: Object.assign(mFilm(mdParty, MD_PARTY_MS), { still: mFrame(1, ...mdPartyStill()).b }),
  mascot_oops: Object.assign(mFilm(mdOops, MD_OOPS_MS), { still: mFrame(1, ...mdOops(1500)).b }),
  mascot_plane: Object.assign(mFilm(mdPlane, MD_PLANE_MS), { still: mFrame(1, ...mdPlaneStill()).b }),
};
const MSC_D_META = {
  mascot_party: ['Celebrate', 'Party hat on, it crouches and leaps with both arms up while confetti bursts overhead, then lands with happy eyes and a blush and adds a second little hop.', 'Use it for: done, upload complete, task finished, a goal reached.'],
  mascot_oops: ['Oops', 'Carrying a stack of boxes, it trips, the boxes scatter and it lands flat with x eyes and a sweat drop, then shakes it off, tosses the boxes back onto the stack and walks on.', 'Use it for: an error, a failed request, something that needs a retry.'],
  mascot_plane: ['Paper plane', 'It squints, aims and throws a paper plane that loops over its head trailing dashes, then hops up and catches it with happy eyes.', 'Use it for: uploading, sending, sharing, a message on its way.'],
};

/* ---------- props: what the mascot wears and holds, gathered for the design rules page. The mascot is plain on
   purpose; its props carry the detail, and every one is drawn to the same standard ---------- */
const MASCOT_PROPS = [
  ['Chef hat', 'Puffs lit at the top right, a crease, a pleated band', () => mArt(MA_CHEF, 0, 0)],
  ['Skillet', 'A lit rim with a glint, a rivet, a wooden handle', () => maPan(-1, 1)],
  ['Wizard hat', 'A violet cone with a fold, a red band, a wide brim, a hooked tip that lags', () => [...mArt(MA_WIZ, 0, 3), ...mArt(MA_WIZ_TIP.rest, 0, 0)]],
  ['Wand', 'A dark grip, a lit shaft, a glowing tip', () => maWand(0, 6, 'up', false)[0]],
  ['Hard hat', 'A ridged dome with a glint, a band, a deep brim lit on top', () => mArt(MA_HARD, 0, 0)],
  ['Hammer', 'A steel head with a glint, wood, a red grip', () => maHammer(2, 6, 'up')],
  ['Deerstalker', 'A tweed crown, a flap tied up with a bow, peaks front and back', () => mArt(mbHat, 0, 0)],
  ['Magnifier', 'A rim lit and shaded, glass with a glint, a steel collar', () => mbGlass(3, 3, 0)],
  ['Book', 'Lying open: pages rising from the spine, a gutter crease, page edges, a blue cover', () => mArt(mbBookArt, 0, 0)],
  ['Laptop', 'A lid lit on top, a ring logo that glints, a thin deck', () => mArt(MT_LAPTOP, 0, 0)],
  ['Headphones', 'A padded band lit on top, dark cushions', () => jamPhones(2, 3)],
  ['Party hat', 'Stripes round the cone, a fluffy pom-pom', () => mArt(MD_HAT, 0, 0)],
  ['Boxes', 'Cardboard with a shaded side, tape and a label', () => [...mArt(MD_BOX_B, 1, 0), ...mArt(MD_BOX_A, 0, 4)]],
  ['Paper plane', 'Bright wings, a shaded fold, a smoke contour', () => mArt(MD_PLANE_R, 0, 0)],
  ['Beetle', 'A dark head and feeler, a shell with a glint', () => mArt(mbBugF[0], 0, 0)],
  ['Thought bubble', 'A soft cloud lit at the top right', () => mArt(MT_CLOUD, 0, 0)],
].map(([name, note, draw]) => [name, note, () => draw().filter(([, , c]) => c !== 'o' && c !== 'O' && c !== 'd')]);

/* ---------- every scene, ready for the page: a sprite with its frames, its still pose and its loop length ---------- */
const MASCOT_SPRITES = {};
for (const [id, sp] of Object.entries({ ...MSC_JAM, ...MSC_A, ...MSC_B, ...MSC_C, ...MSC_D }))
  MASCOT_SPRITES[id] = Object.assign(sp, { mascot: true, N: MN, period: sp.frames.reduce((a, f) => a + f.ms, 0) / 1000 });
const MASCOT_META = { ...MSC_JAM_META, ...MSC_A_META, ...MSC_B_META, ...MSC_C_META, ...MSC_D_META };
if (typeof module !== 'undefined') module.exports = { MASCOT_SPRITES, MASCOT_META, MASCOT_PROPS, MPAL };
