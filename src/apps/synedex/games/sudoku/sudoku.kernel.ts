export type SudokuValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type SudokuBoard = SudokuValue[];
export type SudokuGroupName = 'Initiate' | 'Intermediate' | 'Advanced' | 'Expert' | 'Master';
export type SudokuRank = 'IV' | 'III' | 'II' | 'I';
export type SudokuTechnique =
  | 'none'
  | 'naked-single'
  | 'hidden-single'
  | 'locked-candidates'
  | 'naked-pair'
  | 'hidden-pair'
  | 'search';

export interface SudokuTechniqueStats {
  nakedSingles: number;
  hiddenSingles: number;
  lockedCandidates: number;
  nakedPairs: number;
  hiddenPairs: number;
  usedSearch: boolean;
}

export interface SudokuLevelDefinition {
  level: number;
  groupName: SudokuGroupName;
  rank: SudokuRank;
  scoreMin: number;
  scoreMax: number;
  clueMin: number;
  clueMax: number;
}

export interface SudokuSolveResult {
  solved: boolean;
  board: SudokuBoard;
  steps: number;
  backtracks: number;
}

export interface SudokuLogicResult {
  solved: boolean;
  board: SudokuBoard;
  candidates: number[];
  stats: SudokuTechniqueStats;
  contradiction: boolean;
}

export interface SudokuGrade {
  score: number;
  clueCount: number;
  levelName: SudokuGroupName;
  levelNumber: number;
  levelRank: SudokuRank;
  hardestTechnique: SudokuTechnique;
  solvable: boolean;
  uniqueSolution: boolean;
  steps: number;
  backtracks: number;
  techniqueStats: SudokuTechniqueStats;
}

export interface SudokuInput {
  puzzle: string;
}

export interface SudokuOutput {
  ok: boolean;
  error?: string;
  solvedPuzzle?: string;
  score?: number;
  clueCount?: number;
  levelName?: SudokuGroupName;
  levelNumber?: number;
  levelRank?: SudokuRank;
  uniqueSolution?: boolean;
}

export interface GenerateSudokuOptions {
  seed?: number;
  maxAttempts?: number;
}

export interface GeneratedSudokuPuzzle {
  level: SudokuLevelDefinition;
  puzzle: SudokuBoard;
  puzzleString: string;
  solution: SudokuBoard;
  solutionString: string;
  grade: SudokuGrade;
  seed: number;
}

interface LevelGenerationPolicy {
  minTechniqueRank: number;
  maxTechniqueRank: number;
}

const BOARD_SIZE = 81;
const GRID_SIZE = 9;
const BOX_SIZE = 3;
const DEFAULT_MAX_GENERATION_ATTEMPTS = 10;

const LEVEL_GROUPS: readonly SudokuGroupName[] = [
  'Initiate',
  'Intermediate',
  'Advanced',
  'Expert',
  'Master',
];

const LEVEL_RANKS: readonly SudokuRank[] = ['IV', 'III', 'II', 'I'];

const TECHNIQUE_RANK: Record<SudokuTechnique, number> = {
  none: 0,
  'naked-single': 1,
  'hidden-single': 2,
  'locked-candidates': 3,
  'naked-pair': 4,
  'hidden-pair': 5,
  search: 6,
};

const SCORE_BANDS: ReadonlyArray<readonly [number, number]> = [
  [6, 10],
  [10, 14],
  [14, 18],
  [18, 22],
  [22, 26],
  [26, 31],
  [31, 36],
  [36, 41],
  [41, 47],
  [47, 53],
  [53, 59],
  [59, 65],
  [65, 71],
  [71, 77],
  [77, 83],
  [83, 89],
  [89, 93],
  [93, 96],
  [96, 98],
  [98, 100],
] as const;

const CLUE_BANDS: ReadonlyArray<readonly [number, number]> = [
  [40, 45],
  [38, 43],
  [36, 41],
  [34, 39],
  [33, 38],
  [32, 37],
  [31, 36],
  [30, 35],
  [29, 34],
  [28, 33],
  [27, 32],
  [26, 31],
  [25, 30],
  [24, 29],
  [24, 28],
  [23, 28],
  [23, 27],
  [22, 27],
  [22, 26],
  [21, 26],
] as const;

type RandomFn = () => number;

