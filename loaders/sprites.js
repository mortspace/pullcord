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
   light at the top. It reads like a real magnifier: there is a page of fine print under it, too small to see, and only
   through the lens do the lines show, dim, sliding past as the glass moves */
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
const FINE_PRINT = ['.............', '.###.##.####.', '.............', '##.####.###..', '.............', '.####.##.###.', '.............', '###.##.####..', '.............', '.##.###.##.##', '.............', '.............', '.............'];
const LENS = [[2,1],[3,1],[4,1],[1,2],[3,2],[4,2],[5,2],[2,3],[3,3],[4,3],[5,3],[1,4],[2,4],[3,4],[4,4],[5,4],[2,5],[3,5],[4,5]];
const searchAt = (dx, dy, glint) => stamp([...cellsOf(MAG, dx, dy), ...LENS.map(([x, y]) => [x + dx, y + dy]).filter(([x, y]) => FINE_PRINT[y] && FINE_PRINT[y][x] === '#').map(([x, y]) => [x, y, ':']),
  ...(glint ? GLINT.map(([x, y]) => [x + dx, y + dy, 'W']) : [])]);

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
   stroke turns and at the lift, and moves quickly through the middle of a stroke. Halfway through the word it writes
   an i: at the top of the stroke the page stops, the pencil lifts high, taps a dot above the stroke, and carries on. */
const PENCIL = [[-8,-8,'#'],[-7,-8,'#'],[-6,-8,'#'],[-7,-7,':'],[-6,-7,':'],[-5,-7,':'],
  [-6,-6,'#'],[-5,-6,'#'],[-4,-6,'#'],[-5,-5,'#'],[-4,-5,'#'],[-3,-5,'#'],[-4,-4,'#'],[-3,-4,'#'],[-2,-4,'#'],[-3,-3,'#'],[-2,-3,'#'],[-1,-3,'#'],
  [-2,-2,':'],[-1,-2,':'],[0,-2,':'],[-1,-1,':'],[0,-1,':'],[0,0,'W']];
const HAND = [11,10,9,10,11,11,10,9,10,11,10,11,0,0];
const TIP = 10;
const handMs = t => { const y = HAND[(TIP + t) % HAND.length]; return y === 0 ? 170 : y === 10 ? 95 : 140; };
/* the i: the stroke at HAND[I_STEM] peaks at row 9 and gets its dot two rows above. tipY overrides where the point is;
   dotted says the dot at the point has been tapped */
const I_STEM = 7, I_DOT_Y = 7, I_AT = (I_STEM - TIP + HAND.length) % HAND.length;
const writeAt = (t, tipY, dotted, tapping) => {
  const W = x => HAND[((x + t) % HAND.length + HAND.length) % HAND.length];
  const ink = Array.from({ length: TIP }, (_, x) => W(x) ? [x, W(x), x >= TIP - 2 ? '#' : ':'] : null).filter(Boolean);
  const dotX = ((I_STEM - t) % HAND.length + HAND.length) % HAND.length;
  const dot = dotX < TIP ? [[dotX, I_DOT_Y, dotX >= TIP - 2 ? '#' : ':']] : dotX === TIP && dotted ? [[TIP, I_DOT_Y, tapping ? 'W' : '#']] : [];
  const y = tipY != null ? tipY : W(TIP) || 8;
  return stamp(inGrid([...ink, ...dot, ...PENCIL.map(([dx, dy, c]) => [TIP + dx, y + dy, c])]));
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

/* connecting: a plug and a socket, the way two cables join. Apart, the cables are dim: no power. The two halves ease
   toward each other and meet in the middle, the prongs slide into the slots, and the plug pushes home with a click,
   sparks at the seam, then settles back so the prongs show as a seam between the halves. Power flows: light runs out
   from the seam along both cables and they stay lit. Then the power drops and the halves pull apart again. */
const PLUG = ['###..', '###..', '#####', '###..', '#####', '###..', '###..'];
const SOCKET = ['###', '###', ':##', '###', ':##', '###', '###'];
/* plug body at px, socket at sx; cables dim, or lit out to `flow` cells from the bodies with a white head. A prong in
   its slot fills it */
const plugAt = (px, sx, { flow = -1, spark = false } = {}) => stamp([
  ...Array.from({ length: px }, (_, x) => [x, 6, flow < 0 ? ':' : x === px - flow ? 'W' : x > px - flow ? '#' : ':']),
  ...Array.from({ length: N - sx - 3 }, (_, i) => { const x = sx + 3 + i; return [x, 6, flow < 0 ? ':' : i === flow - 1 ? 'W' : i < flow - 1 ? '#' : ':']; }),
  ...cellsOf(SOCKET, sx, 3), ...cellsOf(PLUG, px, 3).filter(([x]) => x < sx), ...(px + 4 >= sx ? [[sx, 5, '#'], [sx, 7, '#']] : []),
  ...(spark ? [[sx, 1, 'W'], [sx, 11, 'W'], [sx - 1, 0, ':'], [sx + 1, 0, ':'], [sx - 1, 12, ':'], [sx + 1, 12, ':']] : [])]);
const PLUG_LIT = plugAt(3, 7, { flow: 9 });

/* connecting, Rise take: the Wi-Fi fan built by its own dot. The dot crouches, jumps, and where it peaks it spreads
   sideways into an arc, slowing into the top of the jump; a fresh dot pops up at the base and jumps higher, three
   times, until the fan is whole. Connected, the dot glows white; then the arcs fade from the outside in. */
const WIFI_DOT = [6, 10];
const WIFI_ARC = [
  [[5,7],[6,7],[7,7],[4,8],[8,8]],
  [[4,4],[5,4],[6,4],[7,4],[8,4],[3,5],[9,5],[2,6],[10,6]],
  [[4,1],[5,1],[6,1],[7,1],[8,1],[2,2],[3,2],[9,2],[10,2],[1,3],[11,3],[0,4],[12,4]]];
const ARC_TOP = [7, 4, 1];
const fanCells = (arcs, tone = '#') => arcs.flatMap(k => WIFI_ARC[k].map(([x, y]) => [x, y, tone]));
const splat = (k, stage) => stage >= 2 ? WIFI_ARC[k] : WIFI_ARC[k].filter(([x, y]) => y === ARC_TOP[k] && Math.abs(x - 6) <= (stage ? 2 : 1));
const RISE_PATH = [[9, 8], [8, 6, 5], [8, 5, 3, 2]], RISE_MS = [[80, 90], [60, 70, 90], [55, 60, 70, 90]];
const RISE = [F(stamp([[...WIFI_DOT, '#']]), 300), ...[0, 1, 2].flatMap(k => {
  const built = Array.from({ length: k }, (_, i) => i);
  return [F(stamp([...fanCells(built), [5, 10, '#'], [6, 10, '#'], [7, 10, '#']]), 100),
    ...RISE_PATH[k].map((y, i) => F(stamp([...fanCells(built), [6, y, '#']]), RISE_MS[k][i])),
    ...[0, 1, 2].map(st => F(stamp([...fanCells(built), ...splat(k, st).map(([x, y]) => [x, y, '#']), ...(st === 2 ? [[...WIFI_DOT, 'W']] : [])]), [60, 60, 110][st]))];
}), F(stamp([...fanCells([0, 1, 2]), [...WIFI_DOT, 'W']]), 1000),
  F(stamp([...fanCells([0, 1]), ...fanCells([2], ':'), [...WIFI_DOT, '#']]), 80), F(stamp([...fanCells([0]), ...fanCells([1], ':'), [...WIFI_DOT, '#']]), 80), F(stamp([...fanCells([0], ':'), [...WIFI_DOT, '#']]), 80)];

/* connecting, Ripple take: a drop of signal falls onto the dot and the splash spreads out as the Wi-Fi arcs, each one
   rising a beat after the last. Connected, the fan holds lit with the dot white, then drains back into the dot. */
const RIPPLE = [F(stamp([[...WIFI_DOT, ':']]), 260), ...[0, 2, 4, 6, 8].map((y, i) => F(stamp([[6, y, '#'], ...(i > 1 ? [[6, y - 1, ':']] : []), [...WIFI_DOT, ':']]), [130, 95, 75, 65, 55][i])),
  F(stamp([[...WIFI_DOT, 'W'], [5, 9, ':'], [7, 9, ':']]), 80), F(stamp([...fanCells([0]), [...WIFI_DOT, '#']]), 80), F(stamp([...fanCells([0, 1]), [...WIFI_DOT, '#']]), 85),
  F(stamp([...fanCells([0, 1, 2]), [...WIFI_DOT, '#']]), 95), F(stamp([...fanCells([0, 1, 2]), [...WIFI_DOT, 'W']]), 1000),
  F(stamp([...fanCells([0, 1]), ...fanCells([2], ':'), [...WIFI_DOT, '#']]), 80), F(stamp([...fanCells([0]), ...fanCells([1], ':'), [...WIFI_DOT, '#']]), 80), F(stamp([...fanCells([0], ':'), [...WIFI_DOT, '#']]), 90)];

/* uploading / downloading, Stream take: arrows stream through a tray without stopping, a new arrow every twelve rows.
   Downloads land with a small squash of the tray walls instead of a flash. */
const TRAY = [[0,9],[0,10],[0,11],[12,9],[12,10],[12,11],...Array.from({ length: 13 }, (_, x) => [x, 12])];
const TRAY_SQUASH = [[0,10],[0,11],[12,10],[12,11],...Array.from({ length: 13 }, (_, x) => [x, 12])];
const ARROW_UP = [[6,0],[5,1],[6,1],[7,1],[4,2],[5,2],[6,2],[7,2],[8,2],[3,3],[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[6,4],[6,5],[6,6],[6,7]];
const ARROW_GAP = 12;
const arrowStream = (t, up) => { const cs = []; for (const k of [-1, 0, 1]) { const oy = (up ? 12 - t : t - 8) + ARROW_GAP * k; for (const [x, y] of ARROW_UP) { const yy = (up ? y : 7 - y) + oy; if (yy < 12) cs.push([x, yy, '#']); } } return cs; };
const trayFrame = (t, up) => stamp([...(!up && t === 0 ? TRAY_SQUASH : TRAY).map(([x, y]) => [x, y, '#']), ...arrowStream(t, up)]);

/* Cloud take: the iCloud picture. A cloud sits at the top; downloads come out of its underside and fall away below,
   uploads rise into it and vanish inside. The arrows are smaller so a whole one fits under the cloud. */
const CLOUD = ['......###....', '.....#...#...', '..###.....#..', '.#.........#.', '#...........#', '#...........#', '.###########.'];
const SMALL_ARROW = [[2,0],[1,1],[2,1],[3,1],[0,2],[1,2],[2,2],[3,2],[4,2],[2,3],[2,4],[2,5]];
const CLOUD_GAP = 7;
const cloudFrame = (t, up) => stamp([...cellsOf(CLOUD), ...[-1, 0, 1, 2].flatMap(k => SMALL_ARROW.map(([x, y]) => {
  const top = up ? N - t + CLOUD_GAP * k : 7 - CLOUD_GAP + t + CLOUD_GAP * k;
  return [x + 4, up ? top + y : top + 5 - y, '#'];
})).filter(([, y]) => y > 6)]);

/* Dock take (downloading): each arrow comes down and eases to a stop on a progress line, never hitting it. Where its
   point touches, the line lights, the filled part grows out from the middle, and the arrow melts into it. Three
   arrows fill the line; a light runs along it and it empties for the next file. */
const dockLine = (fill, hot) => Array.from({ length: 11 }, (_, i) => { const x = 1 + i, lit = Math.abs(x - 6) <= fill; return [x, 12, hot != null && Math.abs(x - hot) <= 0 ? 'W' : lit ? '#' : ':']; });
const arrowDownAt = (tip, tone = '#') => ARROW_UP.map(([x, y]) => [x, tip - y, tone]);
const DOCK = [0, 1, 2].flatMap(n => [-1, 3, 6, 8, 10, 11].map((tip, i) => F(stamp([...dockLine(n * 2 - 1), ...arrowDownAt(tip)]), [120, 80, 75, 85, 110, 150][i]))
  .concat([F(stamp([...dockLine(n * 2 + 1), ...arrowDownAt(11, ':'), [6, 12, 'W']]), 110), F(stamp(dockLine(n * 2 + 1)), 90)]))
  .concat([...[1, 3, 5, 7, 9, 11].map(x => F(stamp(dockLine(5, x)), 45)), F(stamp(dockLine(5)), 300), F(stamp(dockLine(-1)), 120)]);

/* Launch take (uploading): the arrow stands on a pad like a rocket. It crouches a cell, its shaft compressing, puffs,
   and lifts off slow then faster, a dim exhaust trailing under it, and is gone; the next arrow rises out of the pad
   and settles. */
const PAD = Array.from({ length: 7 }, (_, i) => [3 + i, 12, '#']);
const arrowUpAt = (tip, below = 12) => ARROW_UP.map(([x, y]) => [x, tip + y, '#']).filter(([, y]) => y < below);
const exhaust = (tip, n) => Array.from({ length: n }, (_, k) => [6, tip + 9 + k, ':']);
const LAUNCH = [F(stamp([...PAD, ...arrowUpAt(4)]), 420), F(stamp([...PAD, ...arrowUpAt(5)]), 120), F(stamp([...PAD, ...arrowUpAt(5), [2, 11, ':'], [10, 11, ':']]), 90),
  ...[[3, 1], [1, 2], [-2, 3], [-6, 3], [-11, 2]].map(([tip, n], i) => F(stamp([...PAD, ...arrowUpAt(tip), ...exhaust(tip, n)]), [110, 80, 65, 55, 60][i])),
  ...[11, 9, 7, 5].map((tip, i) => F(stamp([...PAD, ...arrowUpAt(tip)]), [110, 90, 100, 130][i]))];

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
const GLINT_RUN = () => Array.from({ length: 14 }, (_, c) => F(glint(c - 1), 35));

/* a polyline through float points, rasterised densely; unless thin, steep runs get a second cell to the right so the
   weight matches the check's two-cell stroke. Thin lines step a whole cell at a time so 45 degree lines stay exact */
const pathCells = (pts, thin) => {
  const out = new Map();
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * (thin ? 1 : 4)) || 1, steep = !thin && Math.abs(y1 - y0) >= 0.7 * Math.abs(x1 - x0);
    for (let k = 0; k <= n; k++) { const x = Math.round(x0 + (x1 - x0) * k / n), y = Math.round(y0 + (y1 - y0) * k / n); out.set(x + ',' + y, [x, y]); if (steep && x + 1 < N) out.set((x + 1) + ',' + y, [x + 1, y]); }
  }
  return [...out.values()];
};
const lerp2 = (a, b, p) => [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p];

/* done, Bend take: progress becomes the check. A dim bar fills from the left like a progress bar; full, it bends: the
   left part dips to make the vertex and the right end swings up to the tip, overshooting a cell, and settles as the
   check. In a loop it straightens back into an empty bar. */
const BAR_Y = 6, SPINE_FLAT = [[0, BAR_Y], [3.5, BAR_Y], [12, BAR_Y]], SPINE_CHECK = [[0.5, 7], [3.5, 10], [11.5, 2]];
const barAt = fill => stamp(Array.from({ length: N }, (_, x) => [x, BAR_Y, x < fill ? '#' : ':']));
const bendAt = p => stamp(pathCells(SPINE_FLAT.map((a, i) => lerp2(a, SPINE_CHECK[i], p))).map(([x, y]) => [x, y, '#']));
const BEND = [F(barAt(0), 260), ...[2, 4, 7, 10, 13].map((k, i) => F(barAt(k), [150, 120, 110, 120, 160][i])), F(bendAt(0.3), 70), F(bendAt(0.65), 60), F(bendAt(1.15), 70), F(CHECK, 90),
  ...GLINT_RUN(), F(CHECK, 1100), F(bendAt(0.6), 70), F(bendAt(0.25), 70), F(barAt(13), 90)];

/* done, Skate take: a dot rides the check into being. It drops onto the end of the short arm, slides down gathering
   speed and leaving the stroke behind it, squashes flat in the vertex, then rides up the long arm slowing as it climbs,
   hops at the top, and lands as the tip. */
const rider = k => { const [[x, y]] = CHECK_PAIRS[k]; return [[x, y - 1], [x + 1, y - 1]]; };
const skateAt = (k, extra = []) => stamp([...CHECK_PAIRS.slice(0, k).flat().map(([x, y]) => [x, y, '#']), ...extra.map(([x, y]) => [x, y, '#'])]);
const SKATE = [F(stamp([[0, 3, '#'], [1, 3, '#'], [0, 4, '#'], [1, 4, '#']]), 200), F(skateAt(0, [...rider(0), ...CHECK_PAIRS[0]]), 120),
  ...[1, 2, 3].map((k, i) => F(skateAt(k, [...rider(k), ...CHECK_PAIRS[k]]), [90, 65, 50][i])), F(skateAt(4, [[2, 10], [5, 10]]), 80),
  ...[4, 5, 6, 7, 8, 9, 10].map((k, i) => F(skateAt(k, [...rider(k), ...CHECK_PAIRS[k]]), [40, 40, 45, 50, 60, 75, 95][i])), F(skateAt(11, [[11, 0], [12, 0], [11, 1], [12, 1]]), 110), F(CHECK, 90),
  ...GLINT_RUN(), F(CHECK, 1100), ...CHECK_PAIRS.slice(1).map((_, k) => F(strokeTo(k + 1, CHECK_PAIRS.length, false), 35))];

/* done, Flip take: the check turns over like a coin. It arrives edge-on as a bright sliver, opens out to full width,
   holds, and turns away again. */
const flipAt = (w, tone = '#') => stamp(CHECK_PAIRS.flat().map(([x, y]) => [Math.round(6 + (x - 6) * w), y, tone]));
const FLIP = [F(flipAt(0.08, 'W'), 120), F(flipAt(0.35), 80), F(flipAt(0.7), 70), F(CHECK, 100), F(flipAt(0.85), 60), F(CHECK, 90), ...GLINT_RUN(), F(CHECK, 1150), F(flipAt(0.6), 70), F(flipAt(0.25), 70)];

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

