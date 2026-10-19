/* Variant B pixel sprites. Hand-drawn 9x9 frames with timing. '#' lit, 'W' white-hot, '.' off.
   Pacing rules: a motion frame holds at least 90 ms, a rest holds at least 400 ms, a loop runs 1.2 to 3.5 s.
   Optional per sprite: rest (the frame shown when frozen), glow (bloom multiplier), trail (decay multiplier; below 1 keeps fast motion crisp). */
const bm = (...rows) => rows;
const EMPTY = bm('.........','.........','.........','.........','.........','.........','.........','.........','.........');
const shift = (b, dx, dy) => b.map((_, r) => Array.from({ length: 9 }, (__, c) => { const sr = r - dy, sc = c - dx; return (sr >= 0 && sr < 9 && sc >= 0 && sc < 9) ? b[sr][sc] : '.'; }).join(''));
const over = (...bs) => bs[0].map((_, r) => Array.from({ length: 9 }, (__, c) => { let v = '.'; for (const b of bs) { const ch = b[r][c]; if (ch === 'W') v = 'W'; else if (ch === '#' && v === '.') v = '#'; } return v; }).join(''));
const hot = b => b.map(r => r.replace(/#/g, 'W'));
const wrapX = (b, dx) => b.map(r => { const d = ((dx % 9) + 9) % 9; return r.slice(9 - d) + r.slice(0, 9 - d); });
const wrapXY = (b, dx, dy) => { const w = wrapX(b, dx), d = ((dy % 9) + 9) % 9; return [...w.slice(9 - d), ...w.slice(0, 9 - d)]; };
const cellsUpTo = (b, path, k, ch = '#') => put(b, path.slice(0, k), ch);
const rowsUpTo = (b, k) => b.map((r, i) => i < k ? r : '.........');
const colsUpTo = (b, k) => b.map(r => r.slice(0, k) + '.'.repeat(9 - k));
const put = (b, cells, ch = 'W') => b.map((r, i) => r.split('').map((v, c) => cells.some(([x, y]) => x === c && y === i) ? ch : v).join(''));
const F = (b, ms) => ({ b, ms });
const seq = (...frames) => ({ frames, period: frames.reduce((a, f) => a + f.ms, 0) / 1000 });

/* done: a two-cell check. Both arms are exact 45 degree diagonals, the short arm three steps, the long arm five.
   Two takes share the same check: Stroke (the default) and Spring. */
const CHECK_PAIRS = [[[0,5],[1,5]],[[1,6],[2,6]],[[2,7],[3,7]],[[3,6],[4,6]],[[4,5],[5,5]],[[5,4],[6,4]],[[6,3],[7,3]],[[7,2],[8,2]]];
const strokeTo = (from, to, tip) => put(put(EMPTY, CHECK_PAIRS.slice(from, to).flat(), '#'), tip ? CHECK_PAIRS[to - 1] : [], 'W');
const CHECK = strokeTo(0, 8, false);
const glint = c => put(CHECK, CHECK_PAIRS.flat().filter(([x]) => x === c || x === c + 1), 'W');
const restAtLongest = sp => (sp.rest = sp.frames.reduce((bi, f, i, a) => f.ms > a[bi].ms ? i : bi, 0), sp);
/* building: a hammer seen from the side, the way you see it when you drive a nail. A tall head, face down, with the handle
   leaving from its middle to the right. It rises, comes down on the nail and two sparks fly. It is never rotated. */
const NAIL_BOARD = put(EMPTY, [[1,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,8],[7,8],[8,8]], '#');
const hammerAt = top => over(put(EMPTY, [...[0,1].flatMap(x => [0,1,2,3,4].map(r => [x, top + r])), ...[2,3,4,5,6,7,8].map(x => [x, top + 2])], '#'), NAIL_BOARD);
/* syncing: two arrows pointing opposite ways with solid heads; their tails flow toward the heads, one each way */
const SYNC_HEADS = put(EMPTY, [[5,0],[5,1],[6,1],[5,2],[6,2],[7,2],[5,3],[6,3],[5,4],[4,2],[3,4],[3,5],[2,5],[3,6],[2,6],[1,6],[3,7],[2,7],[3,8],[4,6]], '#');
const syncFlow = k => put(SYNC_HEADS, [...[0,1,2,3].filter(x => ((x - k) % 3 + 3) % 3 !== 2).map(x => [x, 2]), ...[5,6,7,8].filter(x => (x + k) % 3 !== 2).map(x => [x, 6])], '#');
/* searching: a magnifying glass with a big lens and a chunky grip; inside the lens a pupil looks around */
const LENS = bm('..###....','.#...#...','#.....#..','#.....#..','#.....#..','.#...#...','..###.#..','......###','.......##');
const look = (x, y) => put(LENS, [[x,y],[x+1,y],[x,y+1],[x+1,y+1]], '#');
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
/* writing: words with spaces are typed under a cursor; the page scrolls, and three lines cycle so the loop is seamless */
const WORDS = ['###.###..', '##.####..', '####.##..'];
const textLine = (b, row, w, n) => put(b, w.split('').map((ch, x) => ch === '#' && x < n ? [x, row] : null).filter(Boolean), '#');
const page3 = (a, b, c, n, cursor) => { let g = textLine(textLine(textLine(EMPTY, 1, a, 9), 4, b, 9), 7, c, n); return cursor ? put(g, [[n, 7]], 'W') : g; };
const writeCycle = (a, b, c) => [...Array.from({ length: 8 }, (_, n) => F(page3(a, b, c, n, true), 95)), F(page3(a, b, c, 7, false), 200), F(page3(a, b, c, 7, true), 200), F(shift(page3(a, b, c, 7, false), 0, -1), 80), F(shift(page3(a, b, c, 7, false), 0, -2), 80)];
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
/* debugging: an ant seen from above, heading to the top-right. Two antennae, a round head, a thin waist and a big abdomen.
   Each leg bends at the knee: front legs reach forward, back legs reach back. Diagonal pairs step in turn while it walks a
   staircase path, and the next ant is already coming in from the bottom-left as this one leaves, so the grid is never empty. */
const ANT_BODY = [[7,0],[6,1],[8,1],[5,2],[6,2],[7,2],[5,3],[6,3],[4,4],[3,5],[1,6],[2,6],[0,7],[1,7],[2,7],[0,8],[1,8]];
const LEG = { fl: [[3,3],[3,2],[3,1]], fl_: [[3,3],[2,2]], rl: [[2,4],[1,4],[0,4]], rl_: [[2,4],[1,3]],
              fr: [[5,5],[6,5],[7,5]], fr_: [[5,5],[6,6]], rr: [[4,6],[4,7],[4,8]], rr_: [[4,6],[5,7]] };
const ANT_REST = put(EMPTY, [...ANT_BODY, ...LEG.fl, ...LEG.rl, ...LEG.fr, ...LEG.rr], '#');
const ANT_A = put(EMPTY, [...ANT_BODY, ...LEG.fl, ...LEG.rr, ...LEG.fr_, ...LEG.rl_], '#');
const ANT_B = put(EMPTY, [...ANT_BODY, ...LEG.fr, ...LEG.rl, ...LEG.fl_, ...LEG.rr_], '#');
const ANT_GAP = 12;
const antStep = i => {
  const s = Math.floor(i / 2), d = s - ANT_GAP / 2, dx = d + (i % 2), pose = s % 2 ? ANT_B : ANT_A;
  return over(shift(s === ANT_GAP / 2 ? ANT_REST : pose, dx, -d), shift(pose, dx - ANT_GAP, ANT_GAP - d), shift(pose, dx + ANT_GAP, -d - ANT_GAP));
};
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
  building: Object.assign(seq(F(hammerAt(0), 600), F(hammerAt(1), 90), F(put(hammerAt(2), [[0,7],[2,7]], 'W'), 100), F(hammerAt(2), 200), F(hammerAt(1), 110)), { rest: 0 }),
  syncing: Object.assign(seq(...[0,1,2].map(k => F(syncFlow(k), 160))), { rest: 0 }),
  searching: Object.assign(seq(...[[2,2],[3,2],[3,3],[2,3]].map(([x, y]) => F(look(x, y), 260))), { rest: 0 }),
  analyzing: seq(...[1,2,3,4,5,6].map(t => F(bars(t), 120)), ...[[1,5],[3,3],[5,4],[7,1]].map(c => F(put(bars(9), [c]), 140)), F(bars(9), 900), ...[5,3].map(t => F(bars(t), 90))),
  thinking: seq(F(bubbleWave(0), 230), F(bubbleWave(1), 230), F(bubbleWave(2), 230), F(bubbleWave(-1), 460)),
  reading: seq(F(PAGE_TEXT, 420), ...LINE(4).map(c => F(put(PAGE_TEXT, [c]), 170)), F(PAGE_TEXT, 200), ...LINE(6).map(c => F(put(PAGE_TEXT, [c]), 170)), F(PAGE_TEXT, 520)),
  generating: seq(F(sparkle(1, true, false), 260), F(sparkle(2, true, false), 160), F(sparkle(3, false, false), 160), F(sparkle(3, false, true), 520), F(sparkle(2, false, false), 160), F(sparkle(2, true, false), 160)),
  writing: seq(...writeCycle(WORDS[0], WORDS[1], WORDS[2]), ...writeCycle(WORDS[1], WORDS[2], WORDS[0]), ...writeCycle(WORDS[2], WORDS[0], WORDS[1])),
  connecting: Object.assign(seq(F(WIFI_DOT, 320), F(WIFI_1, 320), F(WIFI_2, 900), F(WIFI_1, 140), F(WIFI_DOT, 140)), { rest: 2 }),
  uploading: Object.assign(seq(...Array.from({ length: 9 }, (_, t) => F(over(TRAY, arrowStream(t, true)), 110))), { rest: 7, trail: 0.45 }),
  downloading: Object.assign(seq(...Array.from({ length: 9 }, (_, t) => F(over(t === 0 ? TRAY_SQUASH : TRAY, arrowStream(t, false)), 110))), { rest: 6, trail: 0.45 }),
  error: Object.assign(seq(F(put(TRI, BANG, '#'), 1100), F(put(TRI, BANG, 'W'), 130), F(put(TRI, BANG, '#'), 130), F(put(TRI, BANG, 'W'), 130)), { rest: 0 }),
  debugging: Object.assign(seq(...Array.from({ length: 2 * ANT_GAP }, (_, i) => F(antStep(i), 90))), { rest: ANT_GAP, trail: 0.35 }),
  heartbeat: seq(F(HEART_S, 520), F(HEART_L, 90), F(HEART_M, 90), F(HEART_S, 140), F(HEART_L, 70), F(HEART_M, 80), F(HEART_S, 610)),
  scanning: seq(...[0,1,2,3,4,5,6,7].map(k => F(dna(k * Math.PI / 4), 150))),
  breathing: seq(F(LUNG_S, 900), ...AIR_DOWN.map(c => F(put(LUNG_S, [c]), 110)), F(LUNG_M, 320), F(LUNG_L, 1700), ...AIR_UP.map(c => F(put(LUNG_L, [c]), 110)), F(LUNG_M, 320)),
  calculating: seq(...SIGMA_PATH.map(c => F(put(SIGMA, [c]), 60)), F(put(SIGMA, EQ, '#'), 480), F(SIGMA, 200), F(put(SIGMA, EQ, '#'), 480), F(SIGMA, 200)),
};
if (typeof module !== 'undefined') module.exports = { SPRITES, EMPTY };
