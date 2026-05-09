import {
  gradeSudoku,
  type SudokuBoard,
  type SudokuGrade,
  type SudokuGroupName,
  type SudokuRank,
  type SudokuTechnique,
  type SudokuValue,
} from './sudoku.kernel';

// =============================================================================
// IMPORTANT
//
// This file intentionally avoids importing helpers like `countClues`,
// `getLevelDefinition`, `getLevelForScore`, `parseSudoku`, `solveSudoku`,
// `hasUniqueSolution`, `analyzeSudokuLogic`, or `SUDOKU_LEVELS` from the
// kernel. The grader is being audited as a black box: any expectation it
// must satisfy is reconstructed from the public spec inside this file.
//
// If a bug is introduced into the grader (or the spec table drifts inside
// the kernel) these tests must catch it.
// =============================================================================

export interface GraderTestCaseResult {
  name: string;
  pass: boolean;
  details: string;
  durationMs: number;
}

export interface GraderTestReport {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  cases: GraderTestCaseResult[];
}

class GraderTestFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GraderTestFailure';
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new GraderTestFailure(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new GraderTestFailure(
      `${message}. Expected: ${String(expected)}. Actual: ${String(actual)}`,
    );
  }
}

function runCase(name: string, testFn: () => void): GraderTestCaseResult {
  const start = performance.now();
  try {
    testFn();
    return { name, pass: true, details: 'ok', durationMs: performance.now() - start };
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return { name, pass: false, details, durationMs: performance.now() - start };
  }
}

// -----------------------------------------------------------------------------
// Independent spec mirror.
// These constants define what the grader's outputs MUST look like according
// to the public game spec. They are deliberately re-declared here so a bug
// in the kernel's tables cannot be silently masked.
// -----------------------------------------------------------------------------

const EXPECTED_GROUPS: readonly SudokuGroupName[] = [
  'Initiate',
  'Intermediate',
  'Advanced',
  'Expert',
  'Master',
];

const EXPECTED_RANKS: readonly SudokuRank[] = ['IV', 'III', 'II', 'I'];

const VALID_TECHNIQUES: ReadonlySet<SudokuTechnique> = new Set<SudokuTechnique>([
  'none',
  'naked-single',
  'hidden-single',
  'locked-candidates',
  'naked-pair',
  'hidden-pair',
  'search',
]);

function expectedGroupForLevel(level: number): SudokuGroupName {
  return EXPECTED_GROUPS[Math.floor((level - 1) / 4)];
}

function expectedRankForLevel(level: number): SudokuRank {
  return EXPECTED_RANKS[(level - 1) % 4];
}

// Score band per level (1..20). Mirrors the spec table independently.
const EXPECTED_SCORE_BANDS: ReadonlyArray<readonly [number, number]> = [
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
];

// -----------------------------------------------------------------------------
// Independent helpers
// -----------------------------------------------------------------------------

function manualCountCluesString(puzzle: string): number {
  let n = 0;
  for (let i = 0; i < puzzle.length; i += 1) {
    const c = puzzle.charCodeAt(i);
    if (c >= 49 && c <= 57) n += 1; // '1'..'9'
  }
  return n;
}

function manualCountCluesBoard(board: SudokuBoard): number {
  let n = 0;
  for (let i = 0; i < board.length; i += 1) {
    if (board[i] !== 0) n += 1;
  }
  return n;
}

function boardFromString(puzzle: string): SudokuBoard {
  assert(puzzle.length === 81, `Fixture must be 81 chars, got ${puzzle.length}`);
  const out: SudokuValue[] = [];
  for (let i = 0; i < puzzle.length; i += 1) {
    const c = puzzle[i];
    const value = c === '.' ? 0 : Number(c);
    assert(
      Number.isInteger(value) && value >= 0 && value <= 9,
      `Fixture cell at ${i} is not 0..9: '${c}'`,
    );
    out.push(value as SudokuValue);
  }
  return out;
}

