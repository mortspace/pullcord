/* Variant B pixel sprites. Hand-drawn 13x13 frames with timing. '#' lit, ':' dim, 'W' white-hot, '.' off.
   13 cells is the density where circles stay round, 45 degree lines stay clean and an arrowhead or a pencil point reads,
   while every cell is still visible as a pixel at the default 32 px.
   Pacing rules: motion is eased, so a step holds 30 to 190 ms depending on where it falls in its move; a rest holds at
   least 400 ms; a loop runs 1 to 3.5 s.
   Optional per sprite: still (a pose drawn only when frozen), rest (the frame shown when frozen if there is no still),
   glow (bloom multiplier), trail (decay multiplier; below 1 keeps fast motion crisp). */
const N = 13;
const bm = (...rows) => rows;
const EMPTY = Array.from({ length: N }, () => '.'.repeat(N));
const RANK = { '.': 0, ':': 1, '#': 2, 'W': 3 };
const shift = (b, dx, dy) => b.map((_, r) => Array.from({ length: N }, (__, c) => { const sr = r - dy, sc = c - dx; return (sr >= 0 && sr < N && sc >= 0 && sc < N) ? b[sr][sc] : '.'; }).join(''));
const over = (...bs) => bs[0].map((_, r) => Array.from({ length: N }, (__, c) => { let v = '.'; for (const b of bs) { const ch = b[r][c]; if (RANK[ch] > RANK[v]) v = ch; } return v; }).join(''));
const put = (b, cells, ch = 'W') => b.map((r, y) => r.split('').map((v, x) => cells.some(([cx, cy]) => cx === x && cy === y) ? ch : v).join(''));
const F = (b, ms) => ({ b, ms });
const seq = (...frames) => ({ frames, period: frames.reduce((a, f) => a + f.ms, 0) / 1000 });
const inGrid = cs => cs.filter(([x, y]) => x >= 0 && x < N && y >= 0 && y < N);
/* place [x, y, tone] cells on a bitmap; where cells overlap the brighter tone wins */
const stamp = (cells, base = EMPTY) => { const g = base.map(r => r.split('')); for (const [x, y, ch] of cells) if (x >= 0 && x < N && y >= 0 && y < N && RANK[ch] > RANK[g[y][x]]) g[y][x] = ch; return g.map(r => r.join('')); };
const cellsOf = (rows, dx = 0, dy = 0) => rows.flatMap((r, y) => r.split('').map((c, x) => c !== '.' ? [x + dx, y + dy, c] : null).filter(Boolean));
const restAtLongest = sp => (sp.rest = sp.frames.reduce((bi, f, i, a) => f.ms > a[bi].ms ? i : bi, 0), sp);
/* ease-in-out timing for n motion frames: slow at both ends, fast through the middle. Pixels cannot move by fractions,
   so easing lives in how long each step holds */
const ease = (n, slow, fast) => Array.from({ length: n }, (_, k) => Math.round(fast + (slow - fast) * (1 - Math.sin(Math.PI * (k + 0.5) / n))));

/* thinking: a speech bubble whose three dots ride a wave, the reply-is-coming pattern everyone knows from messaging.
   Each dot brightens, lifts, settles and dims, and the next one starts while it is still up, so the wave overlaps
   instead of ticking from dot to dot */
const BUBBLE = bm(
  '.............',
  '.............',
  '..#########..',
  '.#.........#.',
  '#...........#',
  '#...........#',
  '#...........#',
  '#...........#',
  '.#.........#.',
  '..#.#######..',
  '..##.........',
  '..#..........',
  '.............');
const DOTS = [[3,6],[6,6],[9,6]];
const bubbleWave = k => stamp(DOTS.map(([x, y], i) => { const p = k - i; return p === 1 ? [x, y - 1, '#'] : p === 0 || p === 2 ? [x, y, '#'] : [x, y, k === 'all' ? '#' : ':']; }), BUBBLE);

/* reading: a page with a folded corner and three lines of text. A reading cursor runs along each line and the words it
   has read light up. It dwells on the first word of a line and quickens through the rest, the way eyes read. Then the
   page peels off like real paper: the dog-eared corner lifts, and the sheet folds back over itself along a 45 degree
   crease, its back solid and shaded, the crest of the curl catching the light. It slides off to the bottom-left,
   slow to lift, fast through the middle, and the next document is underneath, waiting to be read */
const PAGE = bm(
  '..######.....',
  '..#....##....',
  '..#....#.#...',
  '..#....####..',
  '..#.......#..',
  '..#.......#..',
  '..#.......#..',
  '..#.......#..',
  '..#.......#..',
  '..#.......#..',
  '..#.......#..',
  '..#.......#..',
  '..#########..');