/* error, Glitch take: the sign breaks up like a bad signal. Bands of rows tear sideways, a row drops out to dim, a
   few stray white cells flicker, and it snaps back whole; twice, irregularly, then it holds. */
const SIGN = put(TRI, BANG, '#');
const glitch = (bands, dim = [], noise = []) => stamp([...SIGN.flatMap((r, y) => { const band = bands.find(([a, b]) => y >= a && y <= b); const dx = band ? band[2] : 0;
  return r.split('').map((c, x) => c === '.' ? null : [x + dx, y, dim.includes(y) ? ':' : c]).filter(Boolean); }), ...noise.map(([x, y]) => [x, y, 'W'])]);
const GLITCH = [F(SIGN, 900), F(glitch([[2, 4, 2], [8, 9, -1]], [], [[0, 3], [12, 8]]), 55), F(glitch([[5, 7, -2]], [3]), 45), F(SIGN, 70), F(glitch([[1, 3, -1], [9, 11, 1]], [6], [[11, 2]]), 50),
  F(glitch([[4, 8, 1]], [], [[1, 6], [2, 6]]), 40), F(SIGN, 600), F(glitch([[6, 8, 2]], [7]), 50), F(SIGN, 300)];

/* error, Build take: the warning sign assembles itself. Both sides run down from the rounded top at once, the base
   closes from the two corners to the middle, easing as it meets, then the mark pops in white, settles, and the sign
   gives one small shake. In a loop it erases and builds again. */
const TRI_LEFT = [[5,1],[5,2],[4,3],[4,4],[3,5],[3,6],[2,7],[2,8],[1,9],[1,10],[1,11]];
const TRI_SIDES = k => [[6, 1], ...TRI_LEFT.slice(0, k).flatMap(([x, y]) => [[x, y], [12 - x, y]])];
const TRI_BASE = k => Array.from({ length: k }, (_, i) => [[2 + i, 11], [10 - i, 11]]).flat();
const buildAt = (k, b = 0, mark) => stamp([...[...TRI_SIDES(k), ...TRI_BASE(b)].map(([x, y]) => [x, y, '#']), ...(mark ? BANG.map(([x, y]) => [x, y, mark]) : [])]);
const BUILD = [F(buildAt(0), 160), ...[2, 4, 6, 8, 10, 11].map((k, i) => F(buildAt(k), [80, 60, 50, 50, 60, 70][i])), ...[2, 4, 5].map((b, i) => F(buildAt(11, b), [55, 70, 90][i])),
  F(buildAt(11, 5, 'W'), 110), F(alarm(0), 120), F(alarm(-1), 60), F(alarm(1), 70), F(alarm(0), 1100), F(buildAt(11, 5, ':'), 90), F(buildAt(6, 0), 70)];

/* error, Pulse take: an alarm. The mark flashes white and a dim halo one cell outside the sign flashes with it and
   fades, twice in quick succession, like a siren, then it holds. */
const HALO_TRI = ['.....###.....', '.....#.#.....', '....#...#....', '....#...#....', '...#.....#...', '...#.....#...', '..#.......#..', '..#.......#..', '.#.........#.', '.#.........#.', '#...........#', '#...........#', '#############'];
const pulseAt = (mark, halo) => stamp([...(halo ? cellsOf(HALO_TRI).map(([x, y]) => [x, y, ':']) : []), ...cellsOf(TRI).map(([x, y]) => [x, y, '#']), ...BANG.map(([x, y]) => [x, y, mark])]);
const PULSE = [F(pulseAt('#'), 900), F(pulseAt('W', true), 110), F(pulseAt('#'), 120), F(pulseAt('W', true), 110), F(pulseAt('#'), 700)];

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

/* debugging: an ant seen from above, crawling diagonally with its head to the top-right, drawn cute: a big round head
   with two bright eyes, a small thorax, and a round abdomen no bigger than the head, pinched at the neck and the waist
   by single diagonal joints. Short dim legs step three at a time and two bobble antennae lead. Like a real ant it moves
   in bursts: it slows to a stop in the middle, its antennae twitch and it blinks as it checks the spot, then it hurries
   off and the next ant comes in from the bottom-left. */
const blob4 = (x0, y0, keep) => cellsOf(['.##.', '####', '####', '.##.'], x0, y0).map(([x, y]) => [x, y]).concat([keep]);
const ANT_BODY = [...blob4(7, 2, [7, 5]), [5, 6], [6, 6], [5, 7], [6, 7], ...blob4(1, 8, [4, 8])];
const ANT_EYES = [[8, 3], [9, 4]];
const mirrorAxis = cs => cs.map(([x, y, ...r]) => [12 - y, 12 - x, ...r]);
const LEGS_L = { reach: [[[5,5],[5,4]], [[4,5],[3,4]], [[4,6],[3,6]]], tuck: [[[5,5],[6,4]], [[4,5],[4,4]], [[4,6],[3,7]]] };
const ANTENNAE = [[7,1,':'],[6,0,'#']], ANTENNAE_TWITCH = [[8,1,':'],[8,0,'#']];
const antCells = (pose, twitch, blink) => {
  const legs = [0, 1, 2].flatMap(k => { const leftReach = pose === 'all' || (k + pose) % 2 === 0, rightReach = pose === 'all' || (k + pose) % 2 === 1;
    return [...(leftReach ? LEGS_L.reach : LEGS_L.tuck)[k], ...mirrorAxis((rightReach ? LEGS_L.reach : LEGS_L.tuck)[k])]; });
  const an = twitch ? ANTENNAE_TWITCH : ANTENNAE;
  return [...ANT_BODY.map(([x, y]) => [x, y, '#']), ...ANT_EYES.map(([x, y]) => [x, y, blink ? '#' : 'W']), ...legs.map(([x, y]) => [x, y, ':']), ...an, ...mirrorAxis(an)];
};
const ANT_GAP = 14;
const crawl = (i, twitch, blink) => { const d = i - ANT_GAP / 2, pose = i % 2; return stamp([d - ANT_GAP, d, d + ANT_GAP].flatMap(k => antCells(pose, twitch && k === d, blink && k === d).map(([x, y, c]) => [x + k, y - k, c]))); };
/* one loop from the stop in the middle: the twitching pause, then thirteen steps that speed up and slow down again */
const CRAWL_MS = ease(ANT_GAP - 1, 170, 60);
const antLoop = () => [F(crawl(7), 170), F(crawl(7, true), 110), F(crawl(7, false, true), 90), F(crawl(7), 110), F(crawl(7, true), 110), ...CRAWL_MS.map((ms, s) => F(crawl((8 + s) % ANT_GAP), ms))];

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

/* calculating, Operators take: the four operators turn into one another, the way a calculator thinks. The plus pulls
   its arms in and blooms out again on the diagonals as a times, overshooting a cell; the times folds flat into a minus, the minus throws its two dots out above and below into a
   divide, overshooting and settling, the divide pulls the dots back and splits into an equals, and the equals closes up
   and grows the plus again. */
const opLines = lines => stamp(lines.flatMap(pts => pathCells(pts, true)).map(([x, y]) => [x, y, '#']).filter(([x, y]) => x >= 0 && x < N && y >= 0 && y < N));
const plusR = r => opLines([[[6 - r, 6], [6 + r, 6]], [[6, 6 - r], [6, 6 + r]]]), timesR = r => opLines([[[6 - r, 6 - r], [6 + r, 6 + r]], [[6 - r, 6 + r], [6 + r, 6 - r]]]);
const OP_PLUS = stamp([...Array.from({ length: 9 }, (_, i) => [[2 + i, 6, '#'], [6, 2 + i, '#']]).flat()]);
const OP_MINUS = stamp(Array.from({ length: 9 }, (_, i) => [2 + i, 6, '#']));
const flatX = h => opLines([[[2, 6 - h], [10, 6 + h]], [[2, 6 + h], [10, 6 - h]]]);
const divideAt = d => stamp([...Array.from({ length: 9 }, (_, i) => [2 + i, 6, '#']), [6, 6 - d, '#'], [6, 6 + d, '#']]);
const equalsAt = d => stamp(Array.from({ length: 9 }, (_, i) => [[2 + i, 6 - d, '#'], [2 + i, 6 + d, '#']]).flat());
const OPERATORS = [F(OP_PLUS, 420), F(plusR(2), 60), F(plusR(1), 50), F(timesR(1), 50), F(timesR(3), 55), F(timesR(5), 60), F(timesR(4), 300),
  F(flatX(2), 70), F(OP_MINUS, 260), F(divideAt(2), 60), F(divideAt(4), 60), F(divideAt(3), 300),
  F(divideAt(1), 60), F(equalsAt(1), 60), F(equalsAt(2), 300), F(equalsAt(1), 60), F(stamp([...Array.from({ length: 9 }, (_, i) => [2 + i, 6, '#']), [6, 5, '#'], [6, 7, '#']]), 55),
  F(stamp([...Array.from({ length: 9 }, (_, i) => [2 + i, 6, '#']), [6, 4, '#'], [6, 5, '#'], [6, 7, '#'], [6, 8, '#']]), 55)];

/* calculating, Keypad take: a calculator. Nine keys sit dim under a display; keys press in a quick rhythm, each one
   lighting white as it goes down, and every press adds a digit to the display. The equals key, bottom right, comes
   last: the display flashes the answer, holds, and clears. */
const KEY = (c, r) => [[c * 5, 5 + r * 3], [c * 5 + 1, 5 + r * 3], [c * 5 + 2, 5 + r * 3], [c * 5, 6 + r * 3], [c * 5 + 1, 6 + r * 3], [c * 5 + 2, 6 + r * 3]];
const DISPLAY = [':::::::::::::', ':...........:', ':::::::::::::'];
const padAt = (pressed, digits, flash) => stamp([...cellsOf(DISPLAY), ...Array.from({ length: digits }, (_, i) => [10 - i * 2, 1, flash ? 'W' : '#']),
  ...[0, 1, 2].flatMap(r => [0, 1, 2].flatMap(c => KEY(c, r).map(([x, y]) => [x, y, pressed && pressed[0] === c && pressed[1] === r ? 'W' : ':'])))]);
const PRESSES = [[0, 0], [1, 1], [2, 0], [0, 2]];
const KEYPAD = [F(padAt(null, 0), 360), ...PRESSES.flatMap((k, i) => [F(padAt(k, i), 90), F(padAt(null, i + 1), [150, 120, 160, 200][i])]),
  F(padAt([2, 2], 4), 110), F(padAt(null, 5, true), 140), F(padAt(null, 5), 900), F(padAt(null, 0), 200)];

/* ---------- more takes: each state comes in several options. The ids are <state>_<take> and the playground lists them
   under Options. ---------- */
/* New options for thinking, reading and analyzing. Every name here carries its state's prefix: thk, rdg, anl. */

/* thinking, Bulb take: the idea lighting up. A light bulb with a round glass, a neck, a banded screw base and a tall
   filament standing on two stems out of the base. It starts cold, the filament dim. It warms up the way an old bulb
   strikes: it catches, drops out, catches again a little longer, drops out, then holds, and its tip goes white-hot.
   The light spreads from the tip until the whole glass glows, and rays fan out around it, the top one first, then the
   diagonals, then the sides. It holds lit, then the rays go, the glow pulls back into the filament and it cools. */
const thkGLASS = cellsOf([
  '.............',
  '.............',
  '....#####....',
  '...#.....#...',
  '..#.......#..',
  '..#.......#..',
  '..#.......#..',
  '...#.....#...',
  '....#...#....',
  '....#####....',
  '.............',
  '....#####....',
  '.....###.....']);
const thkFIL = [[6, 4], [5, 5], [7, 5], [5, 6], [7, 6], [5, 7], [7, 7], [5, 8], [7, 8]], thkTIP = [6, 4];
const thkGLOW = cellsOf([
  '.............',
  '.............',
  '.............',
  '....:::::....',
  '...:::::::...',
  '...:::::::...',
  '...:::::::...',
  '....:::::....',
  '.....:::.....']);
const thkRAYS = [[6, 0], [2, 1], [10, 1], [0, 5], [12, 5]];
/* fil: the filament's tone; hot: white tip; glow: how far the light has spread from the tip; rays: a tone per ray */
const thkBulb = (fil, { hot = false, glow = 0, rays = [] } = {}) => stamp([...thkGLASS, ...thkFIL.map(([x, y]) => [x, y, fil]), ...(hot ? [[...thkTIP, 'W']] : []),
  ...thkGLOW.filter(([x, y]) => Math.hypot(x - 6, y - 4.5) <= glow), ...rays.map((t, k) => t ? [...thkRAYS[k], t] : null).filter(Boolean)]);
const thkLIT = { hot: true, glow: 9 };
const thkBULB = [
  F(thkBulb(':'), 450), F(thkBulb('#'), 70), F(thkBulb(':'), 110), F(thkBulb('#'), 60), F(thkBulb(':'), 180), F(thkBulb('#'), 100),
  F(thkBulb('#', { hot: true }), 90), F(thkBulb('#', { hot: true, glow: 1.6 }), 60), F(thkBulb('#', { hot: true, glow: 2.6, rays: [':'] }), 60),
  F(thkBulb('#', { ...thkLIT, rays: ['#', ':', ':'] }), 70), F(thkBulb('#', { ...thkLIT, rays: ['#', '#', '#', ':', ':'] }), 70),
  F(thkBulb('#', { ...thkLIT, rays: ['#', '#', '#', '#', '#'] }), 1000),
  F(thkBulb('#', { ...thkLIT, rays: [':', ':', ':', ':', ':'] }), 110), F(thkBulb('#', { hot: true, glow: 2.6 }), 90), F(thkBulb('#', { glow: 1.6 }), 90), F(thkBulb('#'), 120)];

/* thinking, Cloud take: a thought cloud with its trail of bubbles, the one from comic strips. Thoughts rise: the
   bubble by the cloud floats up into it and through its edge, and goes on inside as a bright point to the middle, while
   the small bubble below moves up and grows to take its place and a new one appears at the bottom. The first thought
   leaves a glowing point in the middle of the cloud. The second one meets it and they spark into an idea: a white-hot
   twinkle that flares out sideways, settles, holds and fades away. */
const thkCLOUD = cellsOf([
  '...###.......',
  '..#...#.###..',
  '.#.....#...#.',
  '#...........#',
  '#...........#',
  '#...........#',
  '.#.........#.',
  '..#########..']);
const thkBub = (x, y, big, t = '#') => big ? [[x, y, t], [x + 1, y, t], [x, y + 1, t], [x + 1, y + 1, t]] : [[x, y, t]];
const thkSPARK = [[],
  [[6, 4, ':']],
  [[6, 4, 'W'], [5, 4, '#'], [7, 4, '#'], [6, 3, '#'], [6, 5, '#']],
  [[6, 4, 'W'], [5, 4, '#'], [7, 4, '#'], [6, 3, '#'], [6, 5, '#'], [4, 4, '#'], [8, 4, '#'], [3, 4, ':'], [9, 4, ':']],
  [[6, 4, '#'], [5, 4, ':'], [7, 4, ':'], [6, 3, ':'], [6, 5, ':']]];
const thkCloud = (parts, spark = 0) => stamp([...thkCLOUD, ...parts.flat(), ...thkSPARK[spark]]);
const thkREST = [thkBub(2, 9, true), thkBub(0, 12, false)];
/* one thought's journey: up into the cloud and through its edge, a point inside gliding to the middle. The trail moves
   up behind it. `before` is the spark while it travels, `after` once it arrives */
const thkThought = (before, after, rest) => [
  F(thkCloud([thkBub(2, 8, true), thkBub(1, 11, false)], before), 130),
  F(thkCloud([thkBub(2, 6, true), thkBub(1, 10, true)], before), 90),
  F(thkCloud([[[4, 6, '#']], thkBub(2, 9, true), thkBub(0, 12, false, ':')], before), 60),
  F(thkCloud([[[5, 5, '#']], ...thkREST], before), 75),
  F(thkCloud(thkREST, after), rest)];
const thkCLOUDF = [F(thkCloud(thkREST), 420), ...thkThought(0, 1, 420), ...thkThought(1, 3, 110), F(thkCloud(thkREST, 2), 900), F(thkCloud(thkREST, 4), 120), F(thkCloud(thkREST, 1), 120)];

/* reading, Book take: an open book, two pages with rounded outer corners dipping into the spine, three lines of text on
   each. The lines are read one after another, left page then right, each one lighting as it is read. Then the right
   page turns: its corner lifts, it rises and narrows toward the spine, stands on edge, and comes down over the left
   page, its back shaded like real paper, a glint of light riding its free edge the whole way. It lands, the shade
   goes as it lies flat, and the next spread is waiting to be read */
const rdgSPREAD = cellsOf([
  '.............',
  '.............',
  '.###.....###.',
  '#...##.##...#',
  '#.....#.....#',
  '#.....#.....#',
  '#.....#.....#',
  '#.....#.....#',
  '#.....#.....#',
  '#.....#.....#',
  '#.....#.....#',
  '.#####.#####.',
  '......#......']);
const rdgLEFT = rdgSPREAD.filter(([x]) => x <= 6), rdgRIGHT = rdgSPREAD.filter(([x]) => x >= 6);
const rdgLINES = [5, 7, 9];
const rdgText = (right, read) => rdgLINES.flatMap((y, i) => [2, 3, 4].map(x => [right ? 12 - x : x, y, i < read ? '#' : ':']));
/* the turning page, hinged on the spine: its free edge stands at x = 6 + w, lifted by `lift` rows. Shaded inside, lit
   edges, the top of the free edge white */