const ROW_UNITS: readonly number[][] = Array.from({ length: GRID_SIZE }, (_, row) =>
  Array.from({ length: GRID_SIZE }, (_, col) => row * GRID_SIZE + col),
);
const COL_UNITS: readonly number[][] = Array.from({ length: GRID_SIZE }, (_, col) =>
  Array.from({ length: GRID_SIZE }, (_, row) => row * GRID_SIZE + col),
);
const BOX_UNITS: readonly number[][] = Array.from({ length: GRID_SIZE }, (_, box) => {
  const rowStart = Math.floor(box / BOX_SIZE) * BOX_SIZE;
  const colStart = (box % BOX_SIZE) * BOX_SIZE;
  const unit: number[] = [];

  for (let r = rowStart; r < rowStart + BOX_SIZE; r += 1) {
    for (let c = colStart; c < colStart + BOX_SIZE; c += 1) {
      unit.push(r * GRID_SIZE + c);
    }
  }

  return unit;
});
const ALL_UNITS: readonly number[][] = [...ROW_UNITS, ...COL_UNITS, ...BOX_UNITS];

const PEERS: readonly number[][] = Array.from({ length: BOARD_SIZE }, (_, index) => {
  const row = Math.floor(index / GRID_SIZE);
  const col = index % GRID_SIZE;
  const box = Math.floor(row / BOX_SIZE) * BOX_SIZE + Math.floor(col / BOX_SIZE);

  const set = new Set<number>([...ROW_UNITS[row], ...COL_UNITS[col], ...BOX_UNITS[box]]);
  set.delete(index);
  return [...set];
});

export const SUDOKU_LEVELS: readonly SudokuLevelDefinition[] = Array.from({ length: 20 }).map(
  (_, index) => {
    const level = index + 1;
    const groupIndex = Math.floor(index / 4);
    const rankIndex = index % 4;
    const [scoreMin, scoreMax] = SCORE_BANDS[index];
    const [clueMin, clueMax] = CLUE_BANDS[index];

    return {
      level,
      groupName: LEVEL_GROUPS[groupIndex],
      rank: LEVEL_RANKS[rankIndex],
      scoreMin,
      scoreMax,
      clueMin,
      clueMax,
    };
  },
);