const TEXT = [[6, [4,5,6,7,8]], [8, [4,5,6,7,8]], [10, [4,5,6]]];
const TEXT_CELLS = TEXT.flatMap(([y, xs]) => xs.map(x => [x, y]));
const readUpTo = k => stamp([...TEXT_CELLS.map(([x, y], i) => [x, y, i < k ? '#' : ':']), ...(k < TEXT_CELLS.length ? [[...TEXT_CELLS[k], 'W']] : [])], PAGE);
const LINE_START = new Set(TEXT.map(([y, xs]) => TEXT_CELLS.findIndex(([cx, cy]) => cy === y && cx === xs[0])));
const LINE_END = new Set(TEXT.map(([y, xs]) => TEXT_CELLS.findIndex(([cx, cy]) => cy === y && cx === xs[xs.length - 1])));
const readMs = k => LINE_START.has(k) ? 190 : LINE_END.has(k) ? 140 : 100;
/* the page peeling along the crease x - y = c. Past the crease the next page shows, unread. On this side lies the
   turned-back sheet: every peeled cell reflected over the crease, its back a dim fill inside a lit edge, free to hang
   past the old page as real paper would. The middle of the crease is white, the light on the curl */
const inPage = (x, y) => x >= 2 && x <= 10 && y >= 0 && y <= 12;
const pageEdge = (x, y) => inPage(x, y) && (x === 2 || x === 10 || y === 0 || y === 12);
const TEXT_SET = new Set(TEXT_CELLS.map(([x, y]) => x + ',' + y));
const peelAt = c => {
  const g = Array.from({ length: N }, (_, y) => Array.from({ length: N }, (_, x) => {
    const text = TEXT_SET.has(x + ',' + y);
    if (x - y > c) return PAGE[y][x] === '#' ? '#' : text ? ':' : '.';
    return inPage(x, y) && (pageEdge(x, y) || text) ? '#' : '.';
  }));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (inPage(x, y) && x - y > c) {
    const fx = y + c, fy = x - c; if (fx >= 0 && fx < N && fy >= 0 && fy < N) g[fy][fx] = pageEdge(x, y) ? '#' : ':';
  }
  const crease = Array.from({ length: N }, (_, y) => [y + c, y]).filter(([x, y]) => inPage(x, y)), mid = (crease.length - 1) / 2;
  crease.forEach(([x, y], i) => { g[y][x] = crease.length >= 3 && Math.abs(i - mid) <= 1 ? 'W' : '#'; });
  return g.map(r => r.join(''));
};
const TURN = [6, 4, 1, -2, -5, -8], TURN_MS = [170, 110, 80, 65, 65, 85];

/* analyzing: four bars rise a beat apart. Each one eases out, overshoots its height by a cell and settles back, like a
   spring. A light runs across their tops, they hold, then they drop away left to right, quickening as they fall */
const BAR_X = [1, 4, 7, 10], BAR_H = [5, 8, 6, 11];
const riseH = (H, p) => p <= 0 ? 0 : p >= 4 ? H : [0, Math.round(0.45 * H), Math.round(0.9 * H), H + 1][p];
const fallH = (H, p) => p <= 0 ? H : p >= 3 ? 0 : [H, Math.round(0.6 * H), Math.round(0.2 * H)][p];
const bars = (hs, light = -1) => stamp(BAR_X.flatMap((x, i) => Array.from({ length: hs[i] }, (_, k) => { const c = i === light && k === hs[i] - 1 ? 'W' : '#'; return [[x, 12 - k, c], [x + 1, 12 - k, c]]; }).flat()));

/* searching: a magnifying glass, a round lens with a glint, a short collar and a solid handle at 45 degrees.
   The whole glass circles, the way the searching glass does on a Mac. It looks around rather than spins: it lingers at
   the top and the bottom of the circle and sweeps quickly through the sides, and the glint on the lens catches the
   light at the top */
const MAG = bm(
  '..###.....',
  '.#...#....',
  '#.:...#...',
  '#:....#...',
  '#.....#...',
  '.#...#....',
  '..###:....',
  '......##..',
  '.......##.',
  '........##');
const magAt = (dx, dy) => stamp(cellsOf(MAG, dx, dy));
const MAG_PATH = [[2,1],[3,1],[3,2],[3,3],[2,3],[1,3],[1,2],[1,1]];
const MAG_MS = [190, 120, 100, 120, 190, 120, 100, 120];
const GLINT = [[2,2],[1,3]];