const rdgTurn = (w, lift) => {
  const top = [6 + w, 3 - lift], bot = [6 + w, 11 - lift];
  const fill = [];
  for (let y = 0; y < N; y++) for (let x = Math.min(6, 6 + w); x <= Math.max(6, 6 + w); x++) {
    const t = w === 0 ? 0 : (x - 6) / w;
    if (y > 4 + (top[1] - 4) * t && y < 12 + (bot[1] - 12) * t) fill.push([x, y, ':']);
  }
  return [...fill, ...pathCells([[6, 4], top, bot, [6, 12]], true).map(([x, y]) => [x, y, x === top[0] && y === Math.max(0, top[1]) ? 'W' : '#'])];
};
/* readL / readR: lines read on each page; turn: [w, lift] of a page in the air, which hides what it covers */
const rdgBook = (readL, readR, turn) => {
  const page = turn ? rdgTurn(...turn) : [], covered = new Set(page.map(([x, y]) => x + ',' + y));
  return stamp([...[...rdgLEFT, ...rdgText(false, readL), ...rdgRIGHT, ...rdgText(true, readR)].filter(([x, y]) => !covered.has(x + ',' + y)), ...page]);
};
const rdgLANDED = stamp([...rdgLEFT, ...cellsOf(['', '', '', '.:::', '.:::::', '.:::::', '.:::::', '.:::::', '.:::::', '.:::::', '.:::::']), ...rdgRIGHT, ...rdgText(true, 0)]);
const rdgBOOK = [
  F(rdgBook(0, 0), 420), F(rdgBook(1, 0), 190), F(rdgBook(2, 0), 160), F(rdgBook(3, 0), 190), F(rdgBook(3, 1), 190), F(rdgBook(3, 2), 160), F(rdgBook(3, 3), 420),
  ...[[6, 1], [5, 2], [3, 3], [0, 3], [-3, 3], [-5, 2], [-6, 1]].map((t, i) => F(rdgBook(3, 0, t), [150, 110, 75, 60, 65, 90, 110][i])), F(rdgLANDED, 130)];

/* reading, Specs take: a pair of reading glasses over a page, and the eyes behind them doing the reading. Both pupils
   look down at the top line and move along it word by word, pausing on each, and every word they reach lights up. At
   the end of the line the eyes flick back to the start as the page scrolls up a line, the read line slipping away
   under the glasses. At the end of the third line the reader rests a moment and blinks */
const rdgSPECS = cellsOf([
  '.............',
  '.###..#..###.',
  '#...##.##...#',
  '#...#...#...#',
  '#...#...#...#',
  '.###.....###.']);
/* three lines of three words, [from, to] columns, repeating down the page */
const rdgDOC = [[[1, 4], [6, 8], [10, 11]], [[1, 2], [4, 7], [9, 11]], [[1, 3], [5, 6], [8, 11]]];
/* top: the line being read; read: words of it read; gaze: 0 to 2 across the lens; o: rows scrolled */
const rdgSpecs = (top, read, gaze, o = 0, blink = false) => stamp([...rdgSPECS,
  ...(blink ? [1, 2, 3, 9, 10, 11].map(x => [x, 3, '#']) : [[1 + gaze, 4, 'W'], [9 + gaze, 4, 'W']]),
  ...[0, 1, 2, 3].flatMap(k => { const y = 8 + 2 * k - o; if (y < 7 || y > 12) return [];
    return rdgDOC[(top + k) % 3].flatMap(([a, b], wi) => Array.from({ length: b - a + 1 }, (_, j) => [a + j, y, k === 0 && wi < read ? '#' : ':'])); })]);
const rdgReadLine = (top, blink) => [F(rdgSpecs(top, 1, 0), 190), F(rdgSpecs(top, 2, 1), 150), F(rdgSpecs(top, 3, 2), blink ? 420 : 180),
  ...(blink ? [F(rdgSpecs(top, 3, 2, 0, true), 110), F(rdgSpecs(top, 3, 2), 160)] : []), F(rdgSpecs(top, 3, 0, 1), 90), F(rdgSpecs((top + 1) % 3, 0, 0), 140)];

/* analyzing, Trend take: a line chart that finds its trend. The data comes in first, four dim points, left to right.
   Then a white-hot head joins them up, easing out of each point and slowing into the next, leaving the line lit
   behind it: up, a dip, and a long climb. At the last point it pushes on a cell, pulls back, and the end of the line
   opens into an arrowhead, the trending-up chart everyone knows. It holds, then the chart scrolls off to the left for
   the next set of data */
const anlPTS = [[1, 9], [4, 6], [6, 8], [11, 3]];
const anlPATH = pathCells(anlPTS, true);
const anlAT = anlPTS.map(([px, py]) => anlPATH.findIndex(([x, y]) => x === px && y === py));
const anlBARBS = [[[10, 3], [11, 4]], [[9, 3], [11, 5]], [[8, 3], [11, 6]]];
/* to: path cells drawn; dots: data points shown; barbs: arrowhead length; over: head pushed one cell past the end */
const anlChart = (to, { dots = 4, barbs = 0, over = false, dx = 0 } = {}) => stamp([
  ...anlPTS.slice(0, dots).map(([x, y]) => [x, y, ':']),
  ...anlPATH.slice(0, to).map(([x, y], i) => [x, y, i === to - 1 && !over ? 'W' : '#']), ...(over ? [[12, 2, 'W']] : []),
  ...anlBARBS.slice(0, barbs).flat().map(([x, y]) => [x, y, '#'])].map(([x, y, t]) => [x + dx, y, t]));
const anlDrawMs = k => anlAT.includes(k) ? 160 : anlAT.includes(k - 1) || anlAT.includes(k + 1) ? 95 : 60;
const anlEND = anlPATH.length;
const anlTREND = [...[1, 2, 3, 4].map(d => F(anlChart(0, { dots: d }), [100, 70, 70, 110][d - 1])), F(anlChart(1), 160),
  ...anlPATH.slice(1).map((_, k) => F(anlChart(k + 2), anlDrawMs(k + 1))),
  F(anlChart(anlEND, { over: true }), 70), ...[1, 2].map(b => F(anlChart(anlEND, { barbs: b }), 60)), F(anlChart(anlEND, { barbs: 3 }), 900),
  ...[-1, -3, -6, -10].map((dx, i) => F(anlChart(anlEND, { barbs: 3, dx }), [120, 80, 60, 60][i])), F(EMPTY, 120)];

/* analyzing, Pie take: breaking the whole into its parts. A whole disc of data, dim. Light runs out from its centre
   along three cuts, up, right and down to the lower left, and leaves them open, so it is a pie chart in three slices.
   The slices ease apart, each along its own direction, and the top-right quarter, the one that matters, fills with
   light from the centre out to its rim. It holds, then the slices close up, the light drains and the cuts heal */
const anlCUT = (dx, dy) => (dx === 0 && dy < 0) || (dy === 0 && dx > 0) || (dx === -dy && dx < 0);
const anlSlice = (x, y) => { const dx = x - 6, dy = y - 6; if (dx * dx + dy * dy > 30.5) return -1; if ((dx === 0 && dy === 0) || anlCUT(dx, dy)) return 3;
  const a = (Math.atan2(-dy, dx) * 180 / Math.PI + 360) % 360; return a < 90 ? 0 : a < 225 ? 1 : 2; };
const anlAPART = [[1, -1], [-1, 0], [0, 1]];
/* cut: how far out the cuts have run (-1 none, 9 all); open: slices apart or not; lit: the quarter lit out to radius r */
const anlPie = (cut, open = 0, lit = -1) => { const cs = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const s = anlSlice(x, y); if (s < 0) continue;
  if (s === 3) { const d = Math.max(Math.abs(x - 6), Math.abs(y - 6)); if (d > cut) cs.push([x, y, ':']); else if (d === cut) cs.push([x, y, 'W']); continue; }
  cs.push([x + anlAPART[s][0] * open, y + anlAPART[s][1] * open, s === 0 && Math.hypot(x - 6, y - 6) <= lit ? '#' : ':']); } return stamp(cs); };
const anlPIE = [F(anlPie(-1), 420), F(anlPie(1), 60), F(anlPie(3), 50), F(anlPie(5), 60), F(anlPie(9), 90), F(anlPie(9, 1), 110),
  ...[2, 3.5].map((r, i) => F(anlPie(9, 1, r), [70, 60][i])), F(anlPie(9, 1, 9), 900), F(anlPie(9, 0, 9), 120), F(anlPie(9), 120)];

const OPTS_A = {
  thinking_bulb: Object.assign(seq(...thkBULB), { rest: 11 }),
  thinking_cloud: Object.assign(seq(...thkCLOUDF), { still: thkCloud(thkREST, 2) }),
  reading_book: Object.assign(seq(...rdgBOOK), { still: rdgBook(3, 1) }),
  reading_specs: Object.assign(seq(...rdgReadLine(0), ...rdgReadLine(1), ...rdgReadLine(2, true)), { still: rdgSpecs(0, 1, 0) }),
  analyzing_trend: Object.assign(seq(...anlTREND), { still: anlChart(anlEND, { barbs: 3 }), trail: 0.7 }),
  analyzing_pie: Object.assign(seq(...anlPIE), { still: anlPie(9, 1, 9) }),
};

/* searching, Radar take: a radar scope, the picture of looking for something nearby. A dim bezel and a dim range ring,
   a hub, and a bright arm that sweeps round with a dim wedge of afterglow behind it. Wherever the arm passes over
   something a blip lights white and fades as the arm moves on, the way a phosphor screen holds a contact. The arm
   eases out of rest, races round, two stray contacts flare and die, and it slows as it comes back up; this time the
   blip it crosses does not fade. The arm brakes to a stop just past it, the contact pings once and holds white:
   found. Then the sweep starts again and the contact fades behind it */
const srhRING_ROWS = ['....#####....', '..##.....##..', '.#.........#.', '.#.........#.', '#...........#', '#...........#', '#...........#', '#...........#', '#...........#', '.#.........#.', '.#.........#.', '..##.....##..', '....#####....'];
const srhINNER = [[5,3],[6,3],[7,3],[4,4],[8,4],[3,5],[9,5],[3,6],[9,6],[3,7],[9,7],[4,8],[8,8],[5,9],[6,9],[7,9]];
const srhInside = (x, y) => { const r = srhRING_ROWS[y]; return !!r && x > r.indexOf('#') && x < r.lastIndexOf('#') && r[x] !== '#'; };
/* the arm at step i of sixteen, clockwise from twelve o'clock: a one-cell ray from the hub out to the bezel */
const srhArm = i => { const a = (((i % 16) + 16) % 16) * Math.PI / 8, out = [];
  for (const [x, y] of pathCells([[6, 6], [6 + 8 * Math.sin(a), 6 - 8 * Math.cos(a)]], true).slice(1)) { if (!srhInside(x, y)) break; out.push([x, y]); }
  return out; };
/* stray contacts sit on the arm's path at [arm step, cell]: white as the arm crosses, then lit, then dim, then gone */
const srhSTRAYS = [[6, [9, 9]], [11, [2, 8]]];
const srhTARGET = [4, 2], srhTARGET_STEP = 15, srhSTOP = 2;
/* where in the turn the arm crosses the target */
const srhFOUND_AT = srhTARGET_STEP > srhSTOP ? srhTARGET_STEP : srhTARGET_STEP + 16;
const srhAge = age => age === 0 ? 'W' : age === 1 ? '#' : age <= 3 ? ':' : null;
const srhPLUS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const srhScope = (p, wedge, target, ping) => {
  const arm = srhArm(p), key = ([x, y]) => x + ',' + y, onArm = new Set(arm.map(key));
  const cells = [...cellsOf(srhRING_ROWS).map(([x, y]) => [x, y, ':']), ...srhINNER.map(([x, y]) => [x, y, ':']), [6, 6, '#'], ...arm.map(([x, y]) => [x, y, '#'])];
  for (let k = 1; k <= wedge; k++) for (const c of srhArm(p - k)) if (!onArm.has(key(c))) cells.push([c[0], c[1], ':']);
  for (const [i, [x, y]] of srhSTRAYS) { const t = srhAge(((p - i) % 16 + 16) % 16); if (t) cells.push([x, y, t]); }
  if (target) cells.push([...srhTARGET, target]);
  if (ping) cells.push(...srhPLUS.map(([dx, dy]) => [srhTARGET[0] + dx, srhTARGET[1] + dy, ping]));
  return stamp(cells);
};
/* one turn, from the stop round to the stop again: slow off the mark, fast through the far side, braking at the end */
const srhTURN = Array.from({ length: 16 }, (_, k) => srhSTOP + 1 + k);
const srhTURN_MS = ease(16, 160, 42);
const srhTARGET_FADE = ['#', ':', ':'];
const srhRADAR = [F(srhScope(srhSTOP, 0, 'W'), 640),
  ...srhTURN.map((p, k) => F(srhScope(p, Math.min(1, k), p >= srhFOUND_AT ? 'W' : srhTARGET_FADE[k] || null), srhTURN_MS[k])),
  F(srhScope(srhSTOP + 16, 0, 'W', '#'), 90), F(srhScope(srhSTOP + 16, 0, 'W', ':'), 110)];

/* searching, Eye take: an eye looking for something, the eye symbol come to life. A wide almond lid, a round iris
   with a dark pupil. It searches the way eyes really do, in quick jumps with still looks between: left, then all the
   way right, then a glance down. Something there: it narrows to peer at it, then opens and turns to you with a white
   catchlight in the iris: found it. It blinks, and starts looking again */
const srhLIDS = { 4: ['....#####....', '..##.....##..', '.#.........#.', '#...........#', '#...........#', '#...........#', '.#.........#.', '..##.....##..', '....#####....'],
  2: ['...#######...', '.##.......##.', '#...........#', '.##.......##.', '...#######...'],
  1: ['..#########..', '##.........##', '..#########..'], 0: ['##.........##', '..#########..'] };
const srhIRIS = ['.###.', '#####', '##.##', '#####', '.###.'];
/* the eye open k rows above and below the middle (4 open, 2 peering, 1 a squint, 0 shut), the iris dx, dy from
   centre and cut by the lids */
const srhEye = (k, dx, dy, glint) => { const rows = srhLIDS[k], top = k === 0 ? 6 : 6 - k, cells = cellsOf(rows, 0, top);
  const inside = (x, y) => { const r = rows[y - top]; return !!r && y > top && y - top < rows.length - 1 && x > r.indexOf('#') && x < r.lastIndexOf('#'); };
  if (k > 0) cells.push(...cellsOf(srhIRIS, 4 + dx, 4 + dy).filter(([x, y]) => inside(x, y)));
  if (k > 0 && glint && inside(7 + dx, 5 + dy)) cells.push([7 + dx, 5 + dy, 'W']);
  return stamp(cells); };
const srhEYE = [F(srhEye(4, 0, 0), 480), F(srhEye(4, -1, 0), 40), F(srhEye(4, -2, 0), 380), F(srhEye(4, -1, 0), 35), F(srhEye(4, 0, 0), 30), F(srhEye(4, 1, 0), 35), F(srhEye(4, 2, 0), 360),
  F(srhEye(4, 1, 1), 40), F(srhEye(4, -1, 1), 280), F(srhEye(2, 0, 0), 90), F(srhEye(2, 1, 0), 360), F(srhEye(4, 1, 0, true), 70), F(srhEye(4, 0, 0, true), 600),
  F(srhEye(1, 0, 0), 45), F(srhEye(0, 0, 0), 80), F(srhEye(1, 0, 0), 45)];

/* generating, Gather take: the sparkle is made of what it gathers. Six motes wait scattered and dim. One at a time
   they set off for the middle, brightening and gathering speed as they fall in, and each one that lands feeds the
   sparkle a size: a point, a plus, then a four-point star whose body fills out as its rays reach for the edges. Whole,
   a light runs out along its rays and it holds with a white-hot heart. Then it lets go: the sparkle collapses and the
   motes fly back out to where they started, slowing and dimming, ready to be gathered again */
/* the sparkle at ray length R: half-widths of each row out from the middle, so the sides curve in */
const genW = [[], [1, 0], [2, 0, 0], [3, 1, 0, 0], [4, 1, 0, 0, 0], [5, 2, 1, 0, 0, 0], [6, 2, 1, 0, 0, 0, 0]];
const genStar = (R, tone = '#') => { if (R <= 0) return []; const w = genW[R], cells = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = Math.abs(x - 6), dy = Math.abs(y - 6); if (dy <= R && dx <= w[dy]) cells.push([x, y, tone]); }
  return cells; };
const genMOTES = [[4, 1], [8, 11], [11, 3], [1, 9], [1, 4], [11, 8]];
/* mote i falling into a sparkle of size R: the cells of its line to the middle, stopping where it touches */
const genFall = (i, R) => { const body = new Set(genStar(R).map(([x, y]) => x + ',' + y)), out = [];
  for (const [x, y] of pathCells([genMOTES[i], [6, 6]], true)) { if (body.has(x + ',' + y)) break; out.push([x, y]); }
  return out; };
const genWaiting = from => genMOTES.slice(from).map(([x, y]) => [x, y, ':']);
/* each fall is quicker than the last, so the gathering builds to the bloom */
const genPACE = [1.2, 1.05, 0.95, 0.85, 0.78, 0.72];
const genGATHER = genMOTES.flatMap((_, i) => [...[0.35, 0.7, 1].map((p, s) => { const path = genFall(i, i), [x, y] = path[Math.round(p * p * (path.length - 1))];
  return F(stamp([...genStar(i), ...genWaiting(i + 1), [x, y, '#']]), Math.round([100, 65, 45][s] * genPACE[i])); }), F(stamp([...genStar(i + 1), ...genWaiting(i + 1), [6, 6, 'W']]), i === 5 ? 90 : Math.round(80 * genPACE[i]))]);
const genRays = d => stamp([...genStar(6), [6 - d, 6, 'W'], [6 + d, 6, 'W'], [6, 6 - d, 'W'], [6, 6 + d, 'W']]);
const genSPARK = stamp([...genStar(6), [6, 6, 'W']]);
const genScatter = (t, R) => stamp([...genStar(R), ...genMOTES.map(([x, y]) => [Math.round(6 + (x - 6) * t), Math.round(6 + (y - 6) * t), t > 0.8 ? ':' : '#'])]);
const genGATHER_LOOP = [F(stamp(genWaiting(0)), 260), ...genGATHER, ...[2, 4, 6].map(d => F(genRays(d), 40)), F(genSPARK, 760),
  F(genScatter(0.35, 4), 50), F(genScatter(0.65, 2), 60), F(genScatter(0.88, 0), 85), F(genScatter(1, 0), 130)];

