/* Variant B pixel sprites. Hand-drawn 9x9 frames with timing. '#' lit, 'W' white-hot, '.' off.
   Pacing rules: a motion frame holds at least 90 ms, a rest holds at least 400 ms, a loop runs 1.2 to 3.5 s. */
const bm = (...rows) => rows;
const EMPTY = bm('.........','.........','.........','.........','.........','.........','.........','.........','.........');
const shift = (b, dx, dy) => b.map((_, r) => Array.from({ length: 9 }, (__, c) => { const sr = r - dy, sc = c - dx; return (sr >= 0 && sr < 9 && sc >= 0 && sc < 9) ? b[sr][sc] : '.'; }).join(''));
const over = (...bs) => bs[0].map((_, r) => Array.from({ length: 9 }, (__, c) => { let v = '.'; for (const b of bs) { const ch = b[r][c]; if (ch === 'W') v = 'W'; else if (ch === '#' && v === '.') v = '#'; } return v; }).join(''));
const hot = b => b.map(r => r.replace(/#/g, 'W'));
const wrapX = (b, dx) => b.map(r => { const d = ((dx % 9) + 9) % 9; return r.slice(9 - d) + r.slice(0, 9 - d); });
const rowsUpTo = (b, k) => b.map((r, i) => i < k ? r : '.........');
const colsUpTo = (b, k) => b.map(r => r.slice(0, k) + '.'.repeat(9 - k));
const put = (b, cells, ch = 'W') => b.map((r, i) => r.split('').map((v, c) => cells.some(([x, y]) => x === c && y === i) ? ch : v).join(''));
const F = (b, ms) => ({ b, ms });
const seq = (...frames) => ({ frames, period: frames.reduce((a, f) => a + f.ms, 0) / 1000 });

/* done: a bold check, short arm then long arm, 2 px thick */
const TICK = bm(
  '.........',
  '........#',
  '.......##',
  '......##.',
  '.....##..',
  '#...##...',
  '##.##....',
  '.###.....',
  '..#......');
/* building: a solid hammer, grip at the bottom-left, swinging from raised to strike */
const HAM_UP = bm(
  '.....####',
  '....#####',
  '...######',
  '...####..',
  '..###....',
  '.###.....',
  '###......',
  '##.......',
  '#........');
const HAM_MID = bm(
  '.........',
  '.........',
  '......###',
  '.....####',
  '....#####',
  '...####..',
  '.####....',
  '###......',
  '#........');
const HAM_HIT = bm(
  '.........',
  '.........',
  '.........',
  '.........',
  '.....####',
  '.....####',
  '.....####',
  '#########',
  '#########');
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
/* writing: a quill whose tip moves right along a line of ink */
const QUILL = bm(
  '...###...',
  '..####...',
  '.#####...',
  '.####....',
  '.###.....',
  '.##......',
  '.#.......',
  '#........',
  '.........');
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
/* debugging: a bug with a fixed body; only the legs step */
const BUG_BODY = bm(
  '..#...#..',
  '...###...',
  '...###...',
  '..##.##..',
  '..##.##..',
  '..##.##..',
  '..##.##..',
  '...###...',
  '.........');
const LEGS_A = [[0,2],[1,2],[7,2],[8,2],[0,4],[1,4],[7,4],[8,4],[0,6],[1,6],[7,6],[8,6]];
const LEGS_B = [[0,3],[1,3],[7,3],[8,3],[0,5],[1,5],[7,5],[8,5],[0,7],[1,7],[7,7],[8,7]];
/* heartbeat: three heart sizes on a lub-dub */
const HEART_S = bm('.........','..##.##..','.#######.','.#######.','..#####..','...###...','....#....','.........','.........');
const HEART_M = bm('.........','.##...##.','#########','#########','.#######.','..#####..','...###...','....#....','.........');
const HEART_L = bm('.##...##.','####.####','#########','#########','.#######.','..#####..','...###...','....#....','.........');
/* breathing: lungs in three sizes */
const LUNG_S = bm('....#....','....#....','...###...','..##.##..','.###.###.','.###.###.','.###.###.','..##.##..','.........');
const LUNG_M = bm('....#....','....#....','..#####..','.###.###.','.###.###.','####.####','.###.###.','..##.##..','.........');
const LUNG_L = bm('....#....','....#....','..#####..','.###.###.','####.####','####.####','####.####','.###.###.','..##.##..');
/* calculating: a sigma that draws itself; the equals sign blinks */
const SIGMA = bm('######...','.#.......','..#......','...#.....','....#....','...#.....','..#......','.#.......','######...');
const EQ = [[8,3],[8,5]];
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
  done: seq(...[1,2,3,4,5,6,7,8,9].map(k => F(colsUpTo(TICK, k), 70)), F(hot(TICK), 130), F(TICK, 1800), F(EMPTY, 300)),
  building: seq(F(HAM_UP, 520), F(HAM_MID, 100), F(put(HAM_HIT, [[4,3],[8,3]]), 110), F(HAM_HIT, 160), F(HAM_MID, 130)),
  syncing: seq(...[0,1,2,3,4,5,6,7,8].map(k => F(over(wrapX(ARROW_R, k), wrapX(ARROW_L, -k)), 130))),
  searching: seq(F(LENS, 420), ...[1,2,3,4,5].map(x => F(put(LENS, LENS_COL(x)), 150)), F(LENS, 200), F(put(LENS, [[2,2]]), 180)),
  analyzing: seq(...[0,1,2,3,4,5,6].map(t => F(bars(t), 110)), ...[[1,5],[3,3],[5,4],[7,1]].map(c => F(put(bars(9), [c]), 130)), F(bars(9), 900), F(EMPTY, 260)),
  thinking: seq(F(BULB, 520), F(put(BULB, FIL), 420), F(put(hot(BULB), [[0,0],[8,0]]), 120), F(put(BULB, FIL), 300)),
  reading: seq(F(PAGE, 420), ...[3,4,5].map(c => F(put(PAGE, [[c,4]]), 110)), F(put(PAGE, LINE(4), '#'), 320), ...[3,4,5].map(c => F(put(put(PAGE, LINE(4), '#'), [[c,6]]), 110)), F(put(PAGE, [...LINE(4), ...LINE(6)], '#'), 900), F(EMPTY, 260)),
  generating: seq(F(STAR_S, 320), F(STAR_M, 150), F(put(STAR_L, [[1,1],[7,7]]), 640), F(STAR_M, 150), F(put(STAR_S, [[7,1],[1,7]]), 320)),
  writing: seq(...[0,1,2,3].map(dx => F(put(shift(QUILL, dx, 0), Array.from({ length: dx }, (_, i) => [i, 8]), '#'), 230)), F(put(shift(QUILL, 3, 0), [[0,8],[1,8],[2,8],[3,8]], '#'), 520), F(EMPTY, 260)),
  connecting: seq(F(over(SOCKET, PLUG), 520), F(over(SOCKET, shift(PLUG, 0, -1)), 150), F(put(over(SOCKET, shift(PLUG, 0, -2)), [[2,1],[6,1],[2,0],[6,0]]), 240), F(over(SOCKET, shift(PLUG, 0, -2)), 900), F(over(SOCKET, shift(PLUG, 0, -1)), 150)),
  uploading: seq(...[2,1,0,-1,-2,-3].map(dy => F(over(TRAY, shift(ARR_UP, 0, dy)), 140)), F(TRAY, 380)),
  downloading: seq(...[-3,-2,-1,0,1,2].map(dy => F(over(TRAY, shift(ARR_DN, 0, dy)), 140)), F(hot(TRAY), 110), F(TRAY, 300)),
  error: seq(F(put(TRI, BANG, '#'), 900), F(TRI, 220), F(put(TRI, BANG, '#'), 900), F(shift(put(TRI, BANG, '#'), 1, 0), 70), F(shift(put(TRI, BANG, '#'), -1, 0), 70), F(shift(put(TRI, BANG, '#'), 1, 0), 70)),
  debugging: seq(F(put(BUG_BODY, LEGS_A, '#'), 260), F(put(BUG_BODY, LEGS_B, '#'), 260)),
  heartbeat: seq(F(HEART_S, 520), F(HEART_L, 90), F(HEART_M, 90), F(HEART_S, 140), F(HEART_L, 70), F(HEART_M, 80), F(HEART_S, 610)),
  scanning: seq(...[0,1,2,3,4,5,6,7].map(k => F(dna(k * Math.PI / 4), 150))),
  breathing: seq(F(LUNG_S, 1000), F(LUNG_M, 350), F(LUNG_L, 1800), F(LUNG_M, 350)),
  calculating: seq(...[1,2,3,4,5,6,7,8,9].map(k => F(rowsUpTo(SIGMA, k), 70)), F(put(SIGMA, EQ, '#'), 520), F(SIGMA, 220), F(put(SIGMA, EQ, '#'), 520), F(SIGMA, 220), F(EMPTY, 260)),
};
if (typeof module !== 'undefined') module.exports = { SPRITES, EMPTY };
