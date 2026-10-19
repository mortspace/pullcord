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
const LENS = bm(
  '..###....',
  '.#...#...',
  '#.....#..',
  '#.....#..',
  '#.....#..',
  '.#...#...',
  '..###.#..',
  '......##.',
  '.......##');
const LENS_COL = x => [[x,1],[x,2],[x,3],[x,4],[x,5]].filter(([c, r]) => (r === 1 || r === 5) ? (c >= 2 && c <= 4) : (c >= 1 && c <= 5));
/* thinking: a bulb; the filament lights, then the whole bulb flashes */
const BULB = bm(
  '...###...',
  '..#...#..',
  '.#.....#.',
  '.#..#..#.',
  '.#.#.#.#.',
  '..#...#..',
  '...###...',
  '...#.#...',
  '...###...');
const FIL = [[4,3],[3,4],[5,4]];
/* reading: a page with a folded corner; lines appear under a reading cursor */
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
/* generating: a four-point sparkle that grows and settles */
const STAR_S = bm('.........','.........','.........','....#....','...###...','....#....','.........','.........','.........');
const STAR_M = bm('.........','....#....','....#....','...###...','..#####..','...###...','....#....','....#....','.........');
const STAR_L = bm('....#....','....#....','...###...','..#####..','#########','..#####..','...###...','....#....','....#....');
/* writing: lines of text are typed cell by cell under a cursor; when the page fills it scrolls up */
const LINE1 = 7, LINE2 = 5, LINE3 = 7;
const textRow = (row, n) => Array.from({ length: n }, (_, x) => [x, row]);
const typed = (base, row, n, cursor) => put(put(base, textRow(row, n), '#'), cursor ? [[n, row]] : [], 'W');
const PAGE1 = put(EMPTY, textRow(1, LINE1), '#');
/* connecting: a plug that seats into a socket bar */
const SOCKET = bm('#########','.........','.........','.........','.........','.........','.........','.........','.........');
const PLUG = bm('.........','.........','.........','..#...#..','..#...#..','.#######.','.#######.','..#####..','....#....');
/* uploading / downloading: an arrow through a tray */
const TRAY = bm('.........','.........','.........','.........','.........','.........','#.......#','#.......#','#########');
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
  done_spring: restAtLongest(seq(F(shift(CHECK, 0, -5), 60), F(shift(CHECK, 0, -3), 60), F(shift(CHECK, 0, -1), 60), F(shift(CHECK, 0, 1), 90), F(hot(CHECK), 100), F(CHECK, 1500), F(shift(CHECK, 0, 2), 60), F(shift(CHECK, 0, 5), 60), F(EMPTY, 320))),
  building: seq(F(HAM_RAISED, 620), F(HAM_MID, 90), F(put(HAM_STRIKE, [[3,4],[0,1]]), 100), F(HAM_STRIKE, 220), F(HAM_MID, 110)),
  syncing: seq(...[0,1,2,3,4,5,6,7,8].map(k => F(over(wrapX(ARROW_R, k), wrapX(ARROW_L, -k)), 130))),
  searching: seq(F(LENS, 420), ...[1,2,3,4,5].map(x => F(put(LENS, LENS_COL(x)), 150)), F(LENS, 200), F(put(LENS, [[2,2]]), 180)),
  analyzing: seq(...[0,1,2,3,4,5,6].map(t => F(bars(t), 110)), ...[[1,5],[3,3],[5,4],[7,1]].map(c => F(put(bars(9), [c]), 130)), F(bars(9), 900), ...[5,3,1].map(t => F(bars(t), 70))),
  thinking: seq(F(BULB, 520), F(put(BULB, FIL), 420), F(put(hot(BULB), [[0,0],[8,0]]), 120), F(put(BULB, FIL), 300)),
  reading: seq(F(PAGE, 420), ...[3,4,5].map(c => F(put(PAGE, [[c,4]]), 110)), F(put(PAGE, LINE(4), '#'), 320), ...[3,4,5].map(c => F(put(put(PAGE, LINE(4), '#'), [[c,6]]), 110)), F(put(PAGE, [...LINE(4), ...LINE(6)], '#'), 1000), F(put(PAGE, LINE(4), '#'), 90)),
  generating: seq(F(STAR_S, 320), F(STAR_M, 150), F(put(STAR_L, [[1,1],[7,7]]), 640), F(STAR_M, 150), F(put(STAR_S, [[7,1],[1,7]]), 320)),
  writing: seq(...Array.from({ length: LINE2 + 1 }, (_, n) => F(typed(PAGE1, 4, n, true), 85)), F(typed(PAGE1, 4, LINE2, false), 160), F(typed(PAGE1, 4, LINE2, true), 160), ...Array.from({ length: LINE3 + 1 }, (_, n) => F(typed(typed(PAGE1, 4, LINE2, false), 7, n, true), 85)), F(typed(typed(PAGE1, 4, LINE2, false), 7, LINE3, false), 220), F(typed(typed(PAGE1, 4, LINE2, false), 7, LINE3, true), 220), ...[1,2,3,4,5,6].map(k => F(shift(typed(typed(PAGE1, 4, LINE2, false), 7, LINE3, false), 0, -k), 70))),
  connecting: seq(F(over(SOCKET, PLUG), 520), F(over(SOCKET, shift(PLUG, 0, -1)), 150), F(put(over(SOCKET, shift(PLUG, 0, -2)), [[2,1],[6,1],[2,0],[6,0]]), 240), F(over(SOCKET, shift(PLUG, 0, -2)), 900), F(over(SOCKET, shift(PLUG, 0, -1)), 150)),
  uploading: seq(...[2,1,0,-1,-2,-3].map(dy => F(over(TRAY, shift(ARR_UP, 0, dy)), 140)), F(TRAY, 380)),
  downloading: seq(...[-3,-2,-1,0,1,2].map(dy => F(over(TRAY, shift(ARR_DN, 0, dy)), 140)), F(hot(TRAY), 110), F(TRAY, 300)),
  error: seq(F(put(TRI, BANG, '#'), 900), F(TRI, 220), F(put(TRI, BANG, '#'), 900), F(shift(put(TRI, BANG, '#'), 1, 0), 70), F(shift(put(TRI, BANG, '#'), -1, 0), 70), F(shift(put(TRI, BANG, '#'), 1, 0), 70)),
  debugging: seq(...Array.from({ length: 14 }, (_, i) => F(BUG(i - 7, i), 160))),
  heartbeat: seq(F(HEART_S, 520), F(HEART_L, 90), F(HEART_M, 90), F(HEART_S, 140), F(HEART_L, 70), F(HEART_M, 80), F(HEART_S, 610)),
  scanning: seq(...[0,1,2,3,4,5,6,7].map(k => F(dna(k * Math.PI / 4), 150))),
  breathing: seq(F(LUNG_S, 900), ...AIR_DOWN.map(c => F(put(LUNG_S, [c]), 110)), F(LUNG_M, 320), F(LUNG_L, 1700), ...AIR_UP.map(c => F(put(LUNG_L, [c]), 110)), F(LUNG_M, 320)),
  calculating: seq(...SIGMA_PATH.map(c => F(put(SIGMA, [c]), 60)), F(put(SIGMA, EQ, '#'), 480), F(SIGMA, 200), F(put(SIGMA, EQ, '#'), 480), F(SIGMA, 200)),
};
if (typeof module !== 'undefined') module.exports = { SPRITES, EMPTY };