/* generating, Wand take: the magic wand from the toolbar, a slim stick with a heavier grip and a white-hot tip, and
   the stars it makes. At rest a big four-point star and two small ones hang by the tip. They twinkle out one after
   another, shrinking to a point and going dark. The wand draws back a cell, then flicks forward, and new stars fly
   off the tip, big one first, each opening from a point into a star with a white heart, and the wand settles back */
const genStarAt = (cx, cy, R, core, tone = '#') => { if (R < 0) return []; if (R === 0) return [[cx, cy, core || tone]];
  const w = genW[R], cells = []; for (let dy = -R; dy <= R; dy++) for (let dx = -w[Math.abs(dy)]; dx <= w[Math.abs(dy)]; dx++) cells.push([cx + dx, cy + dy, dx === 0 && dy === 0 && core ? core : tone]);
  return cells; };
const genTIP = [6, 6];
/* the wand with its tip d cells along its own line from rest: forward up and to the right, back down and to the left */
const genWand = d => { const tx = genTIP[0] + d, ty = genTIP[1] - d; return [[tx, ty, 'W'], ...[1, 2, 3, 4, 5, 6, 7].map(k => [tx - k, ty + k, '#']), ...[5, 6, 7].map(k => [tx - k + 1, ty + k, '#'])]; };
const genSTARS = [[9, 3], [3, 2], [11, 9]];
/* each star is null (none), a number (flying out of the tip, that far along), or [R, core, tone] */
const genMagic = (d, stars) => stamp(inGrid([...genWand(d), ...stars.flatMap((s, i) => { const [cx, cy] = genSTARS[i]; if (s == null) return [];
  if (typeof s === 'number') { const fx = genTIP[0] + 1, fy = genTIP[1] - 1; return [[Math.round(fx + (cx - fx) * s), Math.round(fy + (cy - fy) * s), 'W']]; }
  return genStarAt(cx, cy, ...s); })]));
const genREST = [[3, 'W'], [1], [1]];
const genWAND = [F(genMagic(0, genREST), 620),
  F(genMagic(0, [[3], [0], [1]]), 90), F(genMagic(0, [[2], [0, null, ':'], [0]]), 80), F(genMagic(0, [[1], null, [0, null, ':']]), 80), F(genMagic(0, [[0], null, null]), 90), F(genMagic(0, [[0, null, ':'], null, null]), 120),
  F(genMagic(0, [null, null, null]), 140), F(genMagic(-1, [null, null, null]), 240),
  F(genMagic(1, [0.5, null, null]), 55), F(genMagic(1, [[1, 'W'], 0.45, null]), 60), F(genMagic(0, [[2, 'W'], 0.8, 0.45]), 70), F(genMagic(0, [[3, 'W'], [1, 'W'], 0.8]), 85), F(genMagic(0, [[3, 'W'], [1], [1, 'W']]), 110)];

/* writing, Caret take: text being written the way it appears on screen, a tall white caret leading lines of words.
   It types in a rhythm, quick through a word and a beat at each space. Halfway through a line it stops on a word,
   blinks, thinks better of it, deletes it and types a longer one, then finishes the line and returns: the caret
   sweeps back to the start as the page scrolls up a line, overshooting a row and settling, the top line fading out
   of view. The next line comes straight out */
const wrtLINES = ['###.##.####', '##.####.##'];
const wrtDRAFT = '###.##.###';
/* the page: line a is being typed on row 10 with `text` showing; earlier lines sit three rows apart above it and the
   top one is dim. s scrolls it all up while the next line comes in. The caret is three cells tall at [x, row] */
const wrtPage = (a, text, s, caret) => { const cells = [];
  for (let j = 0; j <= 4; j++) { const y = 10 - 3 * j - s, line = j === 0 ? text : wrtLINES[(((a - j) % 2) + 2) % 2];
    for (let x = 0; x < line.length; x++) if (line[x] === '#') cells.push([1 + x, y, y <= 1 ? ':' : '#']); }
  if (caret) cells.push(...[-1, 0, 1].map(k => [caret[0], caret[1] + k, 'W']));
  return stamp(inGrid(cells)); };
/* typing `to` from what is already there, `from`: quick within a word, a beat on the first letter after a space */
const wrtType = (a, from, to) => Array.from({ length: to.length - from.length }, (_, k) => { const n = from.length + k + 1, text = to.slice(0, n);
  return text.endsWith('.') ? null : F(wrtPage(a, text, 0, [1 + n, 10]), n === 1 || to[n - 2] === '.' ? 115 : 60); }).filter(Boolean);
const wrtBack = (a, from, to) => Array.from({ length: from.length - to.length }, (_, k) => { const n = from.length - k - 1; return F(wrtPage(a, from.slice(0, n), 0, [1 + n, 10]), 45); });
/* return: the caret sweeps to the start of the next line as the page scrolls three rows, one past, and back */
const wrtReturn = (a, endX) => [F(wrtPage(a + 1, '', -2, [Math.round(endX * 0.6), 12]), 80), F(wrtPage(a + 1, '', -1, [3, 11]), 55), F(wrtPage(a + 1, '', 0, [1, 10]), 60),
  F(wrtPage(a + 1, '', 1, [1, 9]), 80), F(wrtPage(a + 1, '', 0, [1, 10]), 160)];
const wrtCARET = [...wrtType(0, '', wrtDRAFT), F(wrtPage(0, wrtDRAFT, 0, null), 170), F(wrtPage(0, wrtDRAFT, 0, [11, 10]), 230), ...wrtBack(0, wrtDRAFT, '###.##.'), F(wrtPage(0, '###.##.', 0, [8, 10]), 90),
  ...wrtType(0, '###.##.', wrtLINES[0]), F(wrtPage(0, wrtLINES[0], 0, [12, 10]), 150), ...wrtReturn(0, 12),
  ...wrtType(1, '', wrtLINES[1]), F(wrtPage(1, wrtLINES[1], 0, [11, 10]), 150), ...wrtReturn(1, 11)];

/* writing, Signature take: a signature written in one breath. Wet ink leaves the pen white-hot and dries to a line
   behind it. Two looped letters lean into each other: up the slope fast, slowing round the top of each loop, down the
   stem and through the crossing, a quick link to the next. The pen lifts, comes in from the right and sweeps a long
   underline back beneath the name, quick through the middle and easing out at its tail. The signature holds, then the
   ink dims and is gone, ready to be signed again */
const wrtSIGN = [[0,9],[1,8],[2,7],[3,6],[4,5],[4,4],[4,3],[3,2],[2,3],[2,4],[2,5],[2,6],[2,7],[2,8],[3,9],[4,9],[5,8],[6,7],[7,6],[8,5],[8,4],[8,3],[7,2],[6,3],[6,4],[6,5],[6,6],[6,7],[6,8],[7,9],[8,9],[9,8],[10,7]];
const wrtUNDER = [[12,9],[11,10],[10,11],[9,11],[8,11],[7,11],[6,11],[5,11],[4,11],[3,11],[2,11],[1,11]];
const wrtINK = [...wrtSIGN, ...wrtUNDER];
/* how long the pen takes to reach each cell: slow where the stroke turns, quick along a straight run */
const wrtTurn = (pts, i) => { if (i === 0 || i === pts.length - 1) return 1; const [a, b, c] = [pts[i - 1], pts[i], pts[i + 1]]; return (b[0] - a[0]) !== (c[0] - b[0]) || (b[1] - a[1]) !== (c[1] - b[1]) ? 1 : 0; };
const wrtSignAt = (to, tone = '#') => stamp(wrtINK.slice(0, to).map(([x, y], k) => [x, y, tone === '#' && k === to - 1 && to < wrtINK.length && to !== wrtSIGN.length ? 'W' : tone]));
const wrtSIGNED = wrtSignAt(wrtINK.length);
const wrtSIGNATURE = [
  ...wrtSIGN.map((_, i) => F(wrtSignAt(i + 1), i === 0 ? 110 : wrtTurn(wrtSIGN, i) ? 55 : 30)), F(wrtSignAt(wrtSIGN.length), 130),
  ...wrtUNDER.map((_, i) => F(wrtSignAt(wrtSIGN.length + i + 1), ease(wrtUNDER.length, 80, 30)[i])), F(wrtSIGNED, 850),
  F(wrtSignAt(wrtINK.length, ':'), 170), F(EMPTY, 190)];

const OPTS_B = {
  searching_radar: Object.assign(seq(...srhRADAR), { rest: 0, trail: 1.3 }),
  searching_eye: Object.assign(seq(...srhEYE), { still: srhEye(4, 0, 0, true), trail: 0.6 }),
  generating_gather: Object.assign(seq(...genGATHER_LOOP), { still: genSPARK }),
  generating_wand: Object.assign(seq(...genWAND), { rest: 0 }),
  writing_caret: Object.assign(seq(...wrtCARET), { still: wrtPage(1, '##.##', 0, [6, 10]), trail: 0.3 }),
  writing_signature: Object.assign(seq(...wrtSIGNATURE), { still: wrtSIGNED, trail: 0.7 }),
};

/* syncing, Loop take: the sync symbol everyone knows, two arrows chasing each other around a ring, eased so it reads as
   effort and release rather than a spinner. The ring is the radius-5 circle, 28 cells, and each arrow covers twelve of
   them with a 45 degree arrowhead at a diagonal, so the pose a quarter turn on is the same icon turned. At rest the
   arrows hold. Then each one coils: its tail draws up into its head while the head stays put and tucks its barbs in,
   like a spring loading. Released, the head flings half a turn round the ring with a white tip, the tail following and
   the arc lengthening back out, overshoots a cell, and the barbs open again as it settles where the other arrow began */
const SYN_RING = (() => {
  const cs = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const r = Math.hypot(x - 6, y - 6); if (r > 4.6 && r < 5.5) cs.push([x, y]); }
  const ang = ([x, y]) => (Math.atan2(x - 6, 6 - y) + 2 * Math.PI) % (2 * Math.PI);
  return cs.sort((a, b) => ang(a) - ang(b));
})();
const synAt = i => SYN_RING[((i % SYN_RING.length) + SYN_RING.length) % SYN_RING.length];
/* the barbs of an arrowhead pointing down-right from a tip at ring cell 4, turned a quarter at a time for the other diagonals */
const SYN_BARBS = [[0, -1], [-1, 0], [0, -2], [-2, 0]];
const synTurn = ([dx, dy], k) => { for (let j = 0; j < ((k % 4) + 4) % 4; j++) [dx, dy] = [-dy, dx]; return [dx, dy]; };
/* one arrow along the ring from cell t to its tip at cell h. head: 'open' (full barbs), 'tuck' (short barbs) or 'hot'
   (no barbs, a white tip, for when it is flying) */
const synArc = (t, h, head) => {
  const cs = [];
  for (let i = t; i <= h; i++) cs.push([...synAt(i), '#']);
  const [hx, hy] = synAt(h), diag = ((h - 4) % 7 + 7) % 7 === 0;
  if (head === 'hot') cs.push([hx, hy, 'W']);
  else if (diag) SYN_BARBS.slice(0, head === 'open' ? 4 : 2).forEach(b => { const [dx, dy] = synTurn(b, (h - 4) / 7); cs.push([hx + dx, hy + dy, '#']); });
  return cs;
};
const synLoop = (t, h, head) => stamp([...synArc(t, h, head), ...synArc(t + 14, h + 14, head)]);

/* syncing, Devices take: a laptop and a phone joined by a short dim link, the picture of your things staying in step.
   The device that has the change glows, its screen a dim wash of light. A white packet leaves that screen, slow off the
   mark and quick across the link, and the other screen lights up from the side it arrives on, the way a page loads in.
   Now both glow: in sync. The first one sleeps, and the phone sends the next change back the same way */
const SYN_LAPTOP = ['.######.', '.#....#.', '.#....#.', '.#....#.', '.######.', '########'];
const SYN_PHONE = ['.##.', '#..#', '#..#', '#..#', '#..#', '#..#', '.##.'];
/* screen cells in columns, counted from the side that faces the other device */
const SYN_LAP_SCREEN = [5, 4, 3, 2].map(x => [5, 6, 7].map(y => [x, y])), SYN_PHONE_SCREEN = [10, 11].map(x => [4, 5, 6, 7, 8].map(y => [x, y]));
/* l, p: how many columns of each screen glow; pk: packet cells on top */
const synDev = (l, p, pk = []) => stamp([...cellsOf(SYN_LAPTOP, 0, 4), ...cellsOf(SYN_PHONE, 9, 3), [7, 6, ':'], [8, 6, ':'],
  ...SYN_LAP_SCREEN.slice(0, l).flat().map(([x, y]) => [x, y, ':']), ...SYN_PHONE_SCREEN.slice(0, p).flat().map(([x, y]) => [x, y, ':']), ...pk]);
/* the packet runs along row 6 from one screen's facing edge (x 5 or 10) to the other's, a lit cell behind its white head */
const synPacket = (x, d) => [[x, 6, 'W'], ...(x - d >= 5 && x - d <= 10 ? [[x - d, 6, '#']] : [])];
const synSend = toPhone => {
  const d = toPhone ? 1 : -1, xs = toPhone ? [5, 6, 7, 8, 9, 10] : [10, 9, 8, 7, 6, 5];
  return [...xs.map((x, k) => F(toPhone ? synDev(4, 0, synPacket(x, d)) : synDev(0, 2, synPacket(x, d)), [85, 55, 40, 40, 55, 75][k])),
    ...(toPhone ? [F(synDev(4, 1, [[10, 6, 'W']]), 70), F(synDev(4, 2), 90)] : [F(synDev(1, 2, [[5, 6, 'W']]), 60), F(synDev(2, 2), 55), F(synDev(3, 2), 60), F(synDev(4, 2), 90)])];
};

/* building, Bricks take: a brick wall laid course by course in running bond, the way a mason builds it. Each brick
   drops in from above, gathering speed, squashes flat on landing with a puff of dust either side and settles back into
   shape. The middle course is offset by half a brick, so its ends are half bricks. When the last brick is down a light
   runs across the top course, the wall holds, then slides away and the ground is clear for the next one */
/* [x, y, width] of each brick in the order it is laid */
const BLD_BRICKS = [[1, 10, 5], [7, 10, 5], [4, 7, 5], [1, 7, 2], [10, 7, 2], [1, 4, 5], [7, 4, 5]];
const bldBrick = ([x, y, w], dy = 0) => Array.from({ length: w }, (_, i) => [[x + i, y + dy, '#'], [x + i, y + dy + 1, '#']]).flat();
const bldSquash = ([x, y, w]) => [...Array.from({ length: w + 2 }, (_, i) => [x - 1 + i, y + 1, '#']), [x - 2, y + 1, ':'], [x + w + 1, y + 1, ':']];
const BLD_GROUND = Array.from({ length: N }, (_, x) => [x, 12, ':']);
/* the wall with the first n bricks laid, slid by dx, with extra cells on top */
const bldWall = (n, dx = 0, extra = []) => stamp(inGrid([...BLD_GROUND, ...BLD_BRICKS.slice(0, n).flatMap(b => bldBrick(b)).map(([x, y, c]) => [x + dx, y, c]), ...extra]));
/* a fall eases in like gravity, in four steps from the top of the frame or three for the upper courses */
const bldDrop = k => { const b = BLD_BRICKS[k], d = b[1] + 1, steps = d > 9 ? [0, 0.2, 0.5, 0.82] : [0, 0.35, 0.75];
  return [...steps.map((f, i) => F(bldWall(k, 0, bldBrick(b, Math.round(-d * (1 - f)))), [55, 45, 40, 40][i])),
    F(bldWall(k, 0, bldSquash(b)), 60), F(bldWall(k + 1), k === BLD_BRICKS.length - 1 ? 80 : 100)]; };
/* a diagonal glint on the top course at column c, only where there is brick */
const BLD_TOP = new Set(BLD_BRICKS.slice(5).flatMap(b => bldBrick(b)).map(([x, y]) => x + ',' + y));
const bldShine = c => bldWall(7, 0, [[c, 4, 'W'], [c - 1, 5, 'W']].filter(([x, y]) => BLD_TOP.has(x + ',' + y)));

/* building, Crane take: a crane tops out a tower. A trolley runs along the dim jib at the top of the frame carrying a
   new floor on its hook and brakes over the tower; the load swings on past it, back, and settles, the way a hung weight
   does. The cable pays out and the floor is lowered gently onto the tower, the hook lets go and its windows light up
   white. The hook winds up, the trolley runs off for the next one, and the tower sinks a floor as the view rises with
   it, so the building keeps growing and the loop never ends */
/* a floor: a slab over a row of windows, seven cells wide */
const bldFloor = (x, y, win = ':') => [...[0, 1, 2, 3, 4, 5, 6].map(i => [x + i, y, '#']), ...[0, 1, 2, 3, 4, 5, 6].map(i => [x + i, y + 1, i % 2 ? win : '#'])];
const BLD_JIB = Array.from({ length: N }, (_, x) => [x, 0, ':']);
/* the trolley at tx; the hook hangs at row hy, swung sideways by swing, with the floor on two short slings when loaded */
const bldHang = (tx, hy, swing = 0, load = true) => { const hx = tx + swing;
  return [[tx - 1, 0, '#'], [tx, 0, '#'], [tx + 1, 0, '#'], ...Array.from({ length: hy - 1 }, (_, k) => [Math.round(tx + (hx - tx) * (k + 1) / hy), k + 1, ':']), [hx, hy, '#'],
    ...(load ? [[hx - 1, hy + 1, ':'], [hx + 1, hy + 1, ':'], ...bldFloor(hx - 3, hy + 2)] : [])]; };
/* the tower: floors stacked down from row top; the newest one's windows can be lit */
const bldTower = (top, lit) => [0, 1, 2].flatMap(k => bldFloor(3, top + 2 * k, k === 0 && lit ? lit : ':'));
const bldCrane = (tx, hy, swing, load, top, lit) => stamp(inGrid([...BLD_JIB, ...bldTower(top, lit), ...bldHang(tx, hy, swing, load)]));