/* generating: the sparkle pair everyone now reads as AI, a big four-point star and a small one. They pulse in opposite
   phase, so one grows while the other shrinks. Each pops a cell past its size with a white-hot core and settles back,
   and the big one gives a quarter-turn twinkle, a plus that flicks to an x and back, when it is smallest */
const starCells = (cx, cy, r, core) => [...Array.from({ length: 2 * r + 1 }, (_, i) => [cx, cy - r + i, '#']), ...Array.from({ length: 2 * r + 1 }, (_, i) => [cx - r + i, cy, '#']), ...(core ? [[cx-1,cy-1,'#'],[cx+1,cy-1,'#'],[cx-1,cy+1,'#'],[cx+1,cy+1,'#']] : [])];
const xStarCells = (cx, cy, r) => [[cx, cy, '#'], ...Array.from({ length: r }, (_, k) => [[cx - k - 1, cy - k - 1], [cx + k + 1, cy - k - 1], [cx - k - 1, cy + k + 1], [cx + k + 1, cy + k + 1]]).flat().map(([x, y]) => [x, y, '#'])];
const BIG = [5, 8], SMALL = [10, 2];
const sparkle = (r, small, hot) => stamp([...(r < 0 ? xStarCells(...BIG, -r) : starCells(...BIG, r, r >= 2)), ...starCells(...SMALL, small, small >= 2), ...(hot === 'big' ? [[...BIG, 'W']] : hot === 'small' ? [[...SMALL, 'W']] : [])]);

/* writing: a pencil in two tones so it reads as a pencil: eraser, metal band, body, sharpened wood and a graphite point.
   The point traces a line of handwriting as the page slides under it: it rises and falls with every stroke, the ink leaves
   the point bright and dries to a faint line, and the pencil lifts between words. Like a real hand it lingers where a
   stroke turns and at the lift, and moves quickly through the middle of a stroke. */
const PENCIL = [[-8,-8,'#'],[-7,-8,'#'],[-6,-8,'#'],[-7,-7,':'],[-6,-7,':'],[-5,-7,':'],
  [-6,-6,'#'],[-5,-6,'#'],[-4,-6,'#'],[-5,-5,'#'],[-4,-5,'#'],[-3,-5,'#'],[-4,-4,'#'],[-3,-4,'#'],[-2,-4,'#'],[-3,-3,'#'],[-2,-3,'#'],[-1,-3,'#'],
  [-2,-2,':'],[-1,-2,':'],[0,-2,':'],[-1,-1,':'],[0,-1,':'],[0,0,'W']];
const HAND = [11,10,9,10,11,11,10,9,10,11,10,11,0,0];
const TIP = 10;
const handMs = t => { const y = HAND[(TIP + t) % HAND.length]; return y === 0 ? 170 : y === 10 ? 95 : 140; };
const writeAt = t => {
  const W = x => HAND[((x + t) % HAND.length + HAND.length) % HAND.length];
  const ink = Array.from({ length: TIP }, (_, x) => W(x) ? [x, W(x), x >= TIP - 2 ? '#' : ':'] : null).filter(Boolean);
  const y = W(TIP) || 8;
  return stamp(inGrid([...ink, ...PENCIL.map(([dx, dy, c]) => [TIP + dx, y + dy, c])]));
};

/* syncing: two arrows, right along the top and left along the bottom, taking turns like a handoff. One pulls back a cell,
   then dashes off with dim speed lines streaming behind it, and its replacement slides in from the other side, overshoots
   a cell and settles. While one lane moves the other holds, so there is always motion and always an arrow at rest */
const arrowCells = (tip, cy, d) => [[tip, cy], [tip - d, cy - 1], [tip - d, cy], [tip - d, cy + 1], ...[-2, -1, 0, 1, 2].map(k => [tip - 2 * d, cy + k]), ...[3, 4, 5, 6].map(k => [tip - k * d, cy])].map(([x, y]) => [x, y, '#']);
const streak = (tip, cy, d, len) => Array.from({ length: len }, (_, k) => [[tip - (3 + k) * d, cy - 2, ':'], [tip - (3 + k) * d, cy + 2, ':'], ...(k < len - 1 ? [[tip - (8 + k) * d, cy, ':']] : [])]).flat();
/* one lane's handoff: [tip, speed-line length] per step, for the top lane; the bottom lane mirrors it */
const DASH = [[9, 0], [8, 0], [12, 2], [17, 4], [2, 4], [7, 2], [10, 0], [9, 0]];
const DASH_MS = [0, 150, 75, 60, 60, 75, 110, 150];
const lane = (step, top) => { const [tip, len] = DASH[step]; return top ? [...arrowCells(tip, 3, 1), ...streak(tip, 3, 1, len)] : [...arrowCells(12 - tip, 9, -1), ...streak(12 - tip, 9, -1, len)]; };
const syncAt = (topStep, bottomStep) => stamp([...lane(topStep, true), ...lane(bottomStep, false)]);