function deepFreezeSnapshot(board: SudokuBoard): string {
  return board.join(',');
}

function gradeFingerprint(g: SudokuGrade): string {
  // Stable, order-independent fingerprint of the grade.
  return JSON.stringify({
    score: g.score,
    clueCount: g.clueCount,
    levelName: g.levelName,
    levelNumber: g.levelNumber,
    levelRank: g.levelRank,
    hardestTechnique: g.hardestTechnique,
    solvable: g.solvable,
    uniqueSolution: g.uniqueSolution,
    techniqueStats: {
      nakedSingles: g.techniqueStats.nakedSingles,
      hiddenSingles: g.techniqueStats.hiddenSingles,
      lockedCandidates: g.techniqueStats.lockedCandidates,
      nakedPairs: g.techniqueStats.nakedPairs,
      hiddenPairs: g.techniqueStats.hiddenPairs,
      usedSearch: g.techniqueStats.usedSearch,
    },
  });
}

function assertSolvableInvariants(grade: SudokuGrade, label: string): void {
  assertEqual(grade.solvable, true, `${label}: must be solvable`);
  assert(grade.score >= 1 && grade.score <= 100, `${label}: score ${grade.score} not in [1,100]`);
  assert(
    grade.levelNumber >= 1 && grade.levelNumber <= 20,
    `${label}: levelNumber ${grade.levelNumber} not in [1,20]`,
  );
  assertEqual(
    grade.levelName,
    expectedGroupForLevel(grade.levelNumber),
    `${label}: levelName mismatch for level ${grade.levelNumber}`,
  );
  assertEqual(
    grade.levelRank,
    expectedRankForLevel(grade.levelNumber),
    `${label}: levelRank mismatch for level ${grade.levelNumber}`,
  );
  assert(
    VALID_TECHNIQUES.has(grade.hardestTechnique),
    `${label}: hardestTechnique '${grade.hardestTechnique}' not in spec set`,
  );
  const [bandMin, bandMax] = EXPECTED_SCORE_BANDS[grade.levelNumber - 1];
  assert(
    grade.score >= bandMin && grade.score <= bandMax,
    `${label}: score ${grade.score} outside spec band [${bandMin},${bandMax}] for level ${grade.levelNumber}`,
  );
  assert(
    grade.techniqueStats.nakedSingles >= 0 &&
      grade.techniqueStats.hiddenSingles >= 0 &&
      grade.techniqueStats.lockedCandidates >= 0 &&
      grade.techniqueStats.nakedPairs >= 0 &&
      grade.techniqueStats.hiddenPairs >= 0,
    `${label}: techniqueStats counters must be non-negative`,
  );
  assert(
    typeof grade.techniqueStats.usedSearch === 'boolean',
    `${label}: usedSearch must be boolean`,
  );
  assert(grade.steps >= 0, `${label}: steps must be non-negative`);
  assert(grade.backtracks >= 0, `${label}: backtracks must be non-negative`);
  assert(
    grade.clueCount >= 0 && grade.clueCount <= 81,
    `${label}: clueCount ${grade.clueCount} not in [0,81]`,
  );
}