/* debugging, Ladybug take: the bug everyone draws for a bug report, drawn cute: two wing cases with a seam and dim
   spots, a dim head with two white eyes, bobble antennae and stubby dim legs. It sits, blinks and twitches its
   antennae as it checks the spot. Then it lifts its cases, which swing open about their front corners into a V over its
   dim body, its wings flicker out at the sides, it hovers, rises slowly, and is gone off the top. The next one flies in
   from below, slowing as it comes, folds its cases shut and settles with a little bump. The bug is found, and leaves */
const DBG_SHUT = ['.....:.:.....', '.....:::.....', '....:W:W:....', '...###.###...', '.:####.####:.', '..#:##.##:#..', '.:####.####:.', '..##:#.#:##..', '..:###.###:..', '....##.##....'];
const DBG_OPEN1 = ['.....:.:.....', '.....:::.....', '....:W:W:....', '...###.###...', '..####:####..', '..#:##:##:#..', '.####:::####.', '.##:#:::#:##.', '..###.:.###..', '...##...##...'];
const DBG_OPEN2 = ['.....:.:.....', '.....:::.....', '...#:W:W:#...', '..###.:.###..', '.####:::####.', '.#:##:::##:#.', '####.:::.####', '#:##.:::.##:#', '.##...:...##.', '.............'];
const DBG_WINGS = [[], [[0, 5], [0, 6], [12, 5], [12, 6]], [[0, 10], [0, 11], [1, 11], [12, 10], [12, 11], [11, 11]]];
const DBG_ANTENNAE = [[4, 1, '#'], [8, 1, '#']], DBG_ANTENNAE_TWITCH = [[5, 1, '#'], [7, 1, '#'], [5, 2, ':'], [7, 2, ':']];
/* pose: 'shut', 'open1' or 'open2'; wings: 0, 1 (flicked forward) or 2 (back); dy moves the whole ladybug */
const dbgLady = ({ pose = 'shut', wings = 0, dy = 0, blink = false, twitch = false } = {}) => {
  const rows = pose === 'open2' ? DBG_OPEN2 : pose === 'open1' ? DBG_OPEN1 : DBG_SHUT;
  const body = cellsOf(rows, 0, 2).filter(([, y]) => !(twitch && y === 2)).map(([x, y, c]) => [x, y, blink && c === 'W' ? ':' : c]);
  return stamp(inGrid([...body, ...(twitch ? DBG_ANTENNAE_TWITCH : DBG_ANTENNAE), ...DBG_WINGS[wings].map(([x, y]) => [x, y, ':'])].map(([x, y, c]) => [x, y + dy, c])));
};

/* debugging, Spider take: a little spider drops in on its thread to look for the bug. Round body, two white eyes, eight
   dim legs bent at the knee, and a dim thread to the top of the frame. It falls with its legs trailing up, overshoots as
   the silk stretches and flings its legs out, bounces back and settles, dangling. It glances left, then right, and
   blinks. Then it climbs back up hand over hand, reaching up and pulling, slowly and then quickly, and drops in again.
   The legs follow through on every change of direction, so the bounce feels elastic */
const DBG_SPIDER = {
  rest: ['.::..###..::.', ':..:#####:..:', '..::#.#.#::..', '.:..#####..:.', ':..:.###.:..:', '..:.......:..'],
  up: ['.:.........:.', ':.:.......:.:', '...:.###.:...', '.::.#####.::.', ':..:#.#.#:..:', '..:.#####.:..', '.:...###...:.'],
  down: ['.....###.....', '.:::#####:::.', ':...#.#.#...:', '..::#####::..', '.:...###...:.', ':.:.......:.:'],
};
/* pose 'rest', 'up' (legs raised) or 'down' (legs flung out); dy from the resting height; eyes 'c', 'l', 'r' or 'shut' */
const dbgSpider = (pose, dy, eyes = 'c') => {
  const ex = eyes === 'l' ? [4, 6] : eyes === 'r' ? [6, 8] : eyes === 'c' ? [5, 7] : [];
  return stamp(inGrid([...Array.from({ length: Math.max(3, 4 + dy) }, (_, y) => [6, y, ':']), ...cellsOf(DBG_SPIDER[pose], 0, (pose === 'up' ? 2 : 4) + dy),
    ...[5, 7].map(x => [x, 6 + dy, '#']), ...ex.map(x => [x, 6 + dy, 'W'])]));
};

const OPTS_C = {
  syncing_loop: Object.assign(seq(
    F(synLoop(-7, 4, 'open'), 560), F(synLoop(-6, 4, 'open'), 110), F(synLoop(-4, 4, 'open'), 70), F(synLoop(-2, 4, 'open'), 60), F(synLoop(-1, 4, 'tuck'), 90),
    F(synLoop(0, 6, 'hot'), 70), F(synLoop(2, 9, 'hot'), 50), F(synLoop(4, 13, 'hot'), 40), F(synLoop(6, 16, 'hot'), 45), F(synLoop(8, 19, 'hot'), 65),
    F(synLoop(7, 18, 'tuck'), 70), F(synLoop(7, 18, 'open'), 60)), { still: synLoop(-7, 4, 'open') }),
  syncing_devices: Object.assign(seq(
    F(synDev(4, 0), 400), ...synSend(true), F(synDev(4, 2), 480), F(synDev(2, 2), 70), F(synDev(0, 2), 260),
    ...synSend(false), F(synDev(4, 2), 480), F(synDev(4, 1), 70), F(synDev(4, 0), 120)), { still: synDev(4, 2) }),
  building_bricks: Object.assign(seq(F(bldWall(0), 160), ...BLD_BRICKS.flatMap((_, k) => bldDrop(k)), ...[1, 3, 5, 8, 10, 12].map(c => F(bldShine(c), 40)), F(bldWall(7), 460),
    ...[-1, -3, -6, -10, -14].map((d, i) => F(bldWall(7, d), [110, 75, 55, 50, 60][i]))), { still: bldWall(7) }),
  building_crane: Object.assign(seq(
    ...[-1, 2, 4, 5].map((tx, i) => F(bldCrane(tx, 2, 0, true, 9), [80, 65, 75, 95][i])),
    F(bldCrane(6, 2, 1, true, 9), 140), F(bldCrane(6, 2, 0, true, 9), 110), F(bldCrane(6, 2, -1, true, 9), 80), F(bldCrane(6, 2, 0, true, 9), 420),
    F(bldCrane(6, 3, 0, true, 9), 110), F(bldCrane(6, 4, 0, true, 9), 90), F(bldCrane(6, 5, 0, true, 9), 140),
    F(bldCrane(6, 5, 0, false, 7, 'W'), 100), F(bldCrane(6, 4, 0, false, 7), 110), F(bldCrane(6, 2, 0, false, 7), 280),
    F(bldCrane(8, 2, 0, false, 8), 90), F(bldCrane(11, 2, 0, false, 9), 80), F(bldCrane(15, 2, 0, false, 9), 120)), { rest: 7 }),
  debugging_ladybug: Object.assign(seq(
    F(dbgLady(), 520), F(dbgLady({ blink: true }), 90), F(dbgLady(), 220), F(dbgLady({ twitch: true }), 120), F(dbgLady(), 140), F(dbgLady({ twitch: true }), 100), F(dbgLady(), 160),
    F(dbgLady({ pose: 'open1' }), 110), F(dbgLady({ pose: 'open2' }), 90),
    ...[1, 2, 1, 2, 1, 2].map((w, k) => F(dbgLady({ pose: 'open2', wings: w, dy: [0, 0, -1, -1, -2, -3][k] }), 50)),
    ...[-5, -8, -12].map((dy, k) => F(dbgLady({ pose: 'open2', wings: 1 + k % 2, dy }), [45, 45, 50][k])),
    ...[7, 4, 2, 1, 0].map((dy, k) => F(dbgLady({ pose: 'open2', wings: 2 - k % 2, dy }), [55, 55, 60, 70, 80][k])),
    F(dbgLady({ pose: 'open1' }), 90), F(dbgLady({ dy: 1 }), 80)), { still: dbgLady() }),
  debugging_spider: Object.assign(seq(
    F(dbgSpider('up', -7), 70), F(dbgSpider('up', -4), 55), F(dbgSpider('up', -1), 45), F(dbgSpider('down', 2), 90), F(dbgSpider('up', -1), 110), F(dbgSpider('down', 1), 100),
    F(dbgSpider('rest', 0), 420), F(dbgSpider('rest', 0, 'l'), 300), F(dbgSpider('rest', 0, 'r'), 320), F(dbgSpider('rest', 0), 160), F(dbgSpider('rest', 0, 'shut'), 90), F(dbgSpider('rest', 0), 300),
    F(dbgSpider('up', 0), 120), F(dbgSpider('rest', -2), 90), F(dbgSpider('up', -3), 80), F(dbgSpider('rest', -6), 65), F(dbgSpider('up', -10), 60), F(dbgSpider('up', -14), 180)),
    { still: dbgSpider('rest', 0) }),
};

/* heartbeat, ECG take: a patient monitor. A white-hot head sweeps the trace across the screen at a steady pace and wipes
   two columns ahead of itself, the way a real monitor writes over its last sweep; the newest trace is lit and it cools
   to dim behind. On the flat it walks, on the beat it darts: up the R spike, a hang at the top, then down through the
   deep S and back. At the peak the beat throws a small heart: a spark above the tip blooms into the heart with a glint
   on its lobe, it hangs there while the trace runs on, and it fades before the next beat. Frozen, it is the heart over
   the pulse line, the heart rate symbol */
const hrtPath = [[0,10],[1,10],[2,10],[3,10],[4,10],[5,9],[5,8],[5,7],[5,6],[6,5],[7,6],[7,7],[7,8],[7,9],[7,10],[7,11],[8,12],[9,11],[10,10],[11,10],[12,10]];
const hrtHeartRows = ['.#.#.', '#####', '.###.', '..#..'];
/* the trace with the head at path index h: drawn this sweep up to h, lit for the newest columns and dim further back;
   the two columns ahead of the head are wiped, and past them the last sweep still glows dim */
const hrtTrace = h => { const hx = hrtPath[h][0]; return hrtPath.map(([x, y], i) => {
  const ahead = ((x - hx) % N + N) % N, age = ((hx - x) % N + N) % N;
  if (i === h) return [x, y, 'W'];
  if (i > h) return ahead >= 1 && ahead <= 2 || x === hx ? null : [x, y, ':'];
  return [x, y, age <= 7 ? '#' : ':'];
}).filter(Boolean); };
const hrtHeart = st => !st ? [] : st === 'spark' ? [[6, 3, '#']] : st === 'tiny' ? cellsOf(['#.#', '###', '.#.'], 5, 1)
  : cellsOf(hrtHeartRows, 4, 0).map(([x, y]) => [x, y, st === 'dim' ? ':' : st === 'hot' && x === 5 && y === 0 ? 'W' : '#']);
const hrtMs = [85, 85, 80, 75, 60, 48, 40, 34, 34, 80, 30, 28, 28, 28, 30, 34, 50, 50, 70, 80, 85];
const hrtHearts = { 9: 'spark', 10: 'tiny', 11: 'hot', 12: 'hot', 13: 'hot', 14: 'hot', 15: 'full', 16: 'full', 17: 'full', 18: 'full', 19: 'dim' };
const hrtEcg = hrtPath.map((_, h) => F(stamp([...hrtTrace(h), ...hrtHeart(hrtHearts[h])]), hrtMs[h]));

/* heartbeat, Fill take: the heart as a vessel, and the beat as the pump. Empty, it is a dim outline. On the lub a surge
   of red rushes in from the point, a crest running across its surface and catching the light, sloshes up the far wall
   and settles; on the dub a second surge fills it to the lobes and sloshes back the other way. Full, it is the solid
   heart with a glint on its lobe. Then it drains away smoothly, slow to start and slow to finish, ready for the next
   beat */
const hrtVessel = ['.............', '.............', '..###...###..', '.#####.#####.', '.###########.', '.###########.', '..#########..', '...#######...', '....#####....', '.....###.....', '......#......', '.............', '.............'];
const hrtIn = (x, y) => (hrtVessel[y] || '')[x] === '#';
const hrtRim = new Set(cellsOf(hrtVessel).filter(([x, y]) => [[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy]) => !hrtIn(x + dx, y + dy))).map(([x, y]) => x + ',' + y));
/* liquid up to row L; the surface is a row higher where wave(x) says so; glint marks one white cell */
const hrtFill = (L, wave = () => false, glint) => stamp(cellsOf(hrtVessel).map(([x, y]) => {
  if (y >= (wave(x) ? L - 1 : L)) return [x, y, glint && glint[0] === x && glint[1] === y ? 'W' : '#'];
  return hrtRim.has(x + ',' + y) ? [x, y, ':'] : null; }).filter(Boolean));
const hrtCrest = c => x => Math.abs(x - c) <= 1;
const hrtSurge = (L, c) => hrtFill(L, hrtCrest(c), [c, L - 1]);
const hrtPump = [F(hrtFill(11), 320),
  F(hrtSurge(9, 4), 60), F(hrtSurge(7, 6), 55), F(hrtSurge(6, 8), 75), F(hrtFill(6, x => x >= 9), 100), F(hrtFill(6, hrtCrest(6)), 110), F(hrtFill(6), 170),
  F(hrtSurge(5, 8), 60), F(hrtSurge(4, 6), 55), F(hrtSurge(3, 4), 75), F(hrtFill(3, x => x <= 3), 100), F(hrtFill(2), 110), F(hrtFill(2, () => false, [3, 3]), 650),
  ...[3, 4, 5, 6, 7, 8, 9, 10, 11].map((L, i) => F(hrtFill(L), ease(9, 110, 60)[i]))];

/* scanning, Face ID take: the Face ID glyph, four corner brackets around a face drawn as two eyes, a nose with its hook
   and a smile. The face waits dim, not yet known. The brackets close in a cell and lock on, then a scan line glides
   down the face, slow at the brow, quick through the middle, slow at the chin: the row under it lights white and
   everything it has passed stays lit. Recognised, the brackets let go, the smile widens into a grin and the face gives
   a wink, holds, and dims for the next face */
const scnEyes = [[4,3],[4,4],[8,3],[8,4]], scnWink = [[4,4],[8,3],[8,4]];
const scnNose = [[6,4],[6,5],[6,6],[5,6]];
const scnSmile = [[4,8],[5,9],[6,9],[7,9],[8,8]], scnGrin = [[3,7],[4,8],[5,9],[6,9],[7,9],[8,8],[9,7]];
const scnBrackets = k => [[0,0],[1,0],[2,0],[0,1],[0,2]].flatMap(([x, y]) => [[x + k, y + k], [12 - x - k, y + k], [x + k, 12 - y - k], [12 - x - k, 12 - y - k]]);
/* brackets in by k; the features lit above row `lit`, dim below it, white on the beam's row */
const scnFace = ({ k = 0, beam = -1, lit = 13, eyes = scnEyes, smile = scnSmile } = {}) => stamp([
  ...scnBrackets(k).map(([x, y]) => [x, y, '#']),
  ...[...eyes, ...scnNose, ...smile].map(([x, y]) => [x, y, y === beam ? 'W' : y < lit ? '#' : ':']),
  ...(beam >= 0 ? Array.from({ length: 9 }, (_, i) => [2 + i, beam, ':']) : [])]);
const scnRows = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const scnFaceId = [F(scnFace({ lit: 0 }), 480), F(scnFace({ k: 1, lit: 0 }), 120),
  ...scnRows.map((r, i) => F(scnFace({ k: 1, beam: r, lit: r }), ease(scnRows.length, 120, 55)[i])), F(scnFace({ k: 1 }), 150),
  F(scnFace({ k: 1, smile: scnGrin }), 90), F(scnFace({ smile: scnGrin, eyes: scnWink }), 170), F(scnFace({ smile: scnGrin }), 850), F(scnFace({ lit: 0, smile: scnGrin }), 90)];

/* scanning, Touch ID take: a fingerprint, nested ridges arching over a short core, the bottom ends running off at their
   own heights the way a real print does. It waits dim. A ring of light spreads out from the core, slow off the core,
   fast through the middle, slow at the rim: the ridges at its front catch it white and every ridge behind stays lit,
   the way Touch ID fills the print in. Read, it holds, then the light gathers back in from the edge to the core, which
   blinks white once, and the print goes dim for the next touch */
const scnPrintRows = ['....#####....', '..##.....##..', '.#..#####..#.', '#..#.....#..#', '#.#..###..#.#', '#.#.#...#.#.#', '#.#.#.#.#.#.#', '..#.#.#.#.#.#', '.#..#.#.#.#..', '.#.#..#.#..#.', '...#.#..#.#..', '..#..#.#..#..', '....#..#.....'];
const scnDist = ([x, y]) => Math.hypot(x - 6, y - 7.5);
/* lit within R of the core with a white front, dim beyond; past `keep` dim again */
const scnPrint = (R, band = 0.75, keep = 99) => stamp(cellsOf(scnPrintRows).map(([x, y]) => { const d = scnDist([x, y]); return [x, y, d > keep ? ':' : d <= R - band ? '#' : d <= R ? 'W' : ':']; }));
const scnOut = [1.2, 2.2, 3.2, 4.2, 5.2, 6.2, 7.2, 8.2, 9.4, 10.6], scnBack = [9, 7.5, 6, 4.5, 3, 1.5];
const scnTouch = [F(scnPrint(-1), 380), ...scnOut.map((R, i) => F(scnPrint(R), ease(scnOut.length, 120, 50)[i])), F(scnPrint(20), 600),
  ...scnBack.map((R, i) => F(scnPrint(20, 0, R), ease(scnBack.length, 90, 60)[i])), F(stamp([...cellsOf(scnPrintRows).map(([x, y]) => [x, y, ':']), [6, 7, 'W'], [6, 8, 'W']]), 140)];