/* connecting: the Wi-Fi fan, searching the way iOS does it. The whole fan sits dim, so the glyph always reads, and a
   lit wave with a short tail runs out from the white-hot dot across the arcs, twice. Then it connects: the whole fan
   lights with the dot white-hot, holds, and dims again from the dot outward */
const WIFI_DOT = [[6,10]];
const WIFI_ARC = [
  [[5,7],[6,7],[7,7],[4,8],[8,8]],
  [[4,4],[5,4],[6,4],[7,4],[8,4],[3,5],[9,5],[2,6],[10,6]],
  [[4,1],[5,1],[6,1],[7,1],[8,1],[2,2],[3,2],[9,2],[10,2],[1,3],[11,3],[0,4],[12,4]]];
const WIFI = [WIFI_DOT, ...WIFI_ARC];
const fan = tones => stamp(WIFI.flatMap((cs, e) => cs.map(([x, y]) => [x, y, tones[e]])));
const wave = p => fan([0, 1, 2, 3].map(e => e === p ? (e === 0 ? 'W' : '#') : e === p - 1 && e > 0 ? '#' : ':'));

/* uploading / downloading: arrows stream through a tray without stopping, a new arrow every twelve rows. The tray walls
   give a little each time an arrow leaves or lands. Uploads launch: the tray dips, the arrow eases out of it and
   speeds up as it climbs. Downloads fall: each arrow drops in slowly, gathers speed like it has weight and lands hard. */