function assertHardestTechniqueConsistent(grade: SudokuGrade, label: string): void {
  const t = grade.hardestTechnique;
  const s = grade.techniqueStats;

  switch (t) {
    case 'search':
      assertEqual(s.usedSearch, true, `${label}: search reported but usedSearch=false`);
      break;
    case 'hidden-pair':
      assert(s.hiddenPairs > 0, `${label}: hidden-pair reported but stats.hiddenPairs=0`);
      assertEqual(s.usedSearch, false, `${label}: hidden-pair reported but usedSearch=true`);
      break;
    case 'naked-pair':
      assert(s.nakedPairs > 0, `${label}: naked-pair reported but stats.nakedPairs=0`);
      assert(s.hiddenPairs === 0, `${label}: naked-pair reported but stats.hiddenPairs>0`);
      assertEqual(s.usedSearch, false, `${label}: naked-pair reported but usedSearch=true`);
      break;
    case 'locked-candidates':
      assert(
        s.lockedCandidates > 0,
        `${label}: locked-candidates reported but stats.lockedCandidates=0`,
      );
      assert(s.nakedPairs === 0, `${label}: locked-candidates reported but stats.nakedPairs>0`);
      assert(
        s.hiddenPairs === 0,
        `${label}: locked-candidates reported but stats.hiddenPairs>0`,
      );
      assertEqual(
        s.usedSearch,
        false,
        `${label}: locked-candidates reported but usedSearch=true`,
      );
      break;
    case 'hidden-single':
      assert(s.hiddenSingles > 0, `${label}: hidden-single reported but stats.hiddenSingles=0`);
      assert(
        s.lockedCandidates === 0 && s.nakedPairs === 0 && s.hiddenPairs === 0,
        `${label}: hidden-single reported but harder stats present`,
      );
      assertEqual(s.usedSearch, false, `${label}: hidden-single reported but usedSearch=true`);
      break;
    case 'naked-single':
      assert(s.nakedSingles > 0, `${label}: naked-single reported but stats.nakedSingles=0`);
      assert(
        s.hiddenSingles === 0 &&
          s.lockedCandidates === 0 &&
          s.nakedPairs === 0 &&
          s.hiddenPairs === 0,
        `${label}: naked-single reported but harder stats present`,
      );
      assertEqual(s.usedSearch, false, `${label}: naked-single reported but usedSearch=true`);
      break;
    case 'none':
      assert(
        s.nakedSingles === 0 &&
          s.hiddenSingles === 0 &&
          s.lockedCandidates === 0 &&
          s.nakedPairs === 0 &&
          s.hiddenPairs === 0 &&
          !s.usedSearch,
        `${label}: 'none' reported but stats are non-empty`,
      );
      break;
  }
}

// -----------------------------------------------------------------------------
// Black-box fixtures with known external truths.
// Solutions/uniqueness are determined externally and asserted as ground truth.
// -----------------------------------------------------------------------------

const SOLVED_BOARD =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

const EASY_PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';

// Arto Inkala 2012 "world's hardest" puzzle. Known unique solution requiring
// search-level technique by any practical solver.
const HARD_PUZZLE =
  '800000000003600000070090200050007000000045700000100030001000068008500010090000400';

// A medium puzzle solvable with hidden singles / locked candidates (no search).
const MEDIUM_PUZZLE =
  '003020600900305001001806400008102900700000008006708200002609500800203009005010300';

// Build a "one-cell-missing" puzzle from the solved board: trivially unique.
function makeOneCellMissing(): SudokuBoard {
  const board = boardFromString(SOLVED_BOARD);
  board[80] = 0 as SudokuValue;
  return board;
}

// Build an invalid board: place duplicate '5' in the first row of the easy puzzle.
function makeRowConflictBoard(): SudokuBoard {
  const board = boardFromString(EASY_PUZZLE);
  board[1] = 5 as SudokuValue; // r0c0 already has '5', creates row conflict.
  return board;
}

function makeColConflictBoard(): SudokuBoard {
  const board = boardFromString(EASY_PUZZLE);
  // r0c0 is '5'. Put '5' at r2c0 (col conflict).
  board[18] = 5 as SudokuValue;
  return board;
}

function makeBoxConflictBoard(): SudokuBoard {
  const board = boardFromString(EASY_PUZZLE);
  // r0c0 is '5'. Put '5' at r1c1 (same top-left box).
  board[10] = 5 as SudokuValue;
  return board;
}

function makeOutOfRangeBoard(): SudokuBoard {
  const board = boardFromString(EASY_PUZZLE);
  // Force an illegal value via cast to exercise validity check.
  (board as number[])[5] = 12;
  return board;
}