/* breathing, Balloon take: breathing in fills a balloon. It is tied at the neck, so it grows upward from the knot, round
   at every size, slow to start, quicker through the middle and slow as it gets full. As the rubber stretches it catches
   the light: a glint appears on its shoulder and grows to two cells, and its far side stays in shade. Full, it holds;
   then it lets the air go just as slowly. The string hangs below and sways gently all the while */
const brtSizes = [[3, 5, 5, 3], [3, 5, 5, 5, 3], [3, 5, 7, 7, 5, 3], [3, 5, 7, 7, 7, 5, 3], [5, 7, 9, 9, 7, 5, 3], [5, 7, 9, 9, 9, 7, 5, 3]];
const brtNeck = 8;
/* the balloon at size k, its string in one of four curves: bowed left, an S, bowed right, the other S */
const brtStrings = [[[6,9],[5,10],[5,11],[6,12]], [[6,9],[5,10],[6,11],[7,12]], [[6,9],[7,10],[7,11],[6,12]], [[6,9],[7,10],[6,11],[5,12]]];
const brtBalloon = (k, curve) => {
  const ws = brtSizes[k], top = brtNeck - ws.length;
  const rows = ws.map((w, i) => [top + i, 6 - (w - 1) / 2, 6 + (w - 1) / 2]);
  const cells = rows.flatMap(([y, a, b]) => Array.from({ length: b - a + 1 }, (_, i) => [a + i, y]));
  const has = (x, y) => cells.some(([cx, cy]) => cx === x && cy === y);
  const glint = k >= 4 ? [[rows[1][1] + 1, top + 1], [rows[2][1] + 1, top + 2]] : k >= 2 ? [[rows[1][1] + 1, top + 1]] : [];
  const tone = ([x, y]) => glint.some(([gx, gy]) => gx === x && gy === y) ? 'W' : (x > 6 && y > top + 1 && (!has(x + 1, y) || !has(x, y + 1))) ? ':' : '#';
  return stamp([...cells.map(([x, y]) => [x, y, tone([x, y])]), [6, brtNeck, '#'], ...brtStrings[curve % 4].map(([x, y]) => [x, y, ':'])]);
};
const brtBreath = [[0, 380], ...[1, 2, 3, 4, 5].map((k, i) => [k, ease(5, 320, 170)[i]]), [5, 700], ...[4, 3, 2, 1, 0].map((k, i) => [k, ease(5, 340, 180)[i]])]
  .map(([k, ms], i) => F(brtBalloon(k, i), ms));

/* breathing, Float take: the meditation figure from Health's Mindfulness, a round head over a body sitting cross-legged,
   hands resting on the knees, with its soft shadow on the floor. Breathing in, it lifts off its seat and floats up two
   cells, slow at the start and slow into the top, and its shadow draws in under it as it rises. It hangs there for the
   held breath, then breathing out it settles back down just as slowly and the shadow spreads out to meet it */
const brtZen = ['....###....', '...#####...', '...#####...', '....###....', '...........', '...#####...', '..#.###.#..', '.#..###..#.', '..#######..', '###########'];
const brtFloat = (lift, shadow) => stamp([...cellsOf(brtZen, 1, 2 - lift), ...Array.from({ length: shadow }, (_, i) => [6 - (shadow - 1) / 2 + i, 12, ':'])]);
const brtZenLoop = [F(brtFloat(0, 11), 540), F(brtFloat(0, 9), 260), F(brtFloat(1, 9), 330), F(brtFloat(1, 7), 300), F(brtFloat(2, 7), 360), F(brtFloat(2, 5), 760),
  F(brtFloat(2, 7), 300), F(brtFloat(1, 7), 330), F(brtFloat(1, 9), 300), F(brtFloat(0, 9), 360)];

const OPTS_D = {
  heartbeat_ecg: Object.assign(seq(...hrtEcg), { still: stamp([...hrtPath.map(([x, y]) => [x, y, '#']), ...hrtHeart('full')]), trail: 0.6 }),
  heartbeat_fill: Object.assign(seq(...hrtPump), { still: hrtFill(2, () => false, [3, 3]) }),
  scanning_faceid: Object.assign(seq(...scnFaceId), { still: scnFace() }),
  scanning_print: Object.assign(seq(...scnTouch), { still: scnPrint(20) }),
  breathing_balloon: Object.assign(seq(...brtBreath), { still: brtBalloon(5, 1) }),
  breathing_float: Object.assign(seq(...brtZenLoop), { still: brtFloat(1, 7) }),
};

/* Spinners, set one: ring, snake, dual, orbit, cascade. Every name here carries the prefix rng. */

/* rings of cells round the centre cell, each in clockwise order from twelve o'clock. The radius 3, 5 and 6 circles are
   midpoint circles. The cascade nests three rings, and concentric midpoint circles two cells apart touch corner to
   corner on the diagonals, so its small and middle rings are the eight cells round the centre and a radius 4 octagon,
   each kept two clear cells from the next */
const rngAngle = ([x, y]) => (Math.atan2(x - 6, 6 - y) * 180 / Math.PI + 360) % 360;
const rngSort = cs => cs.sort((p, q) => rngAngle(p) - rngAngle(q));
const rngCircle = r => {
  const pts = new Map(); let x = 0, y = r, d = 1 - r;
  while (x <= y) {
    for (const [a, b] of [[x, y], [y, x], [-x, y], [-y, x], [x, -y], [y, -x], [-x, -y], [-y, -x]]) pts.set(a + ',' + b, [6 + a, 6 + b]);
    if (d < 0) d += 2 * x + 3; else { d += 2 * (x - y) + 5; y--; } x++;
  }
  return rngSort([...pts.values()]);
};
const rngBand = (lo, hi) => rngSort(Array.from({ length: N * N }, (_, i) => [i % N, Math.floor(i / N)]).filter(([x, y]) => Math.hypot(x - 6, y - 6) >= lo && Math.hypot(x - 6, y - 6) < hi));
const rngR3 = rngCircle(3), rngR5 = rngCircle(5), rngR6 = rngCircle(6), rngS1 = rngBand(0.9, 1.5);
const rngO4 = rngSort([[0, 4], [1, 4], [2, 3], [3, 2], [4, 1]].flatMap(([a, b]) => [[a, b], [b, -a], [-a, -b], [-b, a]]).map(([a, b]) => [6 + a, 6 - b]));
const rngAt = (ring, i) => ring[((Math.round(i) % ring.length) + ring.length) % ring.length];
const rngTone = (cells, t) => cells.map(([x, y]) => [x, y, t]);
/* n cells of a ring centred on angle a (degrees); tip names the tone of the leading cell going clockwise (1) or
   anticlockwise (-1) */
const rngArcAt = (ring, a, n, tone, tip, dir = 1) => { const c = Math.round(a * ring.length / 360 - (n - 1) / 2);
  return Array.from({ length: n }, (_, k) => [...rngAt(ring, c + k), tip && k === (dir > 0 ? n - 1 : 0) ? tip : tone]); };
/* film a motion: sample it every millisecond through the loop, cut a frame wherever the picture changes, and fold any
   frame shorter than 30 ms into the next one. The holds then carry the easing exactly */
const rngFilm = (fn, total) => { const raw = [];
  for (let t = 0; t < total; t++) { const b = fn(t), last = raw[raw.length - 1];
    if (last && last.b.join('') === b.join('')) last.ms++; else raw.push(F(b, 1)); }
  const out = [];
  raw.forEach((f, i) => { if (f.ms < 30 && i < raw.length - 1) raw[i + 1].ms += f.ms; else out.push(f); });
  if (out.length > 1 && out[out.length - 1].ms < 30) out[out.length - 2].ms += out.pop().ms;
  return out; };
const rngSine = p => p <= 0 ? 0 : p >= 1 ? 1 : (1 - Math.cos(Math.PI * p)) / 2;
const rngQuad = p => p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p);

/* spinner, Ring take: a comet runs round a dim ring like a bead round a loop-the-loop. It creeps over the top, falls
   down the right side gathering speed, whips round the bottom and coasts up the left side, slowing, to creep over the
   top again. Its tail is its speed: short and tight at the top, stretched long through the bottom, white head, lit
   body, and the tail runs out into the dim track */
const rngRING_N = rngR5.length;
const rngRingMs = i => { const th = 2 * Math.PI * (i + 0.5) / rngRING_N, vt = 1 / 150, vb = 1 / 34, c = (vb * vb - vt * vt) / 2;
  return Math.round(1 / Math.sqrt(vt * vt + c * (1 - Math.cos(th)))); };
const rngRingLen = i => Math.round(2 + 5 * (150 / rngRingMs(i) - 1) / (150 / 34 - 1));
const rngComet = (h, L) => stamp([...rngTone(rngR5, ':'), ...Array.from({ length: L }, (_, k) => [...rngAt(rngR5, h - 1 - k), '#']), [...rngAt(rngR5, h), 'W']]);
const rngRING = Array.from({ length: rngRING_N }, (_, i) => F(rngComet(i, rngRingLen(i)), rngRingMs(i)));

/* spinner, Snake take: the arc that chases its own tail. The head runs ahead and the arc grows until it nearly closes
   while the tail creeps; then the head creeps and the tail runs to catch up, until the arc is a short dash again. Each
   run is eased, slow off the mark and slow into the end, and in one loop the arc has gone round once. The head is
   white and the last cell of the tail is dim, so it always reads which way it is going */
const rngSNAKE_RUN = 24, rngSNAKE_CREEP = 4, rngSNAKE_MIN = 3, rngSNAKE_HALF = 820;
const rngSnakeArc = (t, h) => stamp(Array.from({ length: h - t + 1 }, (_, k) => [...rngAt(rngR5, t + k), k === h - t ? 'W' : k === 0 ? ':' : '#']));
/* the runner eases, the creeper walks, and the tail never comes closer than a three-cell dash behind the head */
const rngSnakeAt = ms => { const u = (ms % rngSNAKE_HALF) / rngSNAKE_HALF, run = Math.round(rngSNAKE_RUN * rngQuad(u)), creep = Math.round(rngSNAKE_CREEP * u);
  const h = ms < rngSNAKE_HALF ? rngSNAKE_MIN - 1 + run : rngSNAKE_MIN - 1 + rngSNAKE_RUN + creep, t = ms < rngSNAKE_HALF ? creep : rngSNAKE_CREEP + run;
  return rngSnakeArc(Math.min(t, h - rngSNAKE_MIN + 1), h); };
const rngSNAKE = rngFilm(rngSnakeAt, 2 * rngSNAKE_HALF);

/* spinner, Dual take: two arcs on two rings, turning opposite ways. They cross at the top and at the bottom, nested
   one inside the other, and slow as they cross so the pair is seen, then part and race round the far sides. The outer
   arc is lit with a white leading tip; the inner one is dim with a lit tip, further away */
const rngDUAL_HALF = 900;
const rngDualAt = a => stamp([...rngArcAt(rngR3, -a, 5, ':', '#', -1), ...rngArcAt(rngR5, a, 7, '#', 'W', 1)]);
const rngDUAL = rngFilm(t => rngDualAt(180 * Math.floor(t / rngDUAL_HALF) + 180 * rngSine((t % rngDUAL_HALF) / rngDUAL_HALF)), 2 * rngDUAL_HALF);

/* spinner, Orbit take: a moon round a planet. The planet is a round dot, a lit cross with its corners dim. The moon
   is a short comet on a dotted path: a white head, a lit body and a dim tail that fades through the gaps of the path.
   It hangs at the top and at the bottom and swings quickly down and up the sides, two easy beats to a lap */
const rngPLANET = [[6, 6, '#'], [6, 5, '#'], [7, 6, '#'], [6, 7, '#'], [5, 6, '#'], [5, 5, ':'], [7, 5, ':'], [7, 7, ':'], [5, 7, ':']];
const rngORBIT_PATH = rngR5.filter((_, i) => i % 2 === 0);
const rngOrbitAt = i => stamp([...rngTone(rngORBIT_PATH, ':'), ...rngPLANET,
  [...rngAt(rngR5, i), 'W'], [...rngAt(rngR5, i - 1), '#'], [...rngAt(rngR5, i - 2), '#'], ...[3, 4, 5].map(k => [...rngAt(rngR5, i - k), ':'])]);
const rngOrbitMs = ease(14, 130, 40);
const rngORBIT = Array.from({ length: rngR5.length }, (_, i) => F(rngOrbitAt(i), rngOrbitMs[i % 14]));

/* spinner, Cascade take: three nested arcs, a signal. They stand stacked like the bars of a signal icon, then turn
   half a turn together but not quite in step: the turn starts at the middle and spreads outward, the small arc a beat
   ahead of the middle one and the middle one ahead of the big one, so the stack fans open into a spiral as it swings
   and folds back into a stack on the far side, the big arc swinging a cell past and settling. Folded, a light runs out
   through the middle of the three arcs, the signal sent, and it turns again */
const rngCAS_RINGS = [rngS1, rngO4, rngR6], rngCAS_LEN = [3, 7, 11], rngCAS_MOVE = 760;
/* when each arc turns, as fractions of the move: the small one first, the big one last */
const rngCAS_GO = [[0, 0.84], [0.08, 0.92], [0.16, 1]];
/* the big arc runs a cell past the stack and springs back: eased out to the far point, then eased back */
const rngSpring = p => p < 0.88 ? 1.045 * rngSine(p / 0.88) : 1.045 - 0.045 * rngSine((p - 0.88) / 0.12);
const rngCascadeAt = (as, hot = -1) => stamp(as.flatMap((a, i) => rngArcAt(rngCAS_RINGS[i], a, rngCAS_LEN[i], '#').map((c, k) => i === hot && k === (rngCAS_LEN[i] - 1) / 2 ? [c[0], c[1], 'W'] : c)));
const rngCascadeHalf = h => { const end = [0, 1, 2].map(() => 180 * (h + 1));
  return [...rngFilm(t => rngCascadeAt(rngCAS_GO.map(([a, b], i) => { const p = Math.min(1, Math.max(0, (t / rngCAS_MOVE - a) / (b - a)));
      return 180 * h + 180 * (i === 2 ? rngSpring : rngSine)(p); })), rngCAS_MOVE),
    ...[0, 1, 2].map(i => F(rngCascadeAt(end, i), [55, 55, 65][i])), F(rngCascadeAt(end), 140)]; };
const rngCASCADE = [...rngCascadeHalf(0), ...rngCascadeHalf(1)];

const OPTS_SP1 = {
  spinner_ring: Object.assign(seq(...rngRING), { still: rngComet(4, 3) }),
  spinner_snake: Object.assign(seq(...rngSNAKE), { still: rngSnakeArc(0, 17) }),
  spinner_dual: Object.assign(seq(...rngDUAL), { still: rngDualAt(90) }),
  spinner_orbit: Object.assign(seq(...rngORBIT), { still: rngOrbitAt(4) }),
  spinner_cascade: Object.assign(seq(...rngCASCADE), { still: rngCascadeAt([0, 0, 0]), trail: 0.7 }),
};

/* Spinners, second set: blocks, slide, leap, gather, swirl, eclipse. Every name here carries the prefix dts. */

/* round pixel discs of odd diameter, centred on a cell. A bare plus reads as a cross, so the small ones are softened
   with dim corners, the pixel version of anti-aliasing: 3 a lit plus with dim corners, 5 a 5x5 with the corners off,
   7 the radius-3 disc */
const dtsDisc = (cx, cy, d, t = '#') => { const r = (d - 1) / 2, cs = [];
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const corner = Math.abs(x) === r && Math.abs(y) === r;
    if (d === 7 ? Math.hypot(x, y) < 3.6 : !(d === 5 && corner)) cs.push([cx + x, cy + y, d === 3 && corner ? ':' : t]); }
  return cs; };

/* spinner, Blocks take: a three by three grid of square blocks, three cells each with two-cell gutters, so it fills
   the frame edge to edge. A wave runs down the diagonal from the top-left corner to the bottom-right: each block in
   turn softens its corners, shrinks to a point, dims, and grows back, a beat after its neighbour, so the valley of the
   wave is three diagonals wide and slides through the grid like a ripple across tiles. Each block comes back whole
   with a white glint at its heart, so a line of light follows the valley out. The wave sets off slowly, runs fast
   through the long middle diagonal and slows into the far corner; the grid holds whole for a breath and goes again */
const dtsBLK_C = [1, 6, 11];
/* a block at stage 3 whole, 2 with its corners softened, 1 a point, 0 a dim point */
const dtsBlock = (cx, cy, s) => [-1, 0, 1].flatMap(y => [-1, 0, 1].map(x => { const k = Math.abs(x) + Math.abs(y);
  const t = s >= 3 ? '#' : s === 2 ? (k === 2 ? ':' : '#') : k === 0 ? (s === 1 ? '#' : ':') : null;
  return t ? [cx + x, cy + y, t] : null; })).filter(Boolean);
/* stage of a block p frames after the wave reached its diagonal */
const dtsBLK_DIP = [2, 1, 0, 1, 2];
const dtsBlkStage = p => p < 0 || p >= dtsBLK_DIP.length ? 3 : dtsBLK_DIP[p];
const dtsBlocks = t => stamp(dtsBLK_C.flatMap((cy, j) => dtsBLK_C.flatMap((cx, i) => { const p = t - 2 * (i + j);
  return [...dtsBlock(cx, cy, dtsBlkStage(p)), ...(p === dtsBLK_DIP.length || p === dtsBLK_DIP.length + 1 ? [[cx, cy, 'W']] : [])]; })));
const dtsBLK_N = 2 * 4 + dtsBLK_DIP.length + 2;
const dtsBLOCKS = [...Array.from({ length: dtsBLK_N }, (_, t) => F(dtsBlocks(t), ease(dtsBLK_N, 115, 55)[t])), F(dtsBlocks(-1), 300)];

/* spinner, Slide take: the fifteen puzzle cut down to four squares. Three rounded tiles sit in a two by two tray with
   one slot empty, a dim recess, and they take turns sliding into it, so the gap walks round the tray one way while the
   tiles walk round the other. Each slide eases out of rest, crosses the gutter quickly and eases in against the wall.
   A short pause, and the next tile goes */
