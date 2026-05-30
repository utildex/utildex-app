import {
  SUDOKU_LEVELS,
  analyzeSudokuLogic,
  boardToString,
  countClues,
  countSolutions,
  generateSolvedBoard,
  generateSudokuForLevel,
  getCandidates,
  getLevelDefinition,
  getLevelForScore,
  gradeSudoku,
  hasUniqueSolution,
  isSolvedBoard,
  isValidSolvedBoardForPuzzle,
  isBoardValid,
  isPlacementValid,
  parseSudoku,
  run,
  solutionRespectsPuzzle,
  solveSudoku,
} from './sudoku.kernel';
import { runSudokuGraderTests } from './sudoku.grader.tests';

export interface RuntimeTestCaseResult {
  name: string;
  pass: boolean;
  details: string;
  durationMs: number;
}

export interface RuntimeTestReport {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  cases: RuntimeTestCaseResult[];
}

const SAMPLE_PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const SAMPLE_SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

class TestFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TestFailure';
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new TestFailure(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new TestFailure(`${message}. Expected: ${String(expected)}. Actual: ${String(actual)}`);
  }
}

function runCase(name: string, testFn: () => void): RuntimeTestCaseResult {
  const start = performance.now();
  try {
    testFn();
    return {
      name,
      pass: true,
      details: 'ok',
      durationMs: performance.now() - start,
    };
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return {
      name,
      pass: false,
      details,
      durationMs: performance.now() - start,
    };
  }
}

