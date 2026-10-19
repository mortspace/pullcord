/* Variant B pixel sprites. Hand-drawn 9x9 frames with timing. '#' lit, 'W' white-hot, '.' off.
   Pacing rules: a motion frame holds at least 90 ms, a rest holds at least 400 ms, a loop runs 1.2 to 3.5 s. */
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
/* building: a hammer, head top-left, handle entering the middle of the head and running to the grip bottom-right */
const HAM_RAISED = bm(
  '...##....',
  '..###....',
  '.###.....',
  '#####....',
  '##..##...',
  '.....##..',
  '......##.',
  '.......##',
  '........#');
const HAM_MID = bm(
  '.........',
  '.........',
  '.##......',
  '###......',
  '###......',
  '.#####...',
  '....####.',
  '......###',
  '........#');
const HAM_STRIKE = bm(
  '.........',
  '.........',
  '.........',
  '##.......',
  '##.......',
  '##.......',
  '##.......',
  '#########',
  '..#######');
/* syncing: two arrows exchanging, the top one slides right and the bottom one slides left, wrapping */
const ARROW_R = bm(
  '.........',
  '.....#...',
  '#######..',
  '.....#...',
  '.........',
  '.........',
  '.........',
  '.........',
  '.........');
const ARROW_L = bm(
  '.........',
  '.........',
  '.........',
  '.........',
  '.........',
  '...#.....',
  '..#######',
  '...#.....',
  '.........');
/* searching: a magnifier that stays put while a scan line sweeps the glass */
/* searching: a magnifier with a glint, sweeping slowly left and right like it is scanning a page */
const LENS = bm(
  '.........',
  '..###....',
  '.#...#...',
  '.#...#...',
  '.#...#...',
  '..###....',
  '.....##..',
  '......##.',
  '.........');
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
/* generating: a four-point sparkle that grows and settles */
/* generating: the sparkle pair everyone now reads as AI, a big four-point star and a small one twinkling in turn */
const BIG = r => put(EMPTY, [...Array.from({ length: 2 * r + 1 }, (_, i) => [3, 5 - r + i]), ...Array.from({ length: 2 * r + 1 }, (_, i) => [3 - r + i, 5]), ...(r >= 2 ? [[2,4],[4,4],[2,6],[4,6]] : [])], '#');
const SMALL = big => put(EMPTY, big ? [[7,0],[6,1],[7,1],[8,1],[7,2]] : [[7,1]], '#');
const sparkle = (r, big, hotCore) => put(over(BIG(r), SMALL(big)), hotCore ? [[3,5]] : [], 'W');
/* writing: words with spaces are typed under a cursor; the page scrolls, and three lines cycle so the loop is seamless */
const WORDS = ['###.###..', '##.####..', '####.##..'];
const textLine = (b, row, w, n) => put(b, w.split('').map((ch, x) => ch === '#' && x < n ? [x, row] : null).filter(Boolean), '#');
const page3 = (a, b, c, n, cursor) => { let g = textLine(textLine(textLine(EMPTY, 1, a, 9), 4, b, 9), 7, c, n); return cursor ? put(g, [[n, 7]], 'W') : g; };
const writeCycle = (a, b, c) => [...Array.from({ length: 8 }, (_, n) => F(page3(a, b, c, n, true), 95)), F(page3(a, b, c, 7, false), 200), F(page3(a, b, c, 7, true), 200), F(shift(page3(a, b, c, 7, false), 0, -1), 80), F(shift(page3(a, b, c, 7, false), 0, -2), 80)];
/* connecting: the Wi-Fi fan, the dot first and then each arc, the way a phone shows it is joining a network */
const WIFI_DOT = put(EMPTY, [[4,7]], '#');
const WIFI_1 = put(WIFI_DOT, [[3,4],[4,4],[5,4],[2,5],[6,5]], '#');
const WIFI_2 = put(WIFI_1, [[2,2],[3,2],[4,2],[5,2],[6,2],[1,3],[7,3],[0,4],[8,4]], '#');
/* uploading / downloading: an arrow through a tray */
const TRAY = bm('.........','.........','.........','.........','.........','.........','#.......#','#.......#','#########');
/* on impact the tray walls give a little instead of flashing: a squash, not a light */
const TRAY_SQUASH = bm('.........','.........','.........','.........','.........','.........','.........','#.......#','#########');
const ARR_UP = bm('....#....','...###...','..#####..','....#....','....#....','....#....','.........','.........','.........');
const ARR_DN = bm('....#....','....#....','....#....','..#####..','...###...','....#....','.........','.........','.........');
/* error: a warning triangle with a clear exclamation mark: 3-cell bar, gap, dot */
const TRI = bm(
  '....#....',
  '...#.#...',
  '...#.#...',
  '..#...#..',
  '..#...#..',
  '.#.....#.',
  '.#.....#.',
  '#.......#',
  '#########');