/* the four slots in turn round the tray, clockwise from top-left, as the top-left cell of a 5x5 tile */
const dtsSLOTS = [[1, 1], [7, 1], [7, 7], [1, 7]];
/* a rectangle from (x0, y0) to (x1, y1) inclusive with dim corners */
const dtsTile = (x0, y0, x1, y1, t = '#') => { const cs = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cs.push([x, y, (x === x0 || x === x1) && (y === y0 || y === y1) ? ':' : t]); return cs; };
const dtsTileAt = ([x, y], dx = 0, dy = 0) => dtsTile(x + dx, y + dy, x + 4 + dx, y + 4 + dy);
/* the empty slot: a dim outline with its corners off */
const dtsRecess = ([x0, y0]) => { const cs = []; for (let y = y0; y <= y0 + 4; y++) for (let x = x0; x <= x0 + 4; x++) { const ex = x === x0 || x === x0 + 4, ey = y === y0 || y === y0 + 4; if ((ex || ey) && !(ex && ey)) cs.push([x, y, ':']); } return cs; };
/* gap g: the empty slot; the tile in slot g-1 (counter-clockwise neighbour) slides into it, moving k cells */
const dtsSLIDE_K = [1, 3, 5, 6], dtsSLIDE_MS = [110, 60, 55, 90];
const dtsSlideFrame = (g, k) => { const from = (g + 3) % 4, [ax, ay] = dtsSLOTS[from], [bx, by] = dtsSLOTS[g];
  const still = [0, 1, 2, 3].filter(s => s !== g && s !== from).flatMap(s => dtsTileAt(dtsSLOTS[s]));
  const dx = Math.sign(bx - ax), dy = Math.sign(by - ay);
  return stamp([...dtsSLOTS.flatMap(dtsRecess), ...still, ...dtsTileAt(dtsSLOTS[from], dx * k, dy * k)]); };
const dtsSlideMove = g => [F(dtsSlideFrame(g, 0), 240), ...dtsSLIDE_K.map((k, i) => F(dtsSlideFrame(g, k), dtsSLIDE_MS[i]))];
const dtsSLIDE = [1, 0, 3, 2].flatMap(g => dtsSlideMove(g));

/* spinner, Leap take: leapfrog. Three dots wait in a row; the last one crouches, springs, and sails over the other two
   in a high arc, hanging for a moment at the top with a white core, while the two it jumps slide back under it to
   make room. It lands at the front, squashes flat for a beat and stands up, and now a different dot is last in line.
   The row never moves off centre, so it plays over and over like a treadmill of little jumps */
const dtsLEAP_Y = 8;
/* a squashed dot, wide and low on the same ground, for the crouch and the landing */
const dtsSquat = cx => [-1, 0, 1].flatMap(x => [0, 1].map(y => [cx + x, dtsLEAP_Y + y, '#']));
const dtsLeapAt = (p, pose) => { const e = p * p * (3 - 2 * p), lx = Math.round(2 + 8 * e), ly = Math.round(dtsLEAP_Y - 20 * p * (1 - p));
  const leaper = pose === 'squat' ? dtsSquat(lx) : [...dtsDisc(lx, ly, 3), ...(pose === 'air' ? [[lx, ly, 'W']] : [])];
  return stamp([...dtsDisc(Math.round(6 - 4 * e), dtsLEAP_Y, 3), ...dtsDisc(Math.round(10 - 4 * e), dtsLEAP_Y, 3), ...leaper]); };
const dtsLEAP = [F(dtsLeapAt(0), 320), F(dtsLeapAt(0, 'squat'), 140), ...[0.15, 0.32, 0.5, 0.68, 0.85].map((p, i) => F(dtsLeapAt(p, 'air'), [65, 85, 140, 85, 65][i])),
  F(dtsLeapAt(1, 'squat'), 120)];
const dtsLEAP_STILL = stamp([2, 6, 10].flatMap(x => dtsDisc(x, 6, 3)));

/* spinner, Gather take: four rounded squares wait in the corners. They draw in to the middle, slowing as they meet,
   with a white spark where they touch, and the little cluster clicks round an eighth of a turn as one: the squares
   become diamonds and the cross of gutters between them becomes an X. Then they spread out to the middles of the sides, draw in again, click another
   eighth and spread back to the corners, so each loop turns the cluster a quarter. No in-between angle is drawn:
   a square turned a little on this grid grows a notch on every side and reads as a pinwheel, so the turn is a soft
   cut, and the engine's afterglow blends one pose into the next */
/* a 4x4 block with dim corners, centred off the middle by o (a half-cell) along each diagonal */
const dtsSquares = o => stamp([-1, 1].flatMap(sy => [-1, 1].flatMap(sx => dtsTile(6 + sx * o - 1.5, 6 + sy * o - 1.5, 6 + sx * o + 1.5, 6 + sy * o + 1.5))));
/* a radius-2 diamond at distance d from the middle on each axis */
const dtsDiamond = (cx, cy) => [-2, -1, 0, 1, 2].flatMap(y => [-2, -1, 0, 1, 2].map(x => Math.abs(x) + Math.abs(y) <= 2 ? [cx + x, cy + y, '#'] : null)).filter(Boolean);
const dtsDiamonds = d => stamp([[0, -d], [d, 0], [0, d], [-d, 0]].flatMap(([x, y]) => dtsDiamond(6 + x, 6 + y)));
/* as the four meet, a white spark at the point where they touch, the middle of the gutters */
const dtsTOUCH = [[6, 6, 'W']];
const dtsGATHER = [F(dtsSquares(4.5), 360), F(dtsSquares(3.5), 100), F(stamp(dtsTOUCH, dtsSquares(2.5)), 70), F(dtsSquares(2.5), 130), F(dtsDiamonds(3), 190),
  F(dtsDiamonds(4), 360), F(stamp(dtsTOUCH, dtsDiamonds(3)), 70), F(dtsDiamonds(3), 130), F(dtsSquares(2.5), 190), F(dtsSquares(3.5), 100)];

/* spinner, Swirl take: eight dots on the edge of a square, at its corners and the middles of its sides, a dim track
   of points, and a light that chases round them. The head is a round dot with a white core, the dot behind it is
   lit, and the tail shrinks and fades back into the track. It does not tick at one speed: it winds up, whips round
   with its tail stretched long, and coasts in with the tail drawn short, so it feels thrown rather than driven */
const dtsSWIRL_AT = [[1, 1], [6, 1], [11, 1], [11, 6], [11, 11], [6, 11], [1, 11], [1, 6]];
/* a dot at level 3 head, 2 lit, 1 a lit point, 0 the dim track */
const dtsSwDot = (x, y, l) => l === 3 ? [...dtsDisc(x, y, 3), [x, y, 'W']] : l === 2 ? dtsDisc(x, y, 3) : [[x, y, l === 1 ? '#' : ':']];
/* the ring with the head at position h and a tail of tl dots behind it */
const dtsSwirl = (h, tl) => stamp(dtsSWIRL_AT.flatMap(([x, y], i) => { const back = ((h - i) % 8 + 8) % 8;
  return dtsSwDot(x, y, back === 0 ? 3 : back > tl ? 0 : back === tl ? 1 : 2); }));
const dtsSWIRL_MS = [150, 120, 95, 80, 65, 55, 50, 50, 50, 55, 65, 80, 95, 120, 150, 170];
const dtsSWIRL = dtsSWIRL_MS.map((ms, t) => F(dtsSwirl(t % 8, ms < 70 ? 3 : ms < 110 ? 2 : 1), ms));

/* spinner, Eclipse take: two discs orbit each other, seen edge-on, so the orbit is told by depth alone. The disc that
   swings in front catches a white glint on its upper edge like a lit sphere and swells; the one that passes behind
   dims to the shadow tone and slips behind it, so for a moment only its rim shows past the front one, a dim crescent,
   then nothing, then the crescent on the other side. Side by side they are the same size and both lit. The orbit
   lingers at the sides and quickens through the crossing. Half an orbit is a whole loop, since after it the two have
   simply swapped places. (A far disc that also shrank was tried: at three cells it was hidden whole or left as a
   sliver, so the far one keeps its size and depth is told by tone) */
const dtsORBIT = 4;
/* one disc at depth z (1 nearest, -1 farthest). Coming forward it catches a white glint, then swells; going back it
   dims */
const dtsBody = (x, z) => {
  if (z > 0.6) return [...dtsDisc(x, 6, 7), [x - 1, 4, 'W'], [x - 2, 5, 'W']];
  if (z > 0.3) return [...dtsDisc(x, 6, 5), [x - 1, 5, 'W']];
  return dtsDisc(x, 6, 5, z > -0.3 ? '#' : ':'); };
const dtsEclipse = th => { const xa = Math.round(6 - dtsORBIT * Math.cos(th)), za = Math.sin(th), xb = 12 - xa, zb = -za;
  const [front, back] = za >= zb ? [dtsBody(xa, za), dtsBody(xb, zb)] : [dtsBody(xb, zb), dtsBody(xa, za)];
  const cover = new Set(front.map(([x, y]) => x + ',' + y)), seen = back.filter(([x, y]) => !cover.has(x + ',' + y));
  /* fewer than three cells of the far disc would only read as a stray, so it is hidden instead */
  return stamp([...(seen.length >= 3 ? seen : []), ...front]); };
/* frames at every angle where something on screen changes, each held for as long as the orbit stays there. The orbit
   runs at a speed that eases: theta(t) = pi t - 0.3 sin(2 pi t), slower at the sides, quicker through the crossing */
const dtsECL_T = 1300;
const dtsECLIPSE = (() => { const steps = 1300, out = []; let prev = null, start = 0;
  for (let s = 0; s <= steps; s++) { const t = s / steps, b = s < steps ? dtsEclipse(Math.PI * t - 0.3 * Math.sin(2 * Math.PI * t)).join('') : null;
    if (b !== prev) { if (prev !== null) out.push([prev, s - start]); prev = b; start = s; } }
  /* a pose held for less than 40 ms only flickers, so it folds into the one before */
  const fs = []; for (const [b, n] of out) { const ms = Math.round(dtsECL_T * n / steps); if (ms < 40 && fs.length) fs[fs.length - 1].ms += ms; else fs.push(F(b.match(/.{13}/g), ms)); }
  return fs; })();

const OPTS_SP2 = {
  spinner_blocks: Object.assign(seq(...dtsBLOCKS), { still: dtsBlocks(-1) }),
  spinner_slide: Object.assign(seq(...dtsSLIDE), { still: dtsSlideFrame(1, 0) }),
  spinner_leap: Object.assign(seq(...dtsLEAP), { still: dtsLEAP_STILL, trail: 0.8 }),
  spinner_gather: Object.assign(seq(...dtsGATHER), { still: dtsSquares(4.5) }),
  spinner_swirl: Object.assign(seq(...dtsSWIRL), { still: dtsSwirl(2, 2) }),
  spinner_eclipse: Object.assign(seq(...dtsECLIPSE), { still: dtsEclipse(Math.PI / 4) }),
};

/* spinners, set three. Shared helpers first */

/* round pixel circles of radius 1 to 6 round the centre cell, as [x, y] cells sorted clockwise from twelve o'clock.
   Each is given by one octant, from the top to the diagonal, and mirrored eight ways. These are the circles a pixel
   artist draws (flat runs at the poles, short steps on the shoulders), rounder than the plain midpoint rasterisation,
   which turns radius 6 into an octagon */
const shpAngle = ([x, y]) => (Math.atan2(x - 6, 6 - y) + 2 * Math.PI) % (2 * Math.PI);
const shpOCTANT = { 1: [[0, -1], [1, -1]], 2: [[0, -2], [1, -2]], 3: [[0, -3], [1, -3], [2, -2]], 4: [[0, -4], [1, -4], [2, -3], [3, -3]], 5: [[0, -5], [1, -5], [2, -4], [3, -4]], 6: [[0, -6], [1, -6], [2, -6], [3, -5], [4, -5]] };
const shpCircle = r => {
  const out = new Map();
  for (const [a, b] of shpOCTANT[r]) for (const [p, q] of [[a, b], [-a, b], [a, -b], [-a, -b], [b, a], [-b, a], [b, -a], [-b, -a]]) out.set((6 + p) + ',' + (6 + q), [6 + p, 6 + q]);
  return [...out.values()].sort((m, n) => shpAngle(m) - shpAngle(n));
};
/* frames whose bitmaps repeat back to back are merged into one held frame */
const shpMerge = frames => frames.reduce((acc, f) => { const last = acc[acc.length - 1]; if (last && last.b.join('') === f.b.join('')) last.ms += f.ms; else acc.push({ b: f.b, ms: f.ms }); return acc; }, []);
const shpMod = (a, n) => ((a % n) + n) % n;

/* spinner, Spokes take: the activity indicator every iPhone has shown, redrawn on the pixel grid. Eight spokes stand
   round a clear hole, the straight ones four cells long and the diagonals three, so both run from radius 3 out to 6 and
   the wheel is round. The light steps round the wheel the way the original does: one spoke white, the two behind it lit,
   the rest dim, so the whole wheel is always there and only the brightness turns */
const shpDIRS = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
const shpSpoke = i => { const [dx, dy] = shpDIRS[i]; return (dx && dy ? [2, 3, 4] : [3, 4, 5, 6]).map(k => [6 + dx * k, 6 + dy * k]); };
const shpSPOKE_TONE = ['W', '#', '#', ':', ':', ':', ':', ':'];
const shpSpokes = head => stamp(shpDIRS.flatMap((_, i) => shpSpoke(i).map(([x, y]) => [x, y, shpSPOKE_TONE[shpMod(head - i, 8)]])));
const shpSPOKES = Array.from({ length: 8 }, (_, k) => F(shpSpokes(k), 120));

/* spinner, Dot Ring take: a dotted circle, twelve single pixels set round the radius 6 circle at the hours of a clock
   face, an even ring an LED matrix would draw. It always shows dim. A lit run with a white head goes round it and
   breathes as it goes, the way the Material spinner does: the head eases away and the run stretches out over half the
   ring, then the tail eases after it and the run gathers to a short dash half a turn on, rests a beat, and goes again.
   Two breaths make one turn */
const shpDOTS = [[6, 0], [9, 1], [11, 3], [12, 6], [11, 9], [9, 11], [6, 12], [3, 11], [1, 9], [0, 6], [1, 3], [3, 1]];
const shpDotRun = (tail, head) => stamp([...shpDOTS.map(([x, y]) => [x, y, ':']),
  ...Array.from({ length: head - tail + 1 }, (_, k) => { const [x, y] = shpDOTS[shpMod(tail + k, 12)]; return [x, y, k === head - tail ? 'W' : '#']; })]);
/* one breath, half a turn: [tail, head, ms]. The head eases away while the tail waits, then the tail eases in
   behind it, and the run rests as a dash before the next breath */
const shpBREATH = [[0, 1, 220], [0, 2, 100], [0, 3, 70], [0, 4, 52], [0, 5, 45], [1, 6, 45], [2, 7, 50], [3, 7, 52], [4, 7, 62], [5, 7, 85]];
const shpDOTRING = [0, 6].flatMap(o => shpBREATH.map(([t, h, ms]) => F(shpDotRun(t + o, h + o), ms)));

/* spinner, Trace take: a rounded square drawn dim, and a bright stroke tracing round it. The stroke speeds down the
   straight sides and slows into each corner, the way a pen slows to turn. Its tail is wherever the head was a moment
   ago, so on the straights it stretches out and in the corners it bunches up and wraps the bend */
const shpTRACK = (() => {
  const p = [];
  for (let x = 6; x <= 9; x++) p.push([x, 1]);
  p.push([10, 2]);
  for (let y = 3; y <= 9; y++) p.push([11, y]);
  p.push([10, 10]);
  for (let x = 9; x >= 3; x--) p.push([x, 11]);
  p.push([2, 10]);
  for (let y = 9; y >= 3; y--) p.push([1, y]);
  p.push([2, 2]);
  for (let x = 3; x <= 5; x++) p.push([x, 1]);
  return p;
})();
/* ms per cell for the head: slowest on the corner cell, quickest mid-side */
const shpCornerDist = i => Math.min(...[4, 12, 20, 28].map(c => Math.min(Math.abs(i - c), 32 - Math.abs(i - c))));
const shpTRACE_MS = Array.from({ length: 32 }, (_, i) => [120, 80, 52, 38, 32][shpCornerDist(i)]);
const shpTRACE_T = shpTRACE_MS.reduce((a, ms) => (a.push(a[a.length - 1] + ms), a), [0]);
/* where the head was `lag` ms before it reached cell i, as a path index that may run below 0 into the previous lap */
const shpTraceTail = (i, lag) => { let t = shpTRACE_T[i] - lag, off = 0; while (t < 0) { t += shpTRACE_T[32]; off -= 32; } let j = 0; while (shpTRACE_T[j + 1] <= t) j++; return j + off; };
const shpTrace = (head, tail) => stamp([...shpTRACK.map(([x, y]) => [x, y, ':']), ...Array.from({ length: head - tail + 1 }, (_, k) => { const [x, y] = shpTRACK[shpMod(tail + k, 32)]; return [x, y, k === head - tail ? 'W' : '#']; })]);
const shpTRACE = Array.from({ length: 32 }, (_, i) => F(shpTrace(i, Math.min(i - 1, shpTraceTail(i, 250))), shpTRACE_MS[i]));

/* spinner, Morph take: a square tile that rounds into a disc while it turns, then squares up again a quarter turn on.
   Free rotation breaks pixel edges, so the tile only stops at the angles the grid draws cleanly: a slope of one in four,
   then one in two, by which time it is mostly round, then the disc, then the same slopes mirrored as it squares up the
   other side of the turn. Lit rim, dim body. Slow off the square, quick through the turn, a beat as a disc. Two
   opposite corners carry a white glint that rides round a cell at a time, so the tile visibly keeps turning while it
   is a disc, and lands on the next pair of corners; two quarter turns bring the glints home */