export function runSudokuSelfTests(): RuntimeTestReport {
  const globalStart = performance.now();

  const cases: RuntimeTestCaseResult[] = [
    runCase('parseSudoku accepts valid 81-char puzzle', () => {
      const board = parseSudoku(SAMPLE_PUZZLE);
      assert(board !== null, 'Expected puzzle to parse');
      assertEqual(board!.length, 81, 'Board length should be 81');
    }),

    runCase('parseSudoku rejects invalid length', () => {
      const board = parseSudoku('123');
      assertEqual(board, null, 'Invalid length must return null');
    }),

    runCase('parseSudoku rejects conflicting givens', () => {
      const board = parseSudoku(
        '530570000600195000098000060800060003400803001700020006060000280000419005000080079',
      );
      assertEqual(board, null, 'Conflicting row givens must be invalid');
    }),

    runCase('level metadata exposes exactly 20 levels', () => {
      assertEqual(SUDOKU_LEVELS.length, 20, 'Expected 20 level definitions');
      assertEqual(SUDOKU_LEVELS[0].groupName, 'Initiate', 'Level 1 should be Initiate');
      assertEqual(SUDOKU_LEVELS[19].groupName, 'Master', 'Level 20 should be Master');
      assertEqual(SUDOKU_LEVELS[19].rank, 'I', 'Level 20 should be rank I');
    }),

    runCase('getLevelDefinition resolves known boundaries', () => {
      const level1 = getLevelDefinition(1);
      const level20 = getLevelDefinition(20);
      const level21 = getLevelDefinition(21);

      assert(level1 !== null, 'Level 1 should exist');
      assert(level20 !== null, 'Level 20 should exist');
      assertEqual(level1!.groupName, 'Initiate', 'Level 1 group mismatch');
      assertEqual(level20!.groupName, 'Master', 'Level 20 group mismatch');
      assertEqual(level21, null, 'Out-of-range level should return null');
    }),

    runCase('getLevelForScore honors overlapping score boundaries', () => {
      const score10 = getLevelForScore(10);
      const score98 = getLevelForScore(98);

      assertEqual(score10.level, 2, 'Score 10 should resolve to level 2 boundary');
      assertEqual(score98.level, 20, 'Score 98 should resolve to level 20 boundary');
    }),

    runCase('isPlacementValid enforces row/col/box constraints', () => {
      const board = parseSudoku(SAMPLE_PUZZLE);
      assert(board !== null, 'Expected puzzle to parse');

      assert(!isPlacementValid(board!, 2, 3), 'Row conflict should be rejected');
      assert(isPlacementValid(board!, 2, 4), 'Known valid candidate should be accepted');
    }),

    runCase('getCandidates returns expected candidate list for a known cell', () => {
      const board = parseSudoku(SAMPLE_PUZZLE);
      assert(board !== null, 'Expected puzzle to parse');

      const candidates = getCandidates(board!, 2);
      assertEqual(candidates.join(','), '1,2,4', 'Unexpected candidate set for r1c3');
    }),

    runCase('analyzeSudokuLogic solves sample without contradiction', () => {
      const board = parseSudoku(SAMPLE_PUZZLE);
      assert(board !== null, 'Expected puzzle to parse');

      const original = boardToString(board!);
      const logical = analyzeSudokuLogic(board!);
      assert(logical.solved, 'Expected logical analysis to solve sample puzzle');
      assert(!logical.contradiction, 'Logical analysis should not produce contradiction');
      assert(
        logical.stats.nakedSingles + logical.stats.hiddenSingles > 0,
        'Expected logical placements',
      );
      assertEqual(
        boardToString(board!),
        original,
        'Logical analysis should not mutate input board',
      );
    }),

    runCase('solveSudoku solves the known sample puzzle', () => {
      const board = parseSudoku(SAMPLE_PUZZLE);
      assert(board !== null, 'Expected puzzle to parse');

      const original = boardToString(board!);
      const solved = solveSudoku(board!);
      assert(solved.solved, 'Expected puzzle to be solved');
      assertEqual(boardToString(solved.board), SAMPLE_SOLUTION, 'Solved board mismatch');
      assertEqual(boardToString(board!), original, 'Solver should not mutate input board');
      assert(isSolvedBoard(solved.board), 'Solved board should be a complete valid board');
      assert(solutionRespectsPuzzle(board!, solved.board), 'Solved board should preserve givens');
      assert(
        isValidSolvedBoardForPuzzle(board!, solved.board),
        'Solved board should be valid for the original puzzle',
      );
    }),

    runCase('countSolutions reports exactly one solution for sample puzzle', () => {
      const board = parseSudoku(SAMPLE_PUZZLE);
      assert(board !== null, 'Expected puzzle to parse');

      const solutionCount = countSolutions(board!, 2);
      assertEqual(solutionCount, 1, 'Sample puzzle should be unique');
    }),

    runCase('hasUniqueSolution returns true for sample puzzle', () => {
      const board = parseSudoku(SAMPLE_PUZZLE);
      assert(board !== null, 'Expected puzzle to parse');

      assert(hasUniqueSolution(board!), 'Expected sample puzzle to be unique');
    }),

    runCase('generateSolvedBoard returns a full valid board', () => {
      const solvedBoard = generateSolvedBoard(123456);
      assertEqual(solvedBoard.length, 81, 'Solved board length must be 81');
      assert(isBoardValid(solvedBoard), 'Generated solved board should be valid');
      assertEqual(countClues(solvedBoard), 81, 'Solved board should have 81 clues');
    }),

    runCase('generateSolvedBoard is deterministic for a fixed seed', () => {
      const a = generateSolvedBoard(777777);
      const b = generateSolvedBoard(777777);
      assertEqual(
        boardToString(a),
        boardToString(b),
        'Same seed should generate the same solved board',
      );
    }),

    runCase('generateSudokuForLevel builds a unique playable puzzle', () => {
      const generated = generateSudokuForLevel(1, { seed: 424242, maxAttempts: 6 });
      const parsed = parseSudoku(generated.puzzleString);

      assert(parsed !== null, 'Generated puzzle string should parse');
      assert(isBoardValid(generated.puzzle), 'Generated puzzle board should be valid');
      assert(hasUniqueSolution(generated.puzzle), 'Generated puzzle should be unique');
      assert(generated.grade.solvable, 'Generated puzzle should be solvable');
      assertEqual(generated.level.level, 1, 'Generated metadata should target requested level');
      assert(
        generated.grade.clueCount >= generated.level.clueMin &&
          generated.grade.clueCount <= generated.level.clueMax,
        'Generated clues should be inside target level clue range',
      );
    }),

    runCase('generateSudokuForLevel is deterministic for seed and level', () => {
      const a = generateSudokuForLevel(3, { seed: 12345, maxAttempts: 8 });
      const b = generateSudokuForLevel(3, { seed: 12345, maxAttempts: 8 });

      assertEqual(
        a.puzzleString,
        b.puzzleString,
        'Puzzle generation should be deterministic by seed',
      );
      assertEqual(
        a.solutionString,
        b.solutionString,
        'Solution generation should be deterministic by seed',
      );
    }),

    runCase('generateSudokuForLevel keeps requested level in canonical seed sweep', () => {
      for (let level = 1; level <= 20; level += 1) {
        const generated = generateSudokuForLevel(level, {
          seed: 61000 + level * 17,
          maxAttempts: 20,
        });

        assertEqual(
          generated.grade.levelNumber,
          level,
          `Generated puzzle level mismatch for level ${level}`,
        );
      }
    }),

    runCase('gradeSudoku marks invalid boards as unsolvable', () => {
      const invalid = parseSudoku(
        '530570000600195000098000060800060003400803001700020006060000280000419005000080079',
      );
      assertEqual(invalid, null, 'Fixture should be invalid at parse-time');

      const fallbackBoard =
        '530570000600195000098000060800060003400803001700020006060000280000419005000080079'
          .split('')
          .map((c) => Number(c)) as Array<0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9>;

      const grade = gradeSudoku(fallbackBoard);
      assert(!grade.solvable, 'Invalid board should be unsolvable');
      assertEqual(grade.score, 0, 'Invalid board should have score 0');
    }),

    runCase('gradeSudoku returns an in-range score for solvable puzzle', () => {
      const board = parseSudoku(SAMPLE_PUZZLE);
      assert(board !== null, 'Expected puzzle to parse');

      const grade = gradeSudoku(board!);
      assert(grade.solvable, 'Puzzle should be solvable');
      assert(grade.score >= 1 && grade.score <= 100, 'Score should be within 1..100');
      assert(grade.clueCount > 0, 'Clue count should be positive');
      assert(
        grade.levelNumber >= 1 && grade.levelNumber <= 20,
        'Level number should be within 1..20',
      );
      assert(!grade.techniqueStats.usedSearch, 'Sample puzzle should not require search fallback');
    }),

    runCase('kernel run() returns solvedPuzzle for valid input', () => {
      const result = run({ puzzle: SAMPLE_PUZZLE });
      assert(result.ok, 'Expected run() to succeed');
      assertEqual(result.solvedPuzzle, SAMPLE_SOLUTION, 'run() returned wrong solved puzzle');
      assert(Boolean(result.levelNumber), 'run() should return a level number');
      assert(Boolean(result.levelRank), 'run() should return a level rank');

      const parsedPuzzle = parseSudoku(SAMPLE_PUZZLE);
      const parsedSolution = parseSudoku(result.solvedPuzzle!);
      assert(
        parsedPuzzle !== null && parsedSolution !== null,
        'Expected parseable puzzle/solution',
      );
      assert(
        isValidSolvedBoardForPuzzle(parsedPuzzle!, parsedSolution!),
        'run() solution should be valid for input puzzle',
      );
    }),

    runCase('kernel run() returns error for invalid input', () => {
      const result = run({ puzzle: 'invalid' });
      assert(!result.ok, 'Expected run() to fail');
      assert(Boolean(result.error), 'Expected an error message');
    }),
  ];

  const graderReport = runSudokuGraderTests();
  for (const graderCase of graderReport.cases) {
    cases.push({
      name: `grader: ${graderCase.name}`,
      pass: graderCase.pass,
      details: graderCase.details,
      durationMs: graderCase.durationMs,
    });
  }

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
