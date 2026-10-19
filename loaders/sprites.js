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
if (typeof module !== 'undefined') module.exports = { SPRITES, EMPTY };