const LEVEL_GENERATION_POLICIES: readonly LevelGenerationPolicy[] = [
  { minTechniqueRank: 1, maxTechniqueRank: 1 },
  { minTechniqueRank: 1, maxTechniqueRank: 2 },
  { minTechniqueRank: 2, maxTechniqueRank: 2 },
  { minTechniqueRank: 2, maxTechniqueRank: 3 },
  { minTechniqueRank: 3, maxTechniqueRank: 3 },
  { minTechniqueRank: 3, maxTechniqueRank: 4 },
  { minTechniqueRank: 4, maxTechniqueRank: 5 },
  { minTechniqueRank: 4, maxTechniqueRank: 5 },
  { minTechniqueRank: 4, maxTechniqueRank: 5 },
  { minTechniqueRank: 5, maxTechniqueRank: 5 },
  { minTechniqueRank: 5, maxTechniqueRank: 5 },
  { minTechniqueRank: 5, maxTechniqueRank: 6 },
  { minTechniqueRank: 5, maxTechniqueRank: 6 },
  { minTechniqueRank: 5, maxTechniqueRank: 6 },
  { minTechniqueRank: 5, maxTechniqueRank: 6 },
  { minTechniqueRank: 5, maxTechniqueRank: 6 },
  { minTechniqueRank: 6, maxTechniqueRank: 6 },
  { minTechniqueRank: 6, maxTechniqueRank: 6 },
  { minTechniqueRank: 6, maxTechniqueRank: 6 },
  { minTechniqueRank: 6, maxTechniqueRank: 6 },
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getTechniqueRank(technique: SudokuTechnique): number {
  return TECHNIQUE_RANK[technique];
}

function getGenerationPolicy(levelNumber: number): LevelGenerationPolicy {
  return LEVEL_GENERATION_POLICIES[levelNumber - 1] ?? LEVEL_GENERATION_POLICIES[0];
}

function techniqueRankPenalty(targetLevel: number, technique: SudokuTechnique): number {
  const policy = getGenerationPolicy(targetLevel);
  const rank = getTechniqueRank(technique);
  if (rank < policy.minTechniqueRank) {
    return policy.minTechniqueRank - rank;
  }
  if (rank > policy.maxTechniqueRank) {
    return rank - policy.maxTechniqueRank;
  }
  return 0;
}

function digitToMask(digit: number): number {
  return 1 << (digit - 1);
}

function maskHasDigit(mask: number, digit: number): boolean {
  return (mask & digitToMask(digit)) !== 0;
}

function bitCount(mask: number): number {
  let value = mask;
  let count = 0;
  while (value !== 0) {
    value &= value - 1;
    count += 1;
  }
  return count;
}

function firstDigitFromMask(mask: number): number {
  for (let digit = 1; digit <= 9; digit += 1) {
    if (maskHasDigit(mask, digit)) {
      return digit;
    }
  }
  return 0;
}

function createEmptyTechniqueStats(): SudokuTechniqueStats {
  return {
    nakedSingles: 0,
    hiddenSingles: 0,
    lockedCandidates: 0,
    nakedPairs: 0,
    hiddenPairs: 0,
    usedSearch: false,
  };
}

function resolveHardestTechnique(stats: SudokuTechniqueStats): SudokuTechnique {
  if (stats.usedSearch) return 'search';
  if (stats.hiddenPairs > 0) return 'hidden-pair';
  if (stats.nakedPairs > 0) return 'naked-pair';
  if (stats.lockedCandidates > 0) return 'locked-candidates';
  if (stats.hiddenSingles > 0) return 'hidden-single';
  if (stats.nakedSingles > 0) return 'naked-single';
  return 'none';
}

function createInitialCandidates(board: SudokuBoard): number[] | null {
  const candidates = Array.from({ length: BOARD_SIZE }, () => 0);

  for (let index = 0; index < board.length; index += 1) {
    if (board[index] !== 0) {
      candidates[index] = 0;
      continue;
    }

    let mask = 0;
    for (let digit = 1; digit <= 9; digit += 1) {
      if (isPlacementValid(board, index, digit)) {
        mask |= digitToMask(digit);
      }
    }

    if (mask === 0) {
      return null;
    }

    candidates[index] = mask;
  }

  return candidates;
}

function placeValue(
  board: SudokuBoard,
  candidates: number[],
  index: number,
  digit: number,
): boolean {
  if (board[index] !== 0 && board[index] !== digit) {
    return false;
  }

  board[index] = digit as SudokuValue;
  candidates[index] = 0;
  const removalMask = ~digitToMask(digit);

  for (const peer of PEERS[index]) {
    if (board[peer] !== 0) {
      continue;
    }

    const previous = candidates[peer];
    const next = previous & removalMask;
    if (next !== previous) {
      candidates[peer] = next;
      if (next === 0) {
        return false;
      }
    }
  }

  return true;
}

function applyNakedSingles(
  board: SudokuBoard,
  candidates: number[],
): { placed: number; valid: boolean } {
  const placements: Array<[number, number]> = [];

  for (let index = 0; index < BOARD_SIZE; index += 1) {
    if (board[index] !== 0) {
      continue;
    }

    const mask = candidates[index];
    const count = bitCount(mask);
    if (count === 0) {
      return { placed: 0, valid: false };
    }

    if (count === 1) {
      placements.push([index, firstDigitFromMask(mask)]);
    }
  }

  for (const [index, digit] of placements) {
    if (!placeValue(board, candidates, index, digit)) {
      return { placed: 0, valid: false };
    }
  }

  return { placed: placements.length, valid: true };
}

function applyHiddenSingles(
  board: SudokuBoard,
  candidates: number[],
): { placed: number; valid: boolean } {
  const placements = new Map<number, number>();

  for (const unit of ALL_UNITS) {
    for (let digit = 1; digit <= 9; digit += 1) {
      let count = 0;
      let onlyIndex = -1;

      for (const index of unit) {
        if (board[index] !== 0) {
          continue;
        }
        if (maskHasDigit(candidates[index], digit)) {
          count += 1;
          onlyIndex = index;
          if (count > 1) {
            break;
          }
        }
      }

      if (count === 1 && onlyIndex >= 0) {
        const existing = placements.get(onlyIndex);
        if (existing !== undefined && existing !== digit) {
          return { placed: 0, valid: false };
        }
        placements.set(onlyIndex, digit);
      }
    }
  }

  for (const [index, digit] of placements) {
    if (!placeValue(board, candidates, index, digit)) {
      return { placed: 0, valid: false };
    }
  }

  return { placed: placements.size, valid: true };
}

function applyLockedCandidates(
  board: SudokuBoard,
  candidates: number[],
): { applications: number; valid: boolean } {
  let applications = 0;

  for (let boxIndex = 0; boxIndex < BOX_UNITS.length; boxIndex += 1) {
    const boxUnit = BOX_UNITS[boxIndex];
    const boxSet = new Set<number>(boxUnit);

    for (let digit = 1; digit <= 9; digit += 1) {
      const cells = boxUnit.filter(
        (index) => board[index] === 0 && maskHasDigit(candidates[index], digit),
      );

      if (cells.length < 2) {
        continue;
      }

      const rows = new Set(cells.map((index) => Math.floor(index / GRID_SIZE)));
      if (rows.size === 1) {
        const row = [...rows][0];
        let changed = false;

        for (const index of ROW_UNITS[row]) {
          if (boxSet.has(index) || board[index] !== 0 || !maskHasDigit(candidates[index], digit)) {
            continue;
          }

          const next = candidates[index] & ~digitToMask(digit);
          if (next === 0) {
            return { applications: 0, valid: false };
          }

          if (next !== candidates[index]) {
            candidates[index] = next;
            changed = true;
          }
        }

        if (changed) {
          applications += 1;
        }
      }

      const cols = new Set(cells.map((index) => index % GRID_SIZE));
      if (cols.size === 1) {
        const col = [...cols][0];
        let changed = false;

        for (const index of COL_UNITS[col]) {
          if (boxSet.has(index) || board[index] !== 0 || !maskHasDigit(candidates[index], digit)) {
            continue;
          }

          const next = candidates[index] & ~digitToMask(digit);
          if (next === 0) {
            return { applications: 0, valid: false };
          }

          if (next !== candidates[index]) {
            candidates[index] = next;
            changed = true;
          }
        }

        if (changed) {
          applications += 1;
        }
      }
    }
  }

  return { applications, valid: true };
}

function applyNakedPairs(
  board: SudokuBoard,
  candidates: number[],
): { applications: number; valid: boolean } {
  let applications = 0;

  for (const unit of ALL_UNITS) {
    const pairMap = new Map<number, number[]>();

    for (const index of unit) {
      if (board[index] !== 0) {
        continue;
      }

      const mask = candidates[index];
      if (bitCount(mask) !== 2) {
        continue;
      }

      const existing = pairMap.get(mask);
      if (existing) {
        existing.push(index);
      } else {
        pairMap.set(mask, [index]);
      }
    }

    for (const [pairMask, pairCells] of pairMap.entries()) {
      if (pairCells.length !== 2) {
        continue;
      }

      let changed = false;
      for (const index of unit) {
        if (board[index] !== 0 || pairCells.includes(index)) {
          continue;
        }

        const next = candidates[index] & ~pairMask;
        if (next !== candidates[index]) {
          if (next === 0) {
            return { applications: 0, valid: false };
          }

          candidates[index] = next;
          changed = true;
        }
      }

      if (changed) {
        applications += 1;
      }
    }
  }

  return { applications, valid: true };
}

function sameTwoCells(cellsA: number[], cellsB: number[]): boolean {
  return (
    cellsA.length === 2 && cellsB.length === 2 && cellsA[0] === cellsB[0] && cellsA[1] === cellsB[1]
  );
}

function applyHiddenPairs(
  board: SudokuBoard,
  candidates: number[],
): { applications: number; valid: boolean } {
  let applications = 0;

  for (const unit of ALL_UNITS) {
    const digitCells: number[][] = Array.from({ length: 10 }, () => []);

    for (const index of unit) {
      if (board[index] !== 0) {
        continue;
      }

      for (let digit = 1; digit <= 9; digit += 1) {
        if (maskHasDigit(candidates[index], digit)) {
          digitCells[digit].push(index);
        }
      }
    }

    for (let d1 = 1; d1 <= 8; d1 += 1) {
      for (let d2 = d1 + 1; d2 <= 9; d2 += 1) {
        const cells1 = digitCells[d1];
        const cells2 = digitCells[d2];
        if (!sameTwoCells(cells1, cells2)) {
          continue;
        }

        const pairMask = digitToMask(d1) | digitToMask(d2);
        let changed = false;

        for (const index of cells1) {
          const next = candidates[index] & pairMask;
          if (next === 0) {
            return { applications: 0, valid: false };
          }

          if (next !== candidates[index]) {
            candidates[index] = next;
            changed = true;
          }
        }

        if (changed) {
          applications += 1;
        }
      }
    }
  }

  return { applications, valid: true };
}

function isSolved(board: SudokuBoard): boolean {
  return board.every((value) => value !== 0);
}

function createSeededRandom(seed: number): RandomFn {
  let state = seed | 0;
  if (state === 0) {
    state = 0x9e3779b9;
  }

  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

function shuffleValues<T>(values: readonly T[], random: RandomFn): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function levelMidScore(level: SudokuLevelDefinition): number {
  return (level.scoreMin + level.scoreMax) / 2;
}

function findBaseLevelFromClueCount(clueCount: number): SudokuLevelDefinition {
  let closest = SUDOKU_LEVELS[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const level of SUDOKU_LEVELS) {
    const midpoint = (level.clueMin + level.clueMax) / 2;
    const distance = Math.abs(clueCount - midpoint);
    if (distance < bestDistance || (distance === bestDistance && level.level > closest.level)) {
      bestDistance = distance;
      closest = level;
    }
  }

  return closest;
}

function techniquePressure(stats: SudokuTechniqueStats, backtracks: number): number {
  const searchPressure = stats.usedSearch ? 3 + Math.min(6, backtracks / 8) : 0;

  return (
    stats.hiddenSingles * 0.04 +
    stats.lockedCandidates * 0.9 +
    stats.nakedPairs * 1.4 +
    stats.hiddenPairs * 2.1 +
    searchPressure
  );
}

function levelBumpFromPressure(pressure: number): number {
  if (pressure < 1.5) return 0;
  if (pressure < 3) return 1;
  if (pressure < 4.5) return 2;
  if (pressure < 6) return 3;
  if (pressure < 7.5) return 4;
  if (pressure < 9) return 5;
  return 6;
}

function calibratedScoreForLevel(level: SudokuLevelDefinition, pressure: number): number {
  const span = Math.max(1, level.scoreMax - level.scoreMin);
  const pressureRatio = clamp(pressure / 10, 0, 1);
  return clamp(Math.round(level.scoreMin + pressureRatio * span), level.scoreMin, level.scoreMax);
}

function generationDistance(target: SudokuLevelDefinition, grade: SudokuGrade): number {
  const levelDistance = Math.abs(grade.levelNumber - target.level);
  const bandDistance = generationBandDistance(target, grade);

  return levelDistance * 500 + bandDistance;
}

function generationBandDistance(target: SudokuLevelDefinition, grade: SudokuGrade): number {
  const techniquePenalty = techniqueRankPenalty(target.level, grade.hardestTechnique);
  const cluePenalty =
    grade.clueCount < target.clueMin
      ? target.clueMin - grade.clueCount
      : grade.clueCount > target.clueMax
        ? grade.clueCount - target.clueMax
        : 0;
  const scorePenalty = Math.abs(grade.score - levelMidScore(target));

  return techniquePenalty * 220 + cluePenalty * 40 + scorePenalty;
}

function buildGeneratedPuzzle(
  level: SudokuLevelDefinition,
  puzzle: SudokuBoard,
  solution: SudokuBoard,
  grade: SudokuGrade,
  seed: number,
): GeneratedSudokuPuzzle {
  return {
    level,
    puzzle: [...puzzle] as SudokuBoard,
    puzzleString: boardToString(puzzle),
    solution: [...solution] as SudokuBoard,
    solutionString: boardToString(solution),
    grade,
    seed,
  };
}

export function getLevelDefinition(levelNumber: number): SudokuLevelDefinition | null {
  const level = Math.trunc(levelNumber);
  if (level < 1 || level > SUDOKU_LEVELS.length) {
    return null;
  }

  return SUDOKU_LEVELS[level - 1];
}

export function getLevelForScore(scoreValue: number): SudokuLevelDefinition {
  const score = clamp(Math.round(scoreValue), 1, 100);

  for (let i = SUDOKU_LEVELS.length - 1; i >= 0; i -= 1) {
    const level = SUDOKU_LEVELS[i];
    if (score >= level.scoreMin && score <= level.scoreMax) {
      return level;
    }
  }

  let closest = SUDOKU_LEVELS[0];
  let bestDistance = Math.abs(score - levelMidScore(closest));

  for (const level of SUDOKU_LEVELS) {
    const distance = Math.abs(score - levelMidScore(level));
    if (distance < bestDistance) {
      bestDistance = distance;
      closest = level;
    }
  }

  return closest;
}

export function analyzeSudokuLogic(inputBoard: SudokuBoard): SudokuLogicResult {
  const board = [...inputBoard] as SudokuBoard;
  const stats = createEmptyTechniqueStats();

  if (!isBoardValid(board)) {
    return {
      solved: false,
      board,
      candidates: [],
      stats,
      contradiction: true,
    };
  }

  const initialCandidates = createInitialCandidates(board);
  if (!initialCandidates) {
    return {
      solved: false,
      board,
      candidates: [],
      stats,
      contradiction: true,
    };
  }

  const candidates = [...initialCandidates];

  while (true) {
    const naked = applyNakedSingles(board, candidates);
    if (!naked.valid) {
      return {
        solved: false,
        board,
        candidates,
        stats,
        contradiction: true,
      };
    }
    if (naked.placed > 0) {
      stats.nakedSingles += naked.placed;
      continue;
    }

    const hidden = applyHiddenSingles(board, candidates);
    if (!hidden.valid) {
      return {
        solved: false,
        board,
        candidates,
        stats,
        contradiction: true,
      };
    }
    if (hidden.placed > 0) {
      stats.hiddenSingles += hidden.placed;
      continue;
    }

    const locked = applyLockedCandidates(board, candidates);
    if (!locked.valid) {
      return {
        solved: false,
        board,
        candidates,
        stats,
        contradiction: true,
      };
    }
    if (locked.applications > 0) {
      stats.lockedCandidates += locked.applications;
      continue;
    }

    const nakedPairs = applyNakedPairs(board, candidates);
    if (!nakedPairs.valid) {
      return {
        solved: false,
        board,
        candidates,
        stats,
        contradiction: true,
      };
    }
    if (nakedPairs.applications > 0) {
      stats.nakedPairs += nakedPairs.applications;
      continue;
    }

    const hiddenPairs = applyHiddenPairs(board, candidates);
    if (!hiddenPairs.valid) {
      return {
        solved: false,
        board,
        candidates,
        stats,
        contradiction: true,
      };
    }
    if (hiddenPairs.applications > 0) {
      stats.hiddenPairs += hiddenPairs.applications;
      continue;
    }

    break;
  }

  return {
    solved: isSolved(board),
    board,
    candidates,
    stats,
    contradiction: false,
  };
}

export function parseSudoku(raw: string): SudokuBoard | null {
  const normalized = raw.replace(/\s/g, '').replace(/\./g, '0');
  if (normalized.length !== BOARD_SIZE) {
    return null;
  }

  const board: SudokuValue[] = [];
  for (const ch of normalized) {
    if (ch < '0' || ch > '9') {
      return null;
    }
    board.push(Number(ch) as SudokuValue);
  }

  if (!isBoardValid(board)) {
    return null;
  }

  return board;
}

export function boardToString(board: SudokuBoard): string {
  return board.join('');
}

export function isSolvedBoard(board: SudokuBoard): boolean {
  return board.length === BOARD_SIZE && board.every((value) => value !== 0) && isBoardValid(board);
}

export function solutionRespectsPuzzle(puzzle: SudokuBoard, solution: SudokuBoard): boolean {
  if (puzzle.length !== BOARD_SIZE || solution.length !== BOARD_SIZE) {
    return false;
  }

  for (let index = 0; index < BOARD_SIZE; index += 1) {
    const given = puzzle[index];
    if (given !== 0 && solution[index] !== given) {
      return false;
    }
  }

  return true;
}

export function isValidSolvedBoardForPuzzle(puzzle: SudokuBoard, solution: SudokuBoard): boolean {
  return isSolvedBoard(solution) && solutionRespectsPuzzle(puzzle, solution);
}

export function countClues(board: SudokuBoard): number {
  return board.reduce<number>((count, value) => (value === 0 ? count : count + 1), 0);
}

export function isBoardValid(board: SudokuBoard): boolean {
  if (board.length !== BOARD_SIZE) {
    return false;
  }

  for (let index = 0; index < board.length; index += 1) {
    const value = board[index];
    if (value < 0 || value > 9) {
      return false;
    }
    if (value === 0) {
      continue;
    }

    const copy = [...board] as SudokuBoard;
    copy[index] = 0;
    if (!isPlacementValid(copy, index, value)) {
      return false;
    }
  }

  return true;
}

export function isPlacementValid(board: SudokuBoard, index: number, value: number): boolean {
  if (value < 1 || value > 9) {
    return false;
  }

  const row = Math.floor(index / GRID_SIZE);
  const col = index % GRID_SIZE;

  for (let i = 0; i < GRID_SIZE; i += 1) {
    const rowIndex = row * GRID_SIZE + i;
    if (i !== col && board[rowIndex] === value) {
      return false;
    }

    const colIndex = i * GRID_SIZE + col;
    if (i !== row && board[colIndex] === value) {
      return false;
    }
  }

  const boxRowStart = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxColStart = Math.floor(col / BOX_SIZE) * BOX_SIZE;

  for (let r = boxRowStart; r < boxRowStart + BOX_SIZE; r += 1) {
    for (let c = boxColStart; c < boxColStart + BOX_SIZE; c += 1) {
      const candidateIndex = r * GRID_SIZE + c;
      if (candidateIndex !== index && board[candidateIndex] === value) {
        return false;
      }
    }
  }

  return true;
}

export function getCandidates(board: SudokuBoard, index: number): number[] {
  if (board[index] !== 0) {
    return [];
  }

  const candidates: number[] = [];
  for (let value = 1; value <= 9; value += 1) {
    if (isPlacementValid(board, index, value)) {
      candidates.push(value);
    }
  }

  return candidates;
}

function findBestCell(board: SudokuBoard): { index: number; candidates: number[] } | null {
  let bestIndex = -1;
  let bestCandidates: number[] = [];

  for (let index = 0; index < board.length; index += 1) {
    if (board[index] !== 0) {
      continue;
    }

    const candidates = getCandidates(board, index);
    if (candidates.length === 0) {
      return { index, candidates };
    }

    if (bestIndex === -1 || candidates.length < bestCandidates.length) {
      bestIndex = index;
      bestCandidates = candidates;
      if (candidates.length === 1) {
        break;
      }
    }
  }

  if (bestIndex === -1) {
    return null;
  }

  return { index: bestIndex, candidates: bestCandidates };
}

function solveInternal(
  board: SudokuBoard,
  stats: { steps: number; backtracks: number },
  random?: RandomFn,
): boolean {
  const best = findBestCell(board);
  if (best === null) {
    return true;
  }

  if (best.candidates.length === 0) {
    return false;
  }

  const candidates = random ? shuffleValues(best.candidates, random) : best.candidates;

  for (const value of candidates) {
    board[best.index] = value as SudokuValue;
    stats.steps += 1;

    if (solveInternal(board, stats, random)) {
      return true;
    }

    board[best.index] = 0;
    stats.backtracks += 1;
  }

  return false;
}

export function solveSudoku(inputBoard: SudokuBoard, random?: RandomFn): SudokuSolveResult {
  const board = [...inputBoard] as SudokuBoard;

  if (!isBoardValid(board)) {
    return {
      solved: false,
      board,
      steps: 0,
      backtracks: 0,
    };
  }

  const stats = { steps: 0, backtracks: 0 };
  const solved = solveInternal(board, stats, random);
  const robustSolved = solved && isValidSolvedBoardForPuzzle(inputBoard, board);

  return {
    solved: robustSolved,
    board,
    steps: stats.steps,
    backtracks: stats.backtracks,
  };
}

export function countSolutions(inputBoard: SudokuBoard, maxSolutions = 2): number {
  const board = [...inputBoard] as SudokuBoard;
  if (!isBoardValid(board)) {
    return 0;
  }

  let solutions = 0;

  const search = () => {
    if (solutions >= maxSolutions) {
      return;
    }

    const best = findBestCell(board);
    if (best === null) {
      if (isValidSolvedBoardForPuzzle(inputBoard, board)) {
        solutions += 1;
      }
      return;
    }

    if (best.candidates.length === 0) {
      return;
    }

    for (const value of best.candidates) {
      board[best.index] = value as SudokuValue;
      search();
      board[best.index] = 0;

      if (solutions >= maxSolutions) {
        return;
      }
    }
  };

  search();
  return solutions;
}

export function hasUniqueSolution(board: SudokuBoard): boolean {
  return countSolutions(board, 2) === 1;
}

export function generateSolvedBoard(seed = Date.now()): SudokuBoard {
  const board = Array.from({ length: BOARD_SIZE }, () => 0 as SudokuValue);
  const random = createSeededRandom(seed);
  const stats = { steps: 0, backtracks: 0 };

  const solved = solveInternal(board, stats, random);
  if (!solved || !isSolvedBoard(board)) {
    throw new Error('Failed to generate a solved Sudoku board.');
  }

  return board;
}

export function generateSudokuForLevel(
  levelNumber: number,
  options: GenerateSudokuOptions = {},
): GeneratedSudokuPuzzle {
  const level = getLevelDefinition(levelNumber);
  if (!level) {
    throw new Error(`Invalid level number: ${levelNumber}. Expected 1..20.`);
  }

  const baseSeed = options.seed ?? Date.now();
  const maxAttempts = clamp(options.maxAttempts ?? DEFAULT_MAX_GENERATION_ATTEMPTS, 1, 40);
  let bestCandidate: GeneratedSudokuPuzzle | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestLevelMatchCandidate: GeneratedSudokuPuzzle | null = null;
  let bestLevelMatchDistance = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const attemptSeed = baseSeed + attempt * 7919;
    const random = createSeededRandom(attemptSeed);
    const solution = generateSolvedBoard(attemptSeed);
    const puzzle = [...solution] as SudokuBoard;

    const initialGrade = gradeSudoku(puzzle);
    let attemptBestGrade = initialGrade;
    let attemptBestPuzzle = [...puzzle] as SudokuBoard;
    let attemptBestDistance = generationDistance(level, initialGrade);

    const removalOrder = shuffleValues(
      Array.from({ length: BOARD_SIZE }, (_, index) => index),
      random,
    );

    for (const index of removalOrder) {
      if (countClues(puzzle) <= level.clueMin) {
        break;
      }

      const previous = puzzle[index];
      puzzle[index] = 0;

      if (countClues(puzzle) < level.clueMin || !hasUniqueSolution(puzzle)) {
        puzzle[index] = previous;
        if (countClues(puzzle) <= level.clueMin) {
          break;
        }
        continue;
      }

      const rollingGrade = gradeSudoku(puzzle);
      if (rollingGrade.solvable && rollingGrade.uniqueSolution) {
        const rollingDistance = generationDistance(level, rollingGrade);
        if (rollingDistance < attemptBestDistance) {
          attemptBestDistance = rollingDistance;
          attemptBestGrade = rollingGrade;
          attemptBestPuzzle = [...puzzle] as SudokuBoard;
        }

        const perfectMatch =
          rollingGrade.levelNumber === level.level &&
          rollingGrade.clueCount >= level.clueMin &&
          rollingGrade.clueCount <= level.clueMax;

        if (perfectMatch) {
          return buildGeneratedPuzzle(level, puzzle, solution, rollingGrade, attemptSeed);
        }
      }
    }

    const grade = attemptBestGrade;
    const puzzleForGrade = [...attemptBestPuzzle] as SudokuBoard;
    if (
      !grade.solvable ||
      !grade.uniqueSolution ||
      !isValidSolvedBoardForPuzzle(puzzleForGrade, solution)
    ) {
      continue;
    }

    const inClueBand = grade.clueCount >= level.clueMin && grade.clueCount <= level.clueMax;
    const inScoreBand = grade.score >= level.scoreMin && grade.score <= level.scoreMax;

    const scoreDistance = generationDistance(level, grade);
    if (scoreDistance < bestDistance) {
      bestDistance = scoreDistance;
      bestCandidate = buildGeneratedPuzzle(level, puzzleForGrade, solution, grade, attemptSeed);
    }

    if (grade.levelNumber === level.level) {
      const bandDistance = generationBandDistance(level, grade);
      if (bandDistance < bestLevelMatchDistance) {
        bestLevelMatchDistance = bandDistance;
        bestLevelMatchCandidate = buildGeneratedPuzzle(
          level,
          puzzleForGrade,
          solution,
          grade,
          attemptSeed,
        );
      }
    }

    if (inClueBand && inScoreBand && grade.levelNumber === level.level) {
      return buildGeneratedPuzzle(level, puzzleForGrade, solution, grade, attemptSeed);
    }
  }

  if (bestLevelMatchCandidate) {
    return bestLevelMatchCandidate;
  }

  if (bestCandidate) {
    return bestCandidate;
  }

  throw new Error('Unable to generate a puzzle for the selected level with current constraints.');
}

export function gradeSudoku(inputBoard: SudokuBoard): SudokuGrade {
  if (!isBoardValid(inputBoard)) {
    const fallbackLevel = getLevelForScore(1);
    const techniqueStats = createEmptyTechniqueStats();
    return {
      score: 0,
      clueCount: 0,
      levelName: fallbackLevel.groupName,
      levelNumber: fallbackLevel.level,
      levelRank: fallbackLevel.rank,
      hardestTechnique: resolveHardestTechnique(techniqueStats),
      solvable: false,
      uniqueSolution: false,
      steps: 0,
      backtracks: 0,
      techniqueStats,
    };
  }

  const clueCount = countClues(inputBoard);
  const logic = analyzeSudokuLogic(inputBoard);
  const solve = logic.solved
    ? {
        solved: true,
        board: logic.board,
        steps: logic.stats.nakedSingles + logic.stats.hiddenSingles,
        backtracks: 0,
      }
    : solveSudoku(inputBoard);

  const techniqueStats: SudokuTechniqueStats = { ...logic.stats };

  if (!solve.solved) {
    const fallbackLevel = getLevelForScore(1);
    return {
      score: 0,
      clueCount,
      levelName: fallbackLevel.groupName,
      levelNumber: fallbackLevel.level,
      levelRank: fallbackLevel.rank,
      hardestTechnique: resolveHardestTechnique(techniqueStats),
      solvable: false,
      uniqueSolution: false,
      steps: solve.steps,
      backtracks: solve.backtracks,
      techniqueStats,
    };
  }

  if (!logic.solved) {
    techniqueStats.usedSearch = true;
  }

  const uniqueSolution = hasUniqueSolution(inputBoard);

  const baseLevel = findBaseLevelFromClueCount(clueCount);
  const pressure = techniquePressure(techniqueStats, solve.backtracks);
  const bump = levelBumpFromPressure(pressure);
  const finalLevelNumber = clamp(baseLevel.level + bump, 1, 20);
  const level = getLevelDefinition(finalLevelNumber) ?? getLevelForScore(1);
  const score = calibratedScoreForLevel(level, pressure);

  return {
    score,
    clueCount,
    levelName: level.groupName,
    levelNumber: level.level,
    levelRank: level.rank,
    hardestTechnique: resolveHardestTechnique(techniqueStats),
    solvable: true,
    uniqueSolution,
    steps: solve.steps,
    backtracks: solve.backtracks,
    techniqueStats,
  };
}

export function run(input: SudokuInput): SudokuOutput {
  const board = parseSudoku(input.puzzle);
  if (!board) {
    return {
      ok: false,
      error: 'Invalid puzzle format. Expected 81 chars using 0 or . for empty cells.',
    };
  }

  const solved = solveSudoku(board);
  if (!solved.solved || !isValidSolvedBoardForPuzzle(board, solved.board)) {
    return {
      ok: false,
      error: 'Puzzle is not solvable.',
    };
  }

  const grade = gradeSudoku(board);

  return {
    ok: true,
    solvedPuzzle: boardToString(solved.board),
    score: grade.score,
    clueCount: grade.clueCount,
    levelName: grade.levelName,
    levelNumber: grade.levelNumber,
    levelRank: grade.levelRank,
    uniqueSolution: grade.uniqueSolution,
  };
}