function makeWrongLengthBoard(): SudokuBoard {
  return boardFromString(EASY_PUZZLE).slice(0, 80) as SudokuBoard;
}

function makeEmptyBoard(): SudokuBoard {
  return Array.from({ length: 81 }, () => 0 as SudokuValue);
}

// -----------------------------------------------------------------------------
// Test cases
// -----------------------------------------------------------------------------

export function runSudokuGraderTests(): GraderTestReport {
  const globalStart = performance.now();

  const cases: GraderTestCaseResult[] = [
    runCase('grade returns the documented shape', () => {
      const grade = gradeSudoku(boardFromString(EASY_PUZZLE));
      const requiredKeys = [
        'score',
        'clueCount',
        'levelName',
        'levelNumber',
        'levelRank',
        'hardestTechnique',
        'solvable',
        'uniqueSolution',
        'steps',
        'backtracks',
        'techniqueStats',
      ] as const;
      for (const key of requiredKeys) {
        assert(key in (grade as object), `Missing field on grade: ${key}`);
      }
      const stats = grade.techniqueStats;
      const requiredStatKeys = [
        'nakedSingles',
        'hiddenSingles',
        'lockedCandidates',
        'nakedPairs',
        'hiddenPairs',
        'usedSearch',
      ] as const;
      for (const key of requiredStatKeys) {
        assert(key in (stats as object), `Missing field on techniqueStats: ${key}`);
      }
    }),

    runCase('grade is a pure function (no input mutation)', () => {
      const board = boardFromString(EASY_PUZZLE);
      const before = deepFreezeSnapshot(board);
      gradeSudoku(board);
      const after = deepFreezeSnapshot(board);
      assertEqual(after, before, 'grade must not mutate input board');
    }),

    runCase('grade is deterministic across repeated calls', () => {
      const board = boardFromString(HARD_PUZZLE);
      const first = gradeFingerprint(gradeSudoku(board));
      for (let i = 0; i < 5; i += 1) {
        const next = gradeFingerprint(gradeSudoku(boardFromString(HARD_PUZZLE)));
        assertEqual(next, first, `Determinism broke on iteration ${i + 1}`);
      }
    }),

    runCase('grade rejects board of wrong length as unsolvable', () => {
      const grade = gradeSudoku(makeWrongLengthBoard());
      assertEqual(grade.solvable, false, 'Wrong-length board must be unsolvable');
      assertEqual(grade.score, 0, 'Wrong-length board must have score 0');
      assertEqual(grade.uniqueSolution, false, 'Wrong-length board must not be unique');
    }),

    runCase('grade rejects out-of-range cell values as unsolvable', () => {
      const grade = gradeSudoku(makeOutOfRangeBoard());
      assertEqual(grade.solvable, false, 'Out-of-range board must be unsolvable');
      assertEqual(grade.score, 0, 'Out-of-range board must have score 0');
    }),

    runCase('grade rejects row-conflict board', () => {
      const grade = gradeSudoku(makeRowConflictBoard());
      assertEqual(grade.solvable, false, 'Row-conflict board must be unsolvable');
      assertEqual(grade.score, 0, 'Row-conflict board must have score 0');
    }),

    runCase('grade rejects column-conflict board', () => {
      const grade = gradeSudoku(makeColConflictBoard());
      assertEqual(grade.solvable, false, 'Col-conflict board must be unsolvable');
      assertEqual(grade.score, 0, 'Col-conflict board must have score 0');
    }),

    runCase('grade rejects box-conflict board', () => {
      const grade = gradeSudoku(makeBoxConflictBoard());
      assertEqual(grade.solvable, false, 'Box-conflict board must be unsolvable');
      assertEqual(grade.score, 0, 'Box-conflict board must have score 0');
    }),

    runCase('invalid board grade preserves invariants for fallback fields', () => {
      const grade = gradeSudoku(makeRowConflictBoard());
      assert(
        grade.levelNumber >= 1 && grade.levelNumber <= 20,
        `Invalid board fallback levelNumber out of range: ${grade.levelNumber}`,
      );
      assertEqual(
        grade.levelName,
        expectedGroupForLevel(grade.levelNumber),
        'Invalid board fallback levelName mismatch',
      );
      assertEqual(
        grade.levelRank,
        expectedRankForLevel(grade.levelNumber),
        'Invalid board fallback levelRank mismatch',
      );
    }),

    runCase('clueCount matches manual count for SOLVED fixture', () => {
      const grade = gradeSudoku(boardFromString(SOLVED_BOARD));
      assertEqual(grade.clueCount, 81, 'Solved board must report 81 clues');
      assertEqual(grade.clueCount, manualCountCluesString(SOLVED_BOARD), 'Manual count drift');
    }),

    runCase('clueCount matches manual count for EASY fixture', () => {
      const board = boardFromString(EASY_PUZZLE);
      const grade = gradeSudoku(board);
      assertEqual(
        grade.clueCount,
        manualCountCluesString(EASY_PUZZLE),
        'EASY clueCount mismatch with manual count',
      );
      assertEqual(
        grade.clueCount,
        manualCountCluesBoard(board),
        'EASY clueCount mismatch with manual board count',
      );
    }),

    runCase('clueCount matches manual count for MEDIUM fixture', () => {
      const grade = gradeSudoku(boardFromString(MEDIUM_PUZZLE));
      assertEqual(
        grade.clueCount,
        manualCountCluesString(MEDIUM_PUZZLE),
        'MEDIUM clueCount mismatch',
      );
    }),

    runCase('clueCount matches manual count for HARD fixture', () => {
      const grade = gradeSudoku(boardFromString(HARD_PUZZLE));
      assertEqual(
        grade.clueCount,
        manualCountCluesString(HARD_PUZZLE),
        'HARD clueCount mismatch',
      );
    }),

    runCase('SOLVED board grades as easiest level with technique=none', () => {
      const grade = gradeSudoku(boardFromString(SOLVED_BOARD));
      assertSolvableInvariants(grade, 'SOLVED');
      assertHardestTechniqueConsistent(grade, 'SOLVED');
      assertEqual(grade.uniqueSolution, true, 'SOLVED must be unique');
      assertEqual(grade.hardestTechnique, 'none', 'SOLVED must require no technique');
      assertEqual(grade.levelNumber, 1, 'SOLVED must grade as level 1');
      assertEqual(grade.techniqueStats.usedSearch, false, 'SOLVED must not use search');
    }),

    runCase('Single-cell-missing puzzle is uniquely solvable and trivial', () => {
      const grade = gradeSudoku(makeOneCellMissing());
      assertSolvableInvariants(grade, 'ONE-MISSING');
      assertHardestTechniqueConsistent(grade, 'ONE-MISSING');
      assertEqual(grade.uniqueSolution, true, 'One-missing must be unique');
      assertEqual(grade.clueCount, 80, 'One-missing must have 80 clues');
      assertEqual(grade.techniqueStats.usedSearch, false, 'One-missing must not use search');
      assert(
        grade.levelNumber <= 4,
        `One-missing must grade in Initiate group (level<=4), got ${grade.levelNumber}`,
      );
    }),

    runCase('EASY puzzle grades as solvable, unique, no search', () => {
      const grade = gradeSudoku(boardFromString(EASY_PUZZLE));
      assertSolvableInvariants(grade, 'EASY');
      assertHardestTechniqueConsistent(grade, 'EASY');
      assertEqual(grade.uniqueSolution, true, 'EASY must be unique');
      assertEqual(grade.techniqueStats.usedSearch, false, 'EASY must not use search');
    }),

    runCase('MEDIUM puzzle grades as solvable, unique, no search, between SOLVED and HARD', () => {
      const solved = gradeSudoku(boardFromString(SOLVED_BOARD));
      const medium = gradeSudoku(boardFromString(MEDIUM_PUZZLE));
      const hard = gradeSudoku(boardFromString(HARD_PUZZLE));
      assertSolvableInvariants(medium, 'MEDIUM');
      assertHardestTechniqueConsistent(medium, 'MEDIUM');
      assertEqual(medium.uniqueSolution, true, 'MEDIUM must be unique');
      assertEqual(medium.techniqueStats.usedSearch, false, 'MEDIUM must not require search');
      assert(
        medium.score >= solved.score,
        `MEDIUM score ${medium.score} should be >= SOLVED score ${solved.score}`,
      );
      assert(
        medium.score <= hard.score,
        `MEDIUM score ${medium.score} should be <= HARD score ${hard.score}`,
      );
    }),

    runCase('HARD (Inkala) puzzle is solvable, unique, requires search', () => {
      const grade = gradeSudoku(boardFromString(HARD_PUZZLE));
      assertSolvableInvariants(grade, 'HARD');
      assertHardestTechniqueConsistent(grade, 'HARD');
      assertEqual(grade.solvable, true, 'HARD must be solvable');
      assertEqual(grade.uniqueSolution, true, 'HARD must be unique');
      assertEqual(grade.techniqueStats.usedSearch, true, 'HARD must require search');
      assertEqual(grade.hardestTechnique, 'search', 'HARD hardestTechnique must be search');
      assert(
        grade.levelNumber >= 13,
        `HARD must grade in upper tier (level>=13), got ${grade.levelNumber}`,
      );
    }),

    runCase('HARD score is strictly greater than EASY score', () => {
      const easy = gradeSudoku(boardFromString(EASY_PUZZLE));
      const hard = gradeSudoku(boardFromString(HARD_PUZZLE));
      assert(
        hard.score > easy.score,
        `HARD score ${hard.score} must exceed EASY score ${easy.score}`,
      );
      assert(
        hard.levelNumber > easy.levelNumber,
        `HARD level ${hard.levelNumber} must exceed EASY level ${easy.levelNumber}`,
      );
    }),

    runCase('SOLVED score is the lowest of the canonical fixtures', () => {
      const solved = gradeSudoku(boardFromString(SOLVED_BOARD));
      const easy = gradeSudoku(boardFromString(EASY_PUZZLE));
      const hard = gradeSudoku(boardFromString(HARD_PUZZLE));
      assert(
        solved.score <= easy.score && solved.score <= hard.score,
        `SOLVED score ${solved.score} must be <= EASY ${easy.score} and HARD ${hard.score}`,
      );
    }),

    runCase('Empty board is reported with uniqueSolution=false', () => {
      const grade = gradeSudoku(makeEmptyBoard());
      assertEqual(grade.clueCount, 0, 'Empty board has 0 clues');
      assertEqual(
        grade.uniqueSolution,
        false,
        'Empty board has many solutions; uniqueSolution must be false',
      );
    }),

    runCase('All canonical fixtures satisfy generic solvable invariants', () => {
      const fixtures: Array<{ name: string; puzzle: string }> = [
        { name: 'SOLVED', puzzle: SOLVED_BOARD },
        { name: 'EASY', puzzle: EASY_PUZZLE },
        { name: 'MEDIUM', puzzle: MEDIUM_PUZZLE },
        { name: 'HARD', puzzle: HARD_PUZZLE },
      ];
      for (const fx of fixtures) {
        const grade = gradeSudoku(boardFromString(fx.puzzle));
        assertSolvableInvariants(grade, fx.name);
        assertHardestTechniqueConsistent(grade, fx.name);
      }
    }),

    runCase('grade.score lies inside spec score band of returned levelNumber', () => {
      const fixtures = [SOLVED_BOARD, EASY_PUZZLE, MEDIUM_PUZZLE, HARD_PUZZLE];
      for (const puzzle of fixtures) {
        const grade = gradeSudoku(boardFromString(puzzle));
        const [bandMin, bandMax] = EXPECTED_SCORE_BANDS[grade.levelNumber - 1];
        assert(
          grade.score >= bandMin && grade.score <= bandMax,
          `Score ${grade.score} not in band [${bandMin},${bandMax}] for level ${grade.levelNumber} (puzzle starting ${puzzle.slice(0, 12)}...)`,
        );
      }
    }),

    runCase('levelName/levelRank correctly derived from levelNumber per spec', () => {
      const fixtures = [SOLVED_BOARD, EASY_PUZZLE, MEDIUM_PUZZLE, HARD_PUZZLE];
      for (const puzzle of fixtures) {
        const grade = gradeSudoku(boardFromString(puzzle));
        assertEqual(
          grade.levelName,
          expectedGroupForLevel(grade.levelNumber),
          `levelName drift at level ${grade.levelNumber}`,
        );
        assertEqual(
          grade.levelRank,
          expectedRankForLevel(grade.levelNumber),
          `levelRank drift at level ${grade.levelNumber}`,
        );
      }
    }),

    runCase('hardestTechnique always agrees with techniqueStats across fixtures', () => {
      const fixtures = [SOLVED_BOARD, EASY_PUZZLE, MEDIUM_PUZZLE, HARD_PUZZLE];
      for (const puzzle of fixtures) {
        const grade = gradeSudoku(boardFromString(puzzle));
        assertHardestTechniqueConsistent(grade, `puzzle ${puzzle.slice(0, 12)}...`);
      }
    }),

    runCase('grade output is independent of caller-supplied array prototype', () => {
      // Pass a plain array vs a re-constructed array of the same content.
      const a = boardFromString(EASY_PUZZLE);
      const b = Array.from(a) as SudokuBoard;
      const ga = gradeFingerprint(gradeSudoku(a));
      const gb = gradeFingerprint(gradeSudoku(b));
      assertEqual(ga, gb, 'Grade must depend only on cell contents, not array identity');
    }),

    runCase('grade gives same result for parsed and manually-built boards', () => {
      const manual = boardFromString(EASY_PUZZLE);
      // Build via the same pure transform but using a "." placeholder formulation.
      const dotted = EASY_PUZZLE.replace(/0/g, '.');
      const fromDotted = boardFromString(dotted);
      const ga = gradeFingerprint(gradeSudoku(manual));
      const gb = gradeFingerprint(gradeSudoku(fromDotted));
      assertEqual(ga, gb, 'Grade must be identical regardless of "0" vs "." source');
    }),

    runCase('grade levelNumber for SOLVED board is consistent with score band', () => {
      const grade = gradeSudoku(boardFromString(SOLVED_BOARD));
      const [bandMin, bandMax] = EXPECTED_SCORE_BANDS[grade.levelNumber - 1];
      assert(
        grade.score >= bandMin && grade.score <= bandMax,
        `SOLVED score ${grade.score} not in [${bandMin},${bandMax}] for level ${grade.levelNumber}`,
      );
    }),

    runCase('grade clueCount is monotone with respect to additional empties', () => {
      // Removing a clue from a unique puzzle must not increase reported clueCount.
      const original = boardFromString(EASY_PUZZLE);
      const originalCount = gradeSudoku(original).clueCount;

      const stripped = boardFromString(EASY_PUZZLE);
      // Find a non-empty cell and clear it.
      const idx = stripped.findIndex((v) => v !== 0);
      assert(idx >= 0, 'Fixture should contain at least one clue');
      stripped[idx] = 0 as SudokuValue;

      const strippedCount = gradeSudoku(stripped).clueCount;
      assertEqual(
        strippedCount,
        originalCount - 1,
        'Removing one clue must decrease clueCount by exactly 1',
      );
    }),
  ];

  const passed = cases.filter((c) => c.pass).length;
  const failed = cases.length - passed;

  return {
    total: cases.length,
    passed,
    failed,
    durationMs: performance.now() - globalStart,
    cases,
  };
}