const TRAY = [[0,9],[0,10],[0,11],[12,9],[12,10],[12,11],...Array.from({ length: 13 }, (_, x) => [x, 12])];
const TRAY_SQUASH = [[0,10],[0,11],[12,10],[12,11],...Array.from({ length: 13 }, (_, x) => [x, 12])];
const ARROW_UP = [[6,0],[5,1],[6,1],[7,1],[4,2],[5,2],[6,2],[7,2],[8,2],[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[6,4],[6,5],[6,6],[6,7]];
const ARROW_GAP = 12;
const arrowStream = (t, up) => { const cs = []; for (const k of [-1, 0, 1]) { const oy = (up ? 12 - t : t - 8) + ARROW_GAP * k; for (const [x, y] of ARROW_UP) { const yy = (up ? y : 7 - y) + oy; if (yy < 12) cs.push([x, yy, '#']); } } return cs; };
const trayFrame = (t, up) => stamp([...(t === 0 ? TRAY_SQUASH : TRAY).map(([x, y]) => [x, y, '#']), ...arrowStream(t, up)]);
/* each step is one row; the time a row takes falls the way it does under gravity, clamped so the slowest is readable */
const GRAVITY_MS = Array.from({ length: ARROW_GAP - 1 }, (_, s) => Math.round(Math.max(45, Math.min(160, 300 * (Math.sqrt(s + 1) - Math.sqrt(s))))));
const streamMs = t => t === 0 ? 150 : GRAVITY_MS[t - 1];

/* done, Stroke and Spring takes: a two-cell check. Both arms are exact 45 degree diagonals, the short arm four steps,
   the long arm eight. */
const CHECK_PAIRS = [[[0,7],[1,7]],[[1,8],[2,8]],[[2,9],[3,9]],[[3,10],[4,10]],[[4,9],[5,9]],[[5,8],[6,8]],[[6,7],[7,7]],[[7,6],[8,6]],[[8,5],[9,5]],[[9,4],[10,4]],[[10,3],[11,3]],[[11,2],[12,2]]];
const strokeTo = (from, to, tip) => put(put(EMPTY, CHECK_PAIRS.slice(from, to).flat(), '#'), tip ? CHECK_PAIRS[to - 1] : [], 'W');
const CHECK = strokeTo(0, CHECK_PAIRS.length, false);
const glint = c => put(CHECK, CHECK_PAIRS.flat().filter(([x]) => x === c || x === c + 1), 'W');

/* done, Morph take (the default): the loader becomes the check, the way Face ID's ring turns into its check.
   Three dots wait in a row and a wave runs through them. They dip, then fly to the three points of the check, easing out:
   one to the end of the short arm, one to the vertex, one to the tip. As they land the end dots lean into the line's
   45 degree angle and the vertex dot drops a cell past its mark and springs back. Then the arms join them, a light runs
   along the check, and it holds. In a loop it comes apart the same way and the dots go back to waiting. */
const DOT = ([x, y], c = '#') => [[x, y, c], [x + 1, y, c], [x, y + 1, c], [x + 1, y + 1, c]];
const DOT_ROW = [[1, 5], [5, 5], [9, 5]];
const DOT_TO = [[0, 7], [3, 9], [11, 2]];
const pairCells = (...is) => is.flatMap(i => CHECK_PAIRS[i]);
const LANDED = [pairCells(0, 1), DOT([3, 9]).map(([x, y]) => [x, y]), pairCells(10, 11)];
const flyAt = (p, tone = '#') => stamp(DOT_ROW.flatMap((r, i) => DOT([Math.round(r[0] + (DOT_TO[i][0] - r[0]) * p), Math.round(r[1] + (DOT_TO[i][1] - r[1]) * p)], tone)));
const waveAt = k => stamp(DOT_ROW.flatMap((r, i) => DOT(i === k ? [r[0], r[1] - 1] : r, i <= k ? '#' : ':')));
const landed = (vertexDrop = 0) => stamp([...LANDED[0], ...LANDED[1].map(([x, y]) => [x, y + vertexDrop]), ...LANDED[2]].map(([x, y]) => [x, y, '#']));
const joined = n => stamp([...LANDED.flat(), ...pairCells(...Array.from({ length: n }, (_, k) => [2, 5, 6, 7, 8, 9][k]))].map(([x, y]) => [x, y, '#']));
const MORPH_IN = [F(stamp(DOT_ROW.flatMap(r => DOT(r, ':'))), 220), ...[0, 1, 2].map(k => F(waveAt(k), 115)), F(flyAt(0), 120), F(stamp(DOT_ROW.flatMap(r => DOT([r[0], r[1] + 1]))), 90),
  F(flyAt(0.5), 70), F(flyAt(0.85), 60), F(landed(1), 75), F(landed(), 90), F(joined(2), 55), F(joined(4), 45), F(joined(6), 60)];
const MORPH_OUT = [F(joined(4), 45), F(joined(1), 50), F(landed(), 70), F(flyAt(0.6), 70), F(flyAt(0.2), 80), F(flyAt(0), 110)];

/* error: a warning triangle with a rounded top, eleven cells wide so it has room to move. The exclamation mark has a
   four-cell bar, a gap, a dot, and two clear rows above the base. It holds, then gives the shake a Mac gives a wrong
   password, quick and settling, with the mark white-hot, and the mark blinks once more as it comes to rest */
const TRI = bm(
  '.............',
  '.....###.....',
  '.....#.#.....',
  '....#...#....',
  '....#...#....',
  '...#.....#...',
  '...#.....#...',
  '..#.......#..',
  '..#.......#..',
  '.#.........#.',
  '.#.........#.',
  '.###########.',
  '.............');
const BANG = [[6,3],[6,4],[6,5],[6,6],[6,8]];
const alarm = (dx, hot) => shift(put(TRI, BANG, hot ? 'W' : '#'), dx, 0);

/* building: a hammer seen from the side drives a real nail into a plank. The nail stands five cells tall and takes two blows,
   sparks flying on each. Then the plank slides along, the finished nail moves off with the others and a new one comes in. */
const NAIL_GAP = 6;
const nailCells = (x0, hy) => [[x0, hy, '#'], [x0 + 1, hy, '#'], [x0 + 2, hy, '#'], ...Array.from({ length: Math.max(0, 11 - hy - 1) }, (_, k) => [x0 + 1, hy + 1 + k, '#'])];
const workshop = (top, headY, slide = 0, spark = false) => stamp(inGrid([
  ...Array.from({ length: N }, (_, x) => [x, 11, ':']), ...Array.from({ length: N }, (_, x) => [x, 12, ':']),
  ...[1, 2].flatMap(k => nailCells(1 + NAIL_GAP * k + slide, 10)),
  ...nailCells(1 + slide, headY), ...(slide ? nailCells(1 + slide - NAIL_GAP, 6) : []),
  ...[1, 2].flatMap(x => [0, 1, 2, 3, 4].map(r => [x, top + r, '#'])), ...Array.from({ length: 10 }, (_, k) => [3 + k, top + 2, '#']),
  ...(spark ? [[0, headY - 1, 'W'], [4, headY - 1, 'W']] : []),
]));

/* debugging: an ant seen from above, crawling diagonally with its head to the top-right. The body is bright: a round head,
   a thorax, a pinched waist and a big abdomen. Legs and antennae are dim, so they read as fine detail and never clutter
   the body. Three legs step at a time. Like a real ant it moves in bursts: it slows to a stop in the middle, its
   antennae twitch as it checks the spot, then it hurries off and the next ant comes in from the bottom-left. */
const ellipseCells = (cx, cy, a, b) => { const out = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const al = ((x - cx) - (y - cy)) / Math.SQRT2, ac = ((x - cx) + (y - cy)) / Math.SQRT2; if ((al / a) ** 2 + (ac / b) ** 2 <= 1) out.push([x, y]); } return out; };
const ANT_BODY = [...ellipseCells(3, 9, 3.3, 2.1), ...ellipseCells(7.5, 4.5, 1.2, 0.9), [6, 6], ...ellipseCells(9.5, 2.5, 1.2, 1.2)];
const mirrorAxis = cs => cs.map(([x, y]) => [12 - y, 12 - x]);
const LEGS_L = { reach: [[[7,3],[7,2],[6,1]], [[6,4],[5,4],[4,3]], [[6,5],[5,5],[4,5]]], tuck: [[[7,3],[6,2]], [[6,4],[5,3]], [[6,5],[5,6]]] };
const ANTENNAE = [[10,1],[10,0],[11,2],[12,2]], ANTENNAE_TWITCH = [[10,1],[11,0],[11,2],[12,3]];
const antCells = (pose, twitch) => {
  const legs = [0, 1, 2].flatMap(k => { const leftReach = pose === 'all' || (k + pose) % 2 === 0, rightReach = pose === 'all' || (k + pose) % 2 === 1;
    return [...(leftReach ? LEGS_L.reach : LEGS_L.tuck)[k], ...mirrorAxis((rightReach ? LEGS_L.reach : LEGS_L.tuck)[k])]; });
  return [...ANT_BODY.map(([x, y]) => [x, y, '#']), ...[...legs, ...(twitch ? ANTENNAE_TWITCH : ANTENNAE)].map(([x, y]) => [x, y, ':'])];
};
const ANT_GAP = 14;
const crawl = (i, twitch) => { const d = i - ANT_GAP / 2, pose = i % 2; return stamp([d - ANT_GAP, d, d + ANT_GAP].flatMap(k => antCells(pose, twitch && k === d).map(([x, y, c]) => [x + k, y - k, c]))); };
/* one loop from the stop in the middle: the twitching pause, then thirteen steps that speed up and slow down again */
const CRAWL_MS = ease(ANT_GAP - 1, 170, 60);
const antLoop = () => [F(crawl(7), 170), F(crawl(7, true), 110), F(crawl(7), 110), F(crawl(7, true), 110), ...CRAWL_MS.map((ms, s) => F(crawl((8 + s) % ANT_GAP), ms))];