const shpConvex = pts => { const cs = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const px = x - 6, py = y - 6; if (pts.every(([ax, ay], i) => { const [bx, by] = pts[(i + 1) % pts.length]; return (bx - ax) * (py - ay) - (by - ay) * (px - ax) >= -0.02 * Math.hypot(bx - ax, by - ay); })) cs.push([x, y]); } return cs; };
const shpShade = cs => { const s = new Set(cs.map(([x, y]) => x + ',' + y)), h = (x, y) => s.has(x + ',' + y); return stamp(cs.map(([x, y]) => [x, y, h(x - 1, y) && h(x + 1, y) && h(x, y - 1) && h(x, y + 1) ? ':' : '#'])); };
/* a square of half side s turned th, its corners cut back by a fraction f of each side, as cells */
const shpSquare = (s, th, f) => {
  const c = [[-s, -s], [s, -s], [s, s], [-s, s]].map(([x, y]) => [x * Math.cos(th) - y * Math.sin(th), x * Math.sin(th) + y * Math.cos(th)]);
  return shpConvex(c.flatMap((p, i) => { const a = c[(i + 3) % 4], b = c[(i + 1) % 4]; return [[p[0] + (a[0] - p[0]) * f, p[1] + (a[1] - p[1]) * f], [p[0] + (b[0] - p[0]) * f, p[1] + (b[1] - p[1]) * f]]; }));
};
/* the disc is the round radius 4 pixel circle filled, the same nine cells across as the square */
const shpDISC = (() => { const ring = shpCircle(4), cs = []; for (let y = 2; y <= 10; y++) { const xs = ring.filter(c => c[1] === y).map(c => c[0]); for (let x = Math.min(...xs); x <= Math.max(...xs); x++) cs.push([x, y]); } return cs; })();
/* two opposite corners carry a glint, so the turn shows even while the tile is a disc: the rim cells furthest out
   along the corner's direction (angle a, clockwise from three o'clock) go white */
const shpGlint = (cs, a) => {
  const along = ([x, y]) => (x - 6) * Math.cos(a) + (y - 6) * Math.sin(a), off = ([x, y]) => Math.abs(-(x - 6) * Math.sin(a) + (y - 6) * Math.cos(a));
  const pick = sign => { const end = cs.filter(c => sign * along(c) >= Math.max(...cs.map(d => sign * along(d))) - 0.6), m = Math.min(...end.map(off)); return end.filter(c => off(c) <= m + 0.3); };
  return stamp([...pick(1), ...pick(-1)].map(([x, y]) => [x, y, 'W']), shpShade(cs));
};
const shpA4 = Math.atan2(1, 4), shpA2 = Math.atan2(1, 2), shpQ = Math.PI / 4;
/* one quarter turn, starting from turn k: [cells, angle turned, ms] */
const shpQuarter = k => [[shpSquare(4, 0, 0.12), 0, 380], [shpSquare(4.12, shpA4, 0.15), shpA4, 140], [shpSquare(4.47, shpA2, 0.32), shpA2, 90], [shpDISC, shpQ, 280],
  [shpSquare(4.47, -shpA2, 0.32), 2 * shpQ - shpA2, 90], [shpSquare(4.12, -shpA4, 0.15), 2 * shpQ - shpA4, 140]].map(([cs, a, ms]) => F(shpGlint(cs, shpQ + a + k * 2 * shpQ), ms));
const shpMORPH = [...shpQuarter(0), ...shpQuarter(1)];

/* spinner, Ripple take: a drop at the centre. The dot draws itself up into a small plus, white at its heart, and lets
   go: a ring leaves it and spreads out, quick off the dot and slowing as it widens, dimming as it goes, and at the rim
   it breaks into every other pixel before it is gone. The dot is already gathering for the next one before the last
   ring has faded */
const shpRING = { 2: shpCircle(2), 3: shpCircle(3), 4: shpCircle(4), 5: shpCircle(5), 6: shpCircle(6) };
/* a ring's cells by its age in 60 ms units */
const shpRippleRing = age => {
  const at = [[2, 2, '#'], [4, 3, '#'], [7, 4, '#'], [10, 5, ':'], [14, 6, ':'], [16, 6, '.']].find(([until]) => age < until);
  if (age < 0 || !at) return [];
  const [, r, tone] = at, cs = shpRING[r];
  return tone === '.' ? cs.filter((_, i) => i % 2 === 0).map(([x, y]) => [x, y, ':']) : cs.map(([x, y]) => [x, y, tone]);
};
const shpRippleAt = u => {
  const p = shpMod(u, 12), swell = p >= 10;
  return stamp([...shpRippleRing(p), ...shpRippleRing(p + 12), ...(swell ? [[6, 6, 'W'], [5, 6, '#'], [7, 6, '#'], [6, 5, '#'], [6, 7, '#']] : [[6, 6, '#']])]);
};
const shpRIPPLE = shpMerge(Array.from({ length: 24 }, (_, u) => F(shpRippleAt(u), 60)));

/* spinner, Equalizer take: seven bars standing on a centre line, rising and falling as a wave travels through them,
   the way a voice memo draws sound. One wavelength spans the seven bars, so as one crest leaves on the right the next
   is rising on the left and the meter never goes flat; the crest carries white tips as it passes through. Heights move
   in half cells: a bar between two heights wears dim caps, so no bar ever jumps more than a cell. The bars swell most
   in the middle and least at the ends, so the silhouette stays balanced while the wave runs across */
const shpEQ_ENV = [0.5, 0.75, 0.92, 1, 0.92, 0.75, 0.5];
const shpBars = (hs, hot = -1) => stamp(hs.flatMap((H, i) => {
  const x = 2 * i, out = [], full = Math.floor((H - 1) / 2);
  for (let d = 0; d <= full; d++) out.push([x, 6 - d, i === hot && d === full ? 'W' : '#'], [x, 6 + d, i === hot && d === full ? 'W' : '#']);
  if (H % 2 === 0) out.push([x, 6 - full - 1, ':'], [x, 6 + full + 1, ':']);
  return out;
}));
const shpEqH = u => shpEQ_ENV.map((e, i) => Math.max(1, Math.min(13, Math.round(1 + 12 * e * (0.12 + 0.88 * (0.5 + 0.5 * Math.sin(2 * Math.PI * (u - i / 7))))))));
/* the crest of the wave, the bar it is passing through, wears white tips */
const shpEqAt = u => { const hs = shpEqH(u), c = shpMod(Math.round(7 * (u - 0.25)), 7); return shpBars(hs, hs[c] >= 9 ? c : -1); };
const shpEQ = Array.from({ length: 24 }, (_, k) => F(shpEqAt(k / 24), 60));

/* spinner, Flip take: a square tile turns over. It tips on its horizontal axis: the far edge narrows away in
   perspective, the near edge catches the light, it goes edge-on as a single bright line and opens onto its back, shaded
   dim inside a lit rim, the same edge still nearest and still lit. Then it turns on its vertical axis the same way, back to its face. Each turn is slow off the mark, quick through
   edge-on and slow to land, with a beat on each face */
const shpTile = (ws, back, glint, vert) => {
  const y0 = 6 - (ws.length - 1) / 2, cs = [];
  ws.forEach((w, i) => { for (let k = 0; k < w; k++) { const x = 6 - (w - 1) / 2 + k, y = y0 + i, rim = i === 0 || i === ws.length - 1 || k === 0 || k === w - 1; cs.push([x, y, back && !rim ? ':' : i === glint && Math.abs(x - 6) <= 1 ? 'W' : '#']); } });
  return stamp(vert ? cs.map(([x, y, c]) => [y, x, c]) : cs);
};
const shpR9 = n => Array(n).fill(9);
/* the shapes of one half turn, face toward the viewer to edge-on: row widths from the far edge to the near edge */
const shpTURN = [[7, ...shpR9(6)], [7, 7, 9, 9, 9], [5, 7, 9]];
const shpHalf = (back, vert, opening) => {
  const fr = shpTURN.map((ws, i) => { const g = i ? ws.length - 1 : -1; return opening ? shpTile(ws.slice().reverse(), back, i ? 0 : -1, vert) : shpTile(ws, back, g, vert); });
  return opening ? fr.reverse() : fr;
};
const shpEDGE = vert => shpTile([9], false, 0, vert);
const shpFLIP_MS = [150, 90, 60];
const shpFLIP = [F(shpTile(shpR9(9)), 420), ...shpHalf(false, false, false).map((b, i) => F(b, shpFLIP_MS[i])), F(shpEDGE(false), 50),
  ...shpHalf(true, false, true).map((b, i) => F(b, shpFLIP_MS[2 - i])), F(shpTile(shpR9(9), true), 380),
  ...shpHalf(true, true, false).map((b, i) => F(b, shpFLIP_MS[i])), F(shpEDGE(true), 50),
  ...shpHalf(false, true, true).map((b, i) => F(b, shpFLIP_MS[2 - i]))];

const OPTS_SP3 = {
  spinner_spokes: Object.assign(seq(...shpSPOKES), { still: shpSpokes(0) }),
  spinner_dotring: Object.assign(seq(...shpDOTRING), { still: shpDotRun(-2, 1) }),
  spinner_trace: Object.assign(seq(...shpTRACE), { still: shpTrace(2, -3), trail: 0.8 }),
  spinner_morph: Object.assign(seq(...shpMORPH), { still: shpMORPH[0].b }),
  spinner_ripple: Object.assign(seq(...shpRIPPLE), { still: stamp([[6, 6, '#'], ...shpRING[3].map(([x, y]) => [x, y, '#']), ...shpRING[6].map(([x, y]) => [x, y, ':'])]) }),
  spinner_equalizer: Object.assign(seq(...shpEQ), { still: shpBars([3, 6, 9, 13, 9, 6, 3], 3) }),
  spinner_flip: Object.assign(seq(...shpFLIP), { still: shpTile(shpR9(9)) }),
};

const SPRITES = {
  thinking: Object.assign(seq(...[0, 1, 2, 3, 4].map(k => F(bubbleWave(k), 125)), F(bubbleWave(5), 480)), { still: bubbleWave('all') }),
  reading: Object.assign(seq(F(readUpTo(0), 420), ...Array.from({ length: TEXT_CELLS.length - 1 }, (_, k) => F(readUpTo(k + 1), readMs(k + 1))), F(readUpTo(TEXT_CELLS.length), 700), ...TURN.map((c, i) => F(peelAt(c), TURN_MS[i])), F(peelAt(-11), 260)), { still: readUpTo(TEXT_CELLS.length) }),
  analyzing: restAtLongest(seq(...[1, 2, 3, 4, 5, 6, 7].map(f => F(bars(BAR_H.map((H, i) => riseH(H, f - i))), 95)), ...[0, 1, 2, 3].map(i => F(bars(BAR_H, i), 140)), F(bars(BAR_H), 900), ...[1, 2, 3, 4, 5, 6].map(f => F(bars(BAR_H.map((H, i) => fallH(H, f - i))), [90, 75, 65, 60, 60, 60][f - 1])), F(EMPTY, 180))),
  searching: Object.assign(seq(...MAG_PATH.map(([x, y], i) => F(searchAt(x, y, i === 0), MAG_MS[i]))), { still: searchAt(2, 2), trail: 0.6 }),
  generating: Object.assign(seq(F(sparkle(1, 2), 190), F(sparkle(2, 1), 105), F(sparkle(4, 0, 'big'), 125), F(sparkle(3, 0), 620), F(sparkle(3, 1), 110), F(sparkle(2, 2, 'small'), 125), F(sparkle(1, 2), 150), F(sparkle(-1, 2), 110)), { still: sparkle(4, 2) }),
  writing: Object.assign(seq(...HAND.flatMap((_, t) => t === I_AT ? [F(writeAt(t), handMs(t)), F(writeAt(t, 5), 120), F(writeAt(t, I_DOT_Y, true, true), 90), F(writeAt(t, 9, true), 100)] : [F(writeAt(t), handMs(t))])), { rest: 3, trail: 0.5 }),
  syncing: Object.assign(seq(F(syncAt(0, 0), 260), ...[1, 2, 3, 4, 5, 6, 7].map(k => F(syncAt(k, 0), DASH_MS[k])), F(syncAt(0, 0), 260), ...[1, 2, 3, 4, 5, 6, 7].map(k => F(syncAt(0, k), DASH_MS[k]))), { still: syncAt(0, 0), trail: 0.6 }),
  connecting_plug: Object.assign(seq(F(plugAt(1, 9), 420), F(plugAt(2, 8), 140), F(plugAt(3, 7), 100), F(plugAt(4, 7, { spark: true }), 80), F(plugAt(3, 7), 120),
    ...[1, 2, 3].map(k => F(plugAt(3, 7, { flow: k }), 60)), F(PLUG_LIT, 1000), F(plugAt(3, 7), 140), F(plugAt(2, 8), 90)), { still: plugAt(2, 8), trail: 0.6 }),
  connecting: restAtLongest(seq(...RISE)),
  connecting_ripple: restAtLongest(seq(...RIPPLE)),
  uploading: Object.assign(seq(...Array.from({ length: ARROW_GAP }, (_, t) => F(trayFrame(t, true), 100))), { rest: 10, trail: 0.45 }),
  uploading_cloud: Object.assign(seq(...Array.from({ length: CLOUD_GAP }, (_, t) => F(cloudFrame(t, true), 110))), { rest: 3, trail: 0.45 }),
  uploading_launch: Object.assign(seq(...LAUNCH), { rest: 0, trail: 0.5 }),
  downloading: Object.assign(seq(...Array.from({ length: ARROW_GAP }, (_, t) => F(trayFrame(t, false), 100))), { rest: 9, trail: 0.45 }),
  downloading_cloud: Object.assign(seq(...Array.from({ length: CLOUD_GAP }, (_, t) => F(cloudFrame(t, false), 110))), { rest: 3, trail: 0.45 }),
  downloading_dock: restAtLongest(seq(...DOCK)),
  done: restAtLongest(seq(...MORPH_IN, ...Array.from({ length: 14 }, (_, c) => F(glint(c - 1), 35)), F(CHECK, 1150), ...MORPH_OUT)),
  done_bend: restAtLongest(seq(...BEND)),
  done_skate: restAtLongest(seq(...SKATE)),
  done_flip: restAtLongest(seq(...FLIP)),
  done_stroke: restAtLongest(seq(...CHECK_PAIRS.map((_, k) => F(strokeTo(0, k + 1, true), [80,70,60,55,50,45,45,45,50,55,65,80][k])), F(CHECK, 520), ...Array.from({ length: 14 }, (_, c) => F(glint(c - 1), 35)), F(CHECK, 900), ...CHECK_PAIRS.slice(1).map((_, k) => F(strokeTo(k + 1, CHECK_PAIRS.length, false), 40)), F(EMPTY, 280))),
  done_spring: restAtLongest(seq(F(shift(CHECK, 0, -7), 60), F(shift(CHECK, 0, -4), 60), F(shift(CHECK, 0, -1), 60), F(shift(CHECK, 0, 1), 90), F(put(CHECK, CHECK_PAIRS[3], 'W'), 100), F(CHECK, 1500), F(shift(CHECK, 0, 3), 60), F(shift(CHECK, 0, 7), 60), F(EMPTY, 320))),
  error_shake: Object.assign(seq(F(alarm(0), 1000), F(alarm(-1, true), 65), F(alarm(1, true), 65), F(alarm(-1, true), 75), F(alarm(1, true), 90), F(alarm(0, true), 130), F(alarm(0), 130), F(alarm(0, true), 130), F(alarm(0), 420)), { rest: 0, trail: 0.35 }),
  error: Object.assign(seq(...GLITCH), { rest: 0, trail: 0.3 }),
  error_build: restAtLongest(seq(...BUILD)),
  error_pulse: Object.assign(seq(...PULSE), { rest: 0 }),
  building: Object.assign(seq(F(workshop(0, 6), 420), F(workshop(1, 6), 90), F(workshop(3, 8, 0, true), 90), F(workshop(3, 8), 130), F(workshop(1, 8), 90), F(workshop(0, 8), 150), F(workshop(3, 8), 90), F(workshop(5, 10, 0, true), 90), F(workshop(5, 10), 150), F(workshop(3, 10), 90), F(workshop(1, 10), 90), F(workshop(0, 10), 120), ...[1, 2, 3, 4, 5].map(k => F(workshop(0, 10, k), ease(5, 135, 80)[k - 1]))), { rest: 0 }),
  debugging: Object.assign(seq(...antLoop()), { still: stamp(antCells('all')), trail: 0.5 }),
  heartbeat: seq(F(HEART_S, 520), F(HEART_L, 90), F(halo(HEART_M), 90), F(halo(HEART_S), 110), F(HEART_S, 40), F(HEART_L, 70), F(halo(HEART_M), 80), F(halo(HEART_S), 120), F(HEART_S, 560)),
  scanning: Object.assign(seq(...SCAN.map((r, k) => F(dna(k * Math.PI / 8, r), 95))), { still: dna(0), trail: 0.5 }),
  breathing: seq(F(guide(LUNG_S), 900), ...AIR_DOWN.map(c => F(guide(put(LUNG_S, [c])), 110)), F(guide(LUNG_M), 320), F(LUNG_L, 1700), ...AIR_UP.map(c => F(put(LUNG_L, [c]), 110)), F(guide(LUNG_M), 320)),
  calculating: restAtLongest(seq(...OPERATORS)),
  calculating_keypad: restAtLongest(seq(...KEYPAD)),
  calculating_sigma: restAtLongest(seq(...SIGMA_PATH.map((_, k) => F(sigmaAt(0, k + 1), DRAW_MS[k])), F(sigmaAt(0, 23, 'W'), 110), F(sigmaAt(0, 23, '#'), 1000), ...[4, 8, 12, 16, 20, 23].map(k => F(sigmaAt(k, 23, '#'), 55)), F(sigmaAt(0, 0, ':'), 120), F(sigmaAt(0, 0), 260))),
};
Object.assign(SPRITES, OPTS_A, OPTS_B, OPTS_C, OPTS_D, OPTS_SP1, OPTS_SP2, OPTS_SP3);
if (typeof module !== 'undefined') module.exports = { SPRITES, EMPTY };
