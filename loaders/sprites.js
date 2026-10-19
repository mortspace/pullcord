/* Variant B pixel sprites. Hand-drawn 9x9 frames with timing. '#' lit, ':' dim, 'W' white-hot, '.' off.
   Pacing rules: a motion frame holds at least 90 ms, a rest holds at least 400 ms, a loop runs 1.2 to 3.5 s.
   Optional per sprite: still (a pose drawn only when frozen), rest (the frame shown when frozen if there is no still),
   glow (bloom multiplier), trail (decay multiplier; below 1 keeps fast motion crisp). */
const bm = (...rows) => rows;
const EMPTY = bm('.........','.........','.........','.........','.........','.........','.........','.........','.........');
const shift = (b, dx, dy) => b.map((_, r) => Array.from({ length: 9 }, (__, c) => { const sr = r - dy, sc = c - dx; return (sr >= 0 && sr < 9 && sc >= 0 && sc < 9) ? b[sr][sc] : '.'; }).join(''));
const RANK = { '.': 0, ':': 1, '#': 2, 'W': 3 };
const over = (...bs) => bs[0].map((_, r) => Array.from({ length: 9 }, (__, c) => { let v = '.'; for (const b of bs) { const ch = b[r][c]; if (RANK[ch] > RANK[v]) v = ch; } return v; }).join(''));
const hot = b => b.map(r => r.replace(/#/g, 'W'));
const wrapX = (b, dx) => b.map(r => { const d = ((dx % 9) + 9) % 9; return r.slice(9 - d) + r.slice(0, 9 - d); });
const wrapXY = (b, dx, dy) => { const w = wrapX(b, dx), d = ((dy % 9) + 9) % 9; return [...w.slice(9 - d), ...w.slice(0, 9 - d)]; };
const cellsUpTo = (b, path, k, ch = '#') => put(b, path.slice(0, k), ch);
const rowsUpTo = (b, k) => b.map((r, i) => i < k ? r : '.........');
const colsUpTo = (b, k) => b.map(r => r.slice(0, k) + '.'.repeat(9 - k));
const put = (b, cells, ch = 'W') => b.map((r, i) => r.split('').map((v, c) => cells.some(([x, y]) => x === c && y === i) ? ch : v).join(''));
const F = (b, ms) => ({ b, ms });
const seq = (...frames) => ({ frames, period: frames.reduce((a, f) => a + f.ms, 0) / 1000 });
const cellsOf = (rows, dx = 0, dy = 0) => rows.flatMap((r, y) => r.split('').map((c, x) => c === '#' ? [x + dx, y + dy] : null).filter(Boolean));
const inGrid = cs => cs.filter(([x, y]) => x >= 0 && x < 9 && y >= 0 && y < 9);
/* place [x, y, tone] cells on a bitmap; where cells overlap the brighter tone wins */
const stamp = (cells, base = EMPTY) => base.map((r, y) => r.split('').map((v, x) => cells.reduce((acc, [cx, cy, ch]) => cx === x && cy === y && RANK[ch] > RANK[acc] ? ch : acc, v)).join(''));
const cellsAll = (rows, dx = 0, dy = 0) => rows.flatMap((r, y) => r.split('').map((c, x) => c !== '.' ? [x + dx, y + dy, c] : null).filter(Boolean));

/* done: a two-cell check. Both arms are exact 45 degree diagonals, the short arm three steps, the long arm five.
   Two takes share the same check: Stroke (the default) and Spring. */
const CHECK_PAIRS = [[[0,5],[1,5]],[[1,6],[2,6]],[[2,7],[3,7]],[[3,6],[4,6]],[[4,5],[5,5]],[[5,4],[6,4]],[[6,3],[7,3]],[[7,2],[8,2]]];
const strokeTo = (from, to, tip) => put(put(EMPTY, CHECK_PAIRS.slice(from, to).flat(), '#'), tip ? CHECK_PAIRS[to - 1] : [], 'W');
const CHECK = strokeTo(0, 8, false);
const glint = c => put(CHECK, CHECK_PAIRS.flat().filter(([x]) => x === c || x === c + 1), 'W');
const restAtLongest = sp => (sp.rest = sp.frames.reduce((bi, f, i, a) => f.ms > a[bi].ms ? i : bi, 0), sp);
/* building: a hammer seen from the side drives a real nail into a plank. The nail stands three cells tall and takes two blows,
   sparks flying on each. Then the plank slides along, the finished nail moves off with the others and a new one comes in. */
const NAIL_GAP = 5;
const nailCells = (x0, hy) => [[x0, hy, '#'], [x0 + 1, hy, '#'], [x0 + 2, hy, '#'], ...Array.from({ length: Math.max(0, 7 - hy) }, (_, k) => [x0 + 1, hy + 1 + k, '#'])];
const workshop = (top, headY, slide = 0, spark = false) => stamp(inGrid([
  ...Array.from({ length: 9 }, (_, x) => [x, 8, ':']),
  ...[1, 2].flatMap(k => nailCells(NAIL_GAP * k + slide, 7)),
  ...nailCells(slide, headY), ...(slide ? nailCells(slide - NAIL_GAP, 5) : []),
  ...[0, 1].flatMap(x => [0, 1, 2, 3].map(r => [x, top + r, '#'])), ...[2, 3, 4, 5, 6, 7, 8].map(x => [x, top + 2, '#']),
  ...(spark ? [[3, headY - 1, 'W']] : []),
]));
/* syncing: two arrows pointing opposite ways with solid heads; their tails flow toward the heads, one each way */
const SYNC_HEADS = put(EMPTY, [[5,0],[5,1],[6,1],[5,2],[6,2],[7,2],[5,3],[6,3],[5,4],[4,2],[3,4],[3,5],[2,5],[3,6],[2,6],[1,6],[3,7],[2,7],[3,8],[4,6]], '#');
const syncFlow = k => put(SYNC_HEADS, [...[0,1,2,3].filter(x => ((x - k) % 3 + 3) % 3 !== 2).map(x => [x, 2]), ...[5,6,7,8].filter(x => (x + k) % 3 !== 2).map(x => [x, 6])], '#');
/* searching: a magnifying glass, a round lens with a glint, a short collar and a solid handle at 45 degrees.
   The whole glass circles, the way the searching glass does on a Mac. */
const MAG = ['.###...','#:..#..','#...#..','#...#..','.###:..','....##.','.....##'];
const magAt = (dx, dy) => stamp(cellsAll(MAG, dx, dy));
const MAG_PATH = [[1,0],[2,0],[2,1],[2,2],[1,2],[0,2],[0,1],[0,0]];
/* thinking: a speech bubble whose three dots rise in turn, the reply-is-coming pattern everyone knows from messaging */
const BUBBLE = bm(
  '.........',
  '.#######.',
  '#.......#',
  '#.......#',
  '#.......#',
  '#.......#',
  '.#######.',
  '..#......',
  '.#.......');
const DOTS = [[2,4],[4,4],[6,4]];
const bubbleWave = up => put(BUBBLE, DOTS.map(([x, y], i) => [x, i === up ? y - 1 : y]), '#');
const PAGE = bm(
  '.#####...',
  '.#...##..',
  '.#...###.',
  '.#.....#.',
  '.#.....#.',
  '.#.....#.',
  '.#.....#.',
  '.#.....#.',
  '.#######.');
const LINE = row => [[3,row],[4,row],[5,row]];
const PAGE_TEXT = put(PAGE, [...LINE(4), ...LINE(6)], '#');
/* generating: the sparkle pair everyone now reads as AI, a big four-point star and a small one twinkling in turn */
const BIG = r => put(EMPTY, [...Array.from({ length: 2 * r + 1 }, (_, i) => [3, 5 - r + i]), ...Array.from({ length: 2 * r + 1 }, (_, i) => [3 - r + i, 5]), ...(r >= 2 ? [[2,4],[4,4],[2,6],[4,6]] : [])], '#');
const SMALL = big => put(EMPTY, big ? [[7,0],[6,1],[7,1],[8,1],[7,2]] : [[7,1]], '#');
const sparkle = (r, big, hotCore) => put(over(BIG(r), SMALL(big)), hotCore ? [[3,5]] : [], 'W');
/* writing: a pencil in two tones so it reads as a pencil: eraser, metal band, body, sharpened wood and a white graphite point.
   It leans like a pencil in a writing hand and leaves a faint line of handwriting behind the point. The page slides under it
   without stopping; the pencil holds steady and lifts once between words, leaving the space a real hand would. */
const PENCIL = [[-6,-6,'#'],[-5,-6,'#'],[-4,-6,'#'],[-5,-5,':'],[-4,-5,':'],[-3,-5,':'],
  [-4,-4,'#'],[-3,-4,'#'],[-2,-4,'#'],[-3,-3,'#'],[-2,-3,'#'],[-1,-3,'#'],[-2,-2,'#'],[-1,-2,'#'],[0,-2,'#'],[-1,-1,':'],[0,-1,':'],[0,0,'W']];
const HAND = [8,7,8,8,7,8,0,0];
const writeAt = t => { const W = x => HAND[(x + t) % HAND.length], tip = 6, lift = W(tip) === 0 ? 1 : 0;
  return stamp(inGrid([...Array.from({ length: tip }, (_, x) => W(x) ? [x, W(x), ':'] : null).filter(Boolean), ...PENCIL.map(([dx, dy, c]) => [tip + dx, 7 - lift + dy, c])])); };
/* connecting: the Wi-Fi fan with each arc on its own rows, filling from the dot outward */
const WIFI_DOT = put(EMPTY, [[4,7]], '#');
const WIFI_1 = put(WIFI_DOT, [[3,4],[4,4],[5,4],[2,5],[6,5]], '#');
const WIFI_2 = put(WIFI_1, [[2,1],[3,1],[4,1],[5,1],[6,1],[1,2],[7,2],[0,3],[8,3]], '#');
/* uploading / downloading: arrows stream through a tray without stopping, a new arrow every nine rows.
   Downloads land with a small squash of the tray walls instead of a flash. */
const TRAY = bm('.........','.........','.........','.........','.........','.........','#.......#','#.......#','#########');
const TRAY_SQUASH = bm('.........','.........','.........','.........','.........','.........','.........','#.......#','#########');
const ARROW_UP_CELLS = [[4,0],[3,1],[4,1],[5,1],[2,2],[3,2],[4,2],[5,2],[6,2],[4,3],[4,4],[4,5]];
const arrowStream = (t, up) => { const cs = []; for (const k of [-1, 0, 1]) { const oy = (up ? 8 - t : t - 6) + 9 * k; for (const [x, y] of ARROW_UP_CELLS) { const yy = (up ? y : 5 - y) + oy; if (yy < 8) cs.push([x, yy]); } } return put(EMPTY, cs, '#'); };
/* error: a warning triangle with a rounded top. The exclamation mark gets a three-cell bar, a gap, a dot, and a clear row above the base. */
const TRI = bm('...###...','...#.#...','..#...#..','..#...#..','.#.....#.','.#.....#.','#.......#','#.......#','#########');
const BANG = [[4,2],[4,3],[4,4],[4,6]];
/* debugging: an ant seen from above, crawling diagonally with its head to the top-right. The body is bright: a round head,
   a pinched waist and a big abdomen. Legs and antennae are dim, so they read as fine detail and never clutter the body.
   Each leg bends at the knee; diagonal pairs step in turn. The next ant comes in from the bottom-left as this one leaves. */
const ANT = [[5,2],[6,2],[5,3],[6,3],[4,4],[2,5],[3,5],[1,6],[2,6],[3,6],[0,7],[1,7],[2,7],[3,7],[1,8],[2,8]].map(([x, y]) => [x, y, '#']);
const FEELERS = [[6,1],[7,0],[7,2],[8,1]];
const LEG = { fl: [[3,3],[3,2],[3,1]], fl_: [[3,3],[2,2]], rl: [[3,4],[2,4],[1,4]], rl_: [[3,4],[2,3]],
              fr: [[5,5],[6,5],[7,5]], fr_: [[5,5],[6,6]], rr: [[4,5],[4,6],[4,7]], rr_: [[4,5],[5,6]] };
const antCells = pose => [...ANT, ...[...FEELERS, ...(pose === 'all' ? [...LEG.fl, ...LEG.rl, ...LEG.fr, ...LEG.rr] : pose ? [...LEG.fr, ...LEG.rl, ...LEG.fl_, ...LEG.rr_] : [...LEG.fl, ...LEG.rr, ...LEG.fr_, ...LEG.rl_])].map(([x, y]) => [x, y, ':'])];
const ANT_GAP = 12;
const crawl = i => { const d = i - ANT_GAP / 2, pose = i % 2; return stamp(inGrid([d - ANT_GAP, d, d + ANT_GAP].flatMap(k => antCells(pose).map(([x, y, c]) => [x + k, y - k, c])))); };
/* heartbeat: three heart sizes on a lub-dub */
const HEART_S = bm('.........','..##.##..','.#######.','.#######.','..#####..','...###...','....#....','.........','.........');
const HEART_M = bm('.........','.##...##.','#########','#########','.#######.','..#####..','...###...','....#....','.........');
const HEART_L = bm('.##...##.','####.####','#########','#########','.#######.','..#####..','...###...','....#....','.........');
/* breathing: lungs in three sizes */
const LUNG_S = bm('....#....','....#....','...###...','..##.##..','.###.###.','.###.###.','.###.###.','..##.##..','.........');
const LUNG_M = bm('....#....','....#....','..#####..','.###.###.','.###.###.','####.####','.###.###.','..##.##..','.........');
const AIR_DOWN = [[4,0],[4,1],[4,2]], AIR_UP = [[4,2],[4,1],[4,0]];
const LUNG_L = bm('....#....','....#....','..#####..','.###.###.','####.####','####.####','####.####','.###.###.','..##.##..');
/* calculating: a sigma that draws itself; the equals sign blinks */
const SIGMA = bm('######...','.#.......','..#......','...#.....','....#....','...#.....','..#......','.#.......','######...');
const EQ = [[8,3],[8,5]];
const SIGMA_PATH = [[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[1,1],[2,2],[3,3],[4,4],[3,5],[2,6],[1,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8]];
function dna(phase) {
  const g = EMPTY.map(r => r.split(''));
  for (let r = 0; r < 9; r++) { const th = r * Math.PI / 4 + phase, a = 4 + Math.round(3 * Math.sin(th)), b = 4 - Math.round(3 * Math.sin(th)); g[r][a] = '#'; g[r][b] = '#'; if (Math.abs(a - b) >= 4 && r % 2 === 0) for (let c = Math.min(a, b) + 1; c < Math.max(a, b); c++) g[r][c] = '#'; }
  return g.map(r => r.join(''));
}
function bars(t) {
  const cols = [1, 3, 5, 7], fin = [3, 5, 4, 7], g = EMPTY.map(r => r.split(''));
  cols.forEach((c, i) => { const h = Math.max(0, Math.min(fin[i], (t - i) * 2)); for (let k = 0; k < h; k++) g[8 - k][c] = '#'; });
  return g.map(r => r.join(''));
}
const SPRITES = {
  done: restAtLongest(seq(...[90,70,55,50,50,55,65,85].map((ms, k) => F(strokeTo(0, k + 1, true), ms)), F(CHECK, 520), ...[-1,0,1,2,3,4,5,6,7,8].map(c => F(glint(c), 40)), F(CHECK, 900), ...[1,2,3,4,5,6,7].map(k => F(strokeTo(k, 8, false), 45)), F(EMPTY, 280))),
  done_spring: restAtLongest(seq(F(shift(CHECK, 0, -5), 60), F(shift(CHECK, 0, -3), 60), F(shift(CHECK, 0, -1), 60), F(shift(CHECK, 0, 1), 90), F(put(CHECK, CHECK_PAIRS[2], 'W'), 100), F(CHECK, 1500), F(shift(CHECK, 0, 2), 60), F(shift(CHECK, 0, 5), 60), F(EMPTY, 320))),
  building: Object.assign(seq(F(workshop(0, 5), 420), F(workshop(1, 5), 90), F(workshop(2, 6, 0, true), 90), F(workshop(2, 6), 130), F(workshop(1, 6), 90), F(workshop(0, 6), 150), F(workshop(2, 6), 90), F(workshop(3, 7, 0, true), 90), F(workshop(3, 7), 150), F(workshop(2, 7), 90), F(workshop(1, 7), 90), F(workshop(0, 7), 120), ...[1, 2, 3, 4].map(k => F(workshop(0, 7, k), 110))), { rest: 0 }),
  syncing: Object.assign(seq(...[0,1,2].map(k => F(syncFlow(k), 160))), { rest: 0 }),
  searching: Object.assign(seq(...MAG_PATH.map(([x, y]) => F(magAt(x, y), 150))), { still: magAt(1, 1), trail: 0.6 }),
  analyzing: seq(...[1,2,3,4,5,6].map(t => F(bars(t), 120)), ...[[1,5],[3,3],[5,4],[7,1]].map(c => F(put(bars(9), [c]), 140)), F(bars(9), 900), ...[5,3].map(t => F(bars(t), 90))),
  thinking: seq(F(bubbleWave(0), 230), F(bubbleWave(1), 230), F(bubbleWave(2), 230), F(bubbleWave(-1), 460)),
  reading: seq(F(PAGE_TEXT, 420), ...LINE(4).map(c => F(put(PAGE_TEXT, [c]), 170)), F(PAGE_TEXT, 200), ...LINE(6).map(c => F(put(PAGE_TEXT, [c]), 170)), F(PAGE_TEXT, 520)),
  generating: seq(F(sparkle(1, true, false), 260), F(sparkle(2, true, false), 160), F(sparkle(3, false, false), 160), F(sparkle(3, false, true), 520), F(sparkle(2, false, false), 160), F(sparkle(2, true, false), 160)),
  writing: Object.assign(seq(...HAND.map((_, t) => F(writeAt(t), 130))), { rest: 2, trail: 0.5 }),
  connecting: Object.assign(seq(F(WIFI_DOT, 320), F(WIFI_1, 320), F(WIFI_2, 900), F(WIFI_1, 140), F(WIFI_DOT, 140)), { rest: 2 }),
  uploading: Object.assign(seq(...Array.from({ length: 9 }, (_, t) => F(over(TRAY, arrowStream(t, true)), 110))), { rest: 7, trail: 0.45 }),
  downloading: Object.assign(seq(...Array.from({ length: 9 }, (_, t) => F(over(t === 0 ? TRAY_SQUASH : TRAY, arrowStream(t, false)), 110))), { rest: 6, trail: 0.45 }),
  error: Object.assign(seq(F(put(TRI, BANG, '#'), 1100), F(put(TRI, BANG, 'W'), 130), F(put(TRI, BANG, '#'), 130), F(put(TRI, BANG, 'W'), 130)), { rest: 0 }),
  debugging: Object.assign(seq(...Array.from({ length: ANT_GAP }, (_, i) => F(crawl(i), 130))), { still: stamp(antCells('all')), trail: 0.5 }),
  heartbeat: seq(F(HEART_S, 520), F(HEART_L, 90), F(HEART_M, 90), F(HEART_S, 140), F(HEART_L, 70), F(HEART_M, 80), F(HEART_S, 610)),
  scanning: seq(...[0,1,2,3,4,5,6,7].map(k => F(dna(k * Math.PI / 4), 150))),
  breathing: seq(F(LUNG_S, 900), ...AIR_DOWN.map(c => F(put(LUNG_S, [c]), 110)), F(LUNG_M, 320), F(LUNG_L, 1700), ...AIR_UP.map(c => F(put(LUNG_L, [c]), 110)), F(LUNG_M, 320)),
  calculating: seq(...SIGMA_PATH.map(c => F(put(SIGMA, [c]), 60)), F(put(SIGMA, EQ, '#'), 480), F(SIGMA, 200), F(put(SIGMA, EQ, '#'), 480), F(SIGMA, 200)),
};
if (typeof module !== 'undefined') module.exports = { SPRITES, EMPTY };