/* heartbeat: three heart sizes on a lub-dub. On each beat the heart pops to full size and shrinks back inside a dim
   outline of itself, a halo that lingers a moment and fades, the way a pulse ring spreads and dies */
const HEART_L = bm('.............','..###...###..','.#####.#####.','#############','#############','#############','.###########.','..#########..','...#######...','....#####....','.....###.....','......#......','.............');
const HEART_M = bm('.............','.............','...##...##...','..####.####..','.###########.','.###########.','..#########..','...#######...','....#####....','.....###.....','......#......','.............','.............');
const HEART_S = bm('.............','.............','.............','....#...#....','...###.###...','...#######...','....#####....','.....###.....','......#......','.............','.............','.............','.............');

const edgeOf = b => cellsOf(b).filter(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (b[y + dy] || '')[x + dx] !== '#'));
const halo = b => stamp(edgeOf(HEART_L).map(([x, y]) => [x, y, ':']), b);

/* scanning: a DNA double helix turning. The strand in front is bright, the one behind and the rungs are dim, so it has depth.
   A scan line glides down the helix and back, easing at each end: the row it crosses lights up strand to strand, and two
   dim ticks at the edges mark where it is even when the strands cross */
function dna(phase, scan = -1) {
  const g = EMPTY.map(r => r.split(''));
  for (let r = 0; r < N; r++) {
    const th = r * Math.PI / 6 + phase, s = Math.round(4 * Math.sin(th)), a = 6 + s, b = 6 - s, front = Math.cos(th) >= 0 ? a : b, back = front === a ? b : a;
    if (r === scan) { for (let x = Math.min(a, b) + 1; x < Math.max(a, b); x++) g[r][x] = '#'; g[r][0] = g[r][12] = ':'; g[r][back] = 'W'; g[r][front] = 'W'; continue; }
    if (Math.abs(a - b) >= 4 && r % 2 === 0) for (let x = Math.min(a, b) + 1; x < Math.max(a, b); x++) g[r][x] = ':';
    g[r][back] = ':'; g[r][front] = '#';
  }
  return g.map(r => r.join(''));
}
const SCAN = Array.from({ length: 32 }, (_, k) => Math.round(6 - 6 * Math.cos(Math.PI * (k < 16 ? k : 32 - k) / 16)));