const BANG = [[4,3],[4,4],[4,5],[4,7]];
/* debugging: a bug drawn on the diagonal, head top-right, that walks up-right out of frame and re-enters from the bottom-left */
const BUG_BODY = bm(
  '.....#..#',
  '......##.',
  '......##.',
  '.....###.',
  '....###..',
  '...###...',
  '..###....',
  '..##.....',
  '.........');
const LEGS_A = [[5,1],[3,3],[1,5],[7,5],[5,7],[3,8]];
const LEGS_B = [[4,2],[2,4],[8,4],[6,6],[4,8]];
const BUG = (d, step) => shift(put(BUG_BODY, step % 2 ? LEGS_B : LEGS_A, '#'), d, -d);
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
  building: seq(F(HAM_RAISED, 620), F(HAM_MID, 90), F(put(HAM_STRIKE, [[3,4],[0,1]]), 100), F(HAM_STRIKE, 220), F(HAM_MID, 110)),
  syncing: seq(...[0,1,2,3,4,5].map(k => F(put(over(shift(ARROW_R, 1, 0), shift(ARROW_L, -1, 0)), [[1 + k, 2], [7 - k, 6]], 'W'), 150)), F(over(shift(ARROW_R, 1, 0), shift(ARROW_L, -1, 0)), 420)),
  searching: seq(F(LENS, 300), F(shift(LENS, 1, 0), 300), F(put(shift(LENS, 1, 0), [[3,2]]), 160), F(shift(LENS, 1, 0), 140), F(LENS, 300), F(shift(LENS, -1, 0), 300), F(LENS, 140)),
  analyzing: seq(...[1,2,3,4,5,6].map(t => F(bars(t), 120)), ...[[1,5],[3,3],[5,4],[7,1]].map(c => F(put(bars(9), [c]), 140)), F(bars(9), 900), ...[5,3].map(t => F(bars(t), 90))),
  thinking: seq(F(bubbleWave(0), 230), F(bubbleWave(1), 230), F(bubbleWave(2), 230), F(bubbleWave(-1), 460)),
  reading: seq(F(PAGE_TEXT, 420), ...LINE(4).map(c => F(put(PAGE_TEXT, [c]), 170)), F(PAGE_TEXT, 200), ...LINE(6).map(c => F(put(PAGE_TEXT, [c]), 170)), F(PAGE_TEXT, 520)),
  generating: seq(F(sparkle(1, true, false), 260), F(sparkle(2, true, false), 160), F(sparkle(3, false, false), 160), F(sparkle(3, false, true), 520), F(sparkle(2, false, false), 160), F(sparkle(2, true, false), 160)),
  writing: seq(...writeCycle(WORDS[0], WORDS[1], WORDS[2]), ...writeCycle(WORDS[1], WORDS[2], WORDS[0]), ...writeCycle(WORDS[2], WORDS[0], WORDS[1])),
  connecting: seq(F(WIFI_DOT, 360), F(WIFI_1, 300), F(WIFI_2, 900), F(WIFI_1, 140), F(WIFI_DOT, 140)),
  uploading: seq(...[2,1,0,-1,-2,-3].map(dy => F(over(TRAY, shift(ARR_UP, 0, dy)), 140)), F(TRAY, 380)),
  downloading: seq(...[-3,-2,-1,0,1,2].map(dy => F(over(TRAY, shift(ARR_DN, 0, dy)), 140)), F(TRAY_SQUASH, 110), F(TRAY, 320)),
  error: seq(F(put(TRI, BANG, '#'), 900), F(TRI, 220), F(put(TRI, BANG, '#'), 900), F(shift(put(TRI, BANG, '#'), 1, 0), 70), F(shift(put(TRI, BANG, '#'), -1, 0), 70), F(shift(put(TRI, BANG, '#'), 1, 0), 70)),
  debugging: seq(...Array.from({ length: 14 }, (_, i) => F(BUG(i - 7, i), 160))),
  heartbeat: seq(F(HEART_S, 520), F(HEART_L, 90), F(HEART_M, 90), F(HEART_S, 140), F(HEART_L, 70), F(HEART_M, 80), F(HEART_S, 610)),
  scanning: seq(...[0,1,2,3,4,5,6,7].map(k => F(dna(k * Math.PI / 4), 150))),
  breathing: seq(F(LUNG_S, 900), ...AIR_DOWN.map(c => F(put(LUNG_S, [c]), 110)), F(LUNG_M, 320), F(LUNG_L, 1700), ...AIR_UP.map(c => F(put(LUNG_L, [c]), 110)), F(LUNG_M, 320)),
  calculating: seq(...SIGMA_PATH.map(c => F(put(SIGMA, [c]), 60)), F(put(SIGMA, EQ, '#'), 480), F(SIGMA, 200), F(put(SIGMA, EQ, '#'), 480), F(SIGMA, 200)),
};
if (typeof module !== 'undefined') module.exports = { SPRITES, EMPTY };