/* breathing: lungs in three sizes; a breath of air travels down the windpipe on the inhale and back up on the exhale.
   A dim outline of the full lungs stays in view as the guide to breathe into, the way a breathing exercise shows its
   target, and the lungs swell to fill it */
const LUNG_L = bm('......#......','......#......','.....#.#.....','..###...###..','.####...####.','#####...#####','#####...#####','#####...#####','#####...#####','#####...#####','.####...####.','..###...###..','.............');
const LUNG_M = bm('......#......','......#......','.....#.#.....','...##...##...','..###...###..','.####...####.','.####...####.','.####...####.','.####...####.','..###...###..','...##...##...','.............','.............');
const LUNG_S = bm('......#......','......#......','.....#.#.....','.............','...##...##...','..###...###..','..###...###..','..###...###..','..###...###..','...##...##...','.............','.............','.............');
const AIR_DOWN = [[6,0],[6,1],[6,2]], AIR_UP = [[6,2],[6,1],[6,0]];
const guide = b => stamp(edgeOf(LUNG_L).map(([x, y]) => [x, y, ':']), b);

/* calculating: a sigma laid down as a dim track. A white-hot head draws it end to end, slow off the mark, fast through
   the middle and slow into the end; the equals sign pops in white and settles; the result holds; then the stroke erases
   from where it began, the tail chasing the head */
const SIGMA = bm('.............','#######......','.#...........','..#..........','...#.........','....#........','.....#.......','....#........','...#.........','..#..........','.#...........','#######......','.............');
const SIGMA_PATH = [[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[1,2],[2,3],[3,4],[4,5],[5,6],[4,7],[3,8],[2,9],[1,10],[0,11],[1,11],[2,11],[3,11],[4,11],[5,11],[6,11]];
const EQ = [[9,5],[10,5],[11,5],[9,7],[10,7],[11,7]];
const sigmaAt = (from, to, eq = '.') => stamp([...SIGMA_PATH.map(([x, y], i) => [x, y, i >= from && i < to ? (i === to - 1 && to < SIGMA_PATH.length ? 'W' : '#') : ':']), ...EQ.map(([x, y]) => [x, y, eq])]);
const DRAW_MS = ease(SIGMA_PATH.length, 90, 32);

const SPRITES = {
  thinking: Object.assign(seq(...[0, 1, 2, 3, 4].map(k => F(bubbleWave(k), 125)), F(bubbleWave(5), 480)), { still: bubbleWave('all') }),
  reading: Object.assign(seq(F(readUpTo(0), 420), ...Array.from({ length: TEXT_CELLS.length - 1 }, (_, k) => F(readUpTo(k + 1), readMs(k + 1))), F(readUpTo(TEXT_CELLS.length), 700), ...TURN.map((c, i) => F(peelAt(c), TURN_MS[i])), F(peelAt(-11), 260)), { still: readUpTo(TEXT_CELLS.length) }),
  analyzing: restAtLongest(seq(...[1, 2, 3, 4, 5, 6, 7].map(f => F(bars(BAR_H.map((H, i) => riseH(H, f - i))), 95)), ...[0, 1, 2, 3].map(i => F(bars(BAR_H, i), 140)), F(bars(BAR_H), 900), ...[1, 2, 3, 4, 5, 6].map(f => F(bars(BAR_H.map((H, i) => fallH(H, f - i))), [90, 75, 65, 60, 60, 60][f - 1])), F(EMPTY, 180))),
  searching: Object.assign(seq(...MAG_PATH.map(([x, y], i) => F(i === 0 ? put(magAt(x, y), GLINT.map(([gx, gy]) => [gx + x, gy + y])) : magAt(x, y), MAG_MS[i]))), { still: magAt(2, 2), trail: 0.6 }),
  generating: Object.assign(seq(F(sparkle(1, 2), 190), F(sparkle(2, 1), 105), F(sparkle(4, 0, 'big'), 125), F(sparkle(3, 0), 620), F(sparkle(3, 1), 110), F(sparkle(2, 2, 'small'), 125), F(sparkle(1, 2), 150), F(sparkle(-1, 2), 110)), { still: sparkle(4, 2) }),
  writing: Object.assign(seq(...HAND.map((_, t) => F(writeAt(t), handMs(t)))), { rest: 3, trail: 0.5 }),
  syncing: Object.assign(seq(F(syncAt(0, 0), 260), ...[1, 2, 3, 4, 5, 6, 7].map(k => F(syncAt(k, 0), DASH_MS[k])), F(syncAt(0, 0), 260), ...[1, 2, 3, 4, 5, 6, 7].map(k => F(syncAt(0, k), DASH_MS[k]))), { still: syncAt(0, 0), trail: 0.6 }),
  connecting: restAtLongest(seq(...[0, 1].flatMap(() => [0, 1, 2, 3, 4, 5].map(p => F(wave(p), p === 5 ? 170 : 115))), F(fan('W###'), 120), F(fan('####'), 1100), F(fan(':###'), 90), F(fan('::##'), 90), F(fan(':::#'), 90), F(fan('::::'), 220))),
  uploading: Object.assign(seq(...Array.from({ length: ARROW_GAP }, (_, t) => F(trayFrame(t, true), streamMs(t)))), { rest: 10, trail: 0.45 }),
  downloading: Object.assign(seq(...Array.from({ length: ARROW_GAP }, (_, t) => F(trayFrame(t, false), streamMs(t)))), { rest: 9, trail: 0.45 }),
  done: restAtLongest(seq(...MORPH_IN, ...Array.from({ length: 14 }, (_, c) => F(glint(c - 1), 35)), F(CHECK, 1150), ...MORPH_OUT)),
  done_stroke: restAtLongest(seq(...CHECK_PAIRS.map((_, k) => F(strokeTo(0, k + 1, true), [80,70,60,55,50,45,45,45,50,55,65,80][k])), F(CHECK, 520), ...Array.from({ length: 14 }, (_, c) => F(glint(c - 1), 35)), F(CHECK, 900), ...CHECK_PAIRS.slice(1).map((_, k) => F(strokeTo(k + 1, CHECK_PAIRS.length, false), 40)), F(EMPTY, 280))),
  done_spring: restAtLongest(seq(F(shift(CHECK, 0, -7), 60), F(shift(CHECK, 0, -4), 60), F(shift(CHECK, 0, -1), 60), F(shift(CHECK, 0, 1), 90), F(put(CHECK, CHECK_PAIRS[3], 'W'), 100), F(CHECK, 1500), F(shift(CHECK, 0, 3), 60), F(shift(CHECK, 0, 7), 60), F(EMPTY, 320))),
  error: Object.assign(seq(F(alarm(0), 1000), F(alarm(-1, true), 65), F(alarm(1, true), 65), F(alarm(-1, true), 75), F(alarm(1, true), 90), F(alarm(0, true), 130), F(alarm(0), 130), F(alarm(0, true), 130), F(alarm(0), 420)), { rest: 0, trail: 0.35 }),
  building: Object.assign(seq(F(workshop(0, 6), 420), F(workshop(1, 6), 90), F(workshop(3, 8, 0, true), 90), F(workshop(3, 8), 130), F(workshop(1, 8), 90), F(workshop(0, 8), 150), F(workshop(3, 8), 90), F(workshop(5, 10, 0, true), 90), F(workshop(5, 10), 150), F(workshop(3, 10), 90), F(workshop(1, 10), 90), F(workshop(0, 10), 120), ...[1, 2, 3, 4, 5].map(k => F(workshop(0, 10, k), ease(5, 135, 80)[k - 1]))), { rest: 0 }),
  debugging: Object.assign(seq(...antLoop()), { still: stamp(antCells('all')), trail: 0.5 }),
  heartbeat: seq(F(HEART_S, 520), F(HEART_L, 90), F(halo(HEART_M), 90), F(halo(HEART_S), 110), F(HEART_S, 40), F(HEART_L, 70), F(halo(HEART_M), 80), F(halo(HEART_S), 120), F(HEART_S, 560)),
  scanning: Object.assign(seq(...SCAN.map((r, k) => F(dna(k * Math.PI / 8, r), 95))), { still: dna(0), trail: 0.5 }),
  breathing: seq(F(guide(LUNG_S), 900), ...AIR_DOWN.map(c => F(guide(put(LUNG_S, [c])), 110)), F(guide(LUNG_M), 320), F(LUNG_L, 1700), ...AIR_UP.map(c => F(put(LUNG_L, [c]), 110)), F(guide(LUNG_M), 320)),
  calculating: restAtLongest(seq(...SIGMA_PATH.map((_, k) => F(sigmaAt(0, k + 1), DRAW_MS[k])), F(sigmaAt(0, 23, 'W'), 110), F(sigmaAt(0, 23, '#'), 1000), ...[4, 8, 12, 16, 20, 23].map(k => F(sigmaAt(k, 23, '#'), 55)), F(sigmaAt(0, 0, ':'), 120), F(sigmaAt(0, 0), 260))),
};
if (typeof module !== 'undefined') module.exports = { SPRITES, EMPTY };
