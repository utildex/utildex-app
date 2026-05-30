export type MentalMathMode = 'rush' | 'challenge';
export type MentalMathOperation = 'add' | 'subtract' | 'multiply' | 'divide';
export type MentalMathMistakeHandling = 'none' | 'minusOne' | 'threeStrikes';
export type MentalMathFontSize = 's' | 'm' | 'l';
export type MentalMathDifficulty =
  | 'initiate'
  | 'apprentice'
  | 'adept'
  | 'expert'
  | 'master'
  | 'custom';

export interface OperandRange {
  min: number;
  max: number;
}

export interface OperationSettings {
  enabled: boolean;
  range: OperandRange;
}

export interface MentalMathSettings {
  mode: MentalMathMode;
  rushTotalSeconds: number;
  challengeQuestionCount: number;
  challengeSecondsPerQuestion: number | null;
  operations: Record<MentalMathOperation, OperationSettings>;
  allowDecimals: boolean;
  decimalPrecision: number;
  mistakeHandling: MentalMathMistakeHandling;
  speedBonus: boolean;
  operationFontSize: MentalMathFontSize;
  showVisualKeypad: boolean;
  difficultyLevel: MentalMathDifficulty;
}

export interface MentalMathQuestion {
  left: number;
  right: number;
  operation: MentalMathOperation;
  symbol: string;
  prompt: string;
  answer: number;
  answerText: string;
  precision: number;
}

export interface MentalMathRunInput {
  settings?: Partial<MentalMathSettings>;
  count?: number;
  seed?: number;
}

export interface MentalMathRunOutput {
  ok: true;
  questions: MentalMathQuestion[];
}

const OPERATION_SYMBOLS: Record<MentalMathOperation, string> = {
  add: '+',
  subtract: '-',
  multiply: 'x',
  divide: '/',
};

const DEFAULT_RANGE: OperandRange = { min: 1, max: 20 };

export const DEFAULT_MENTAL_MATH_SETTINGS: MentalMathSettings = {
  mode: 'rush',
  rushTotalSeconds: 60,
  challengeQuestionCount: 10,
  challengeSecondsPerQuestion: 10,
  operations: {
    add: { enabled: true, range: { ...DEFAULT_RANGE } },
    subtract: { enabled: true, range: { ...DEFAULT_RANGE } },
    multiply: { enabled: true, range: { min: 1, max: 12 } },
    divide: { enabled: true, range: { min: 1, max: 20 } },
  },
  allowDecimals: false,
  decimalPrecision: 1,
  mistakeHandling: 'none',
  speedBonus: true,
  operationFontSize: 'm',
  showVisualKeypad: false,
  difficultyLevel: 'adept',
};

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function cloneRange(range: OperandRange): OperandRange {
  return { min: range.min, max: range.max };
}

export function createDefaultMentalMathSettings(): MentalMathSettings {
  const defaults = DEFAULT_MENTAL_MATH_SETTINGS;
  return {
    ...defaults,
    operations: {
      add: {
        enabled: defaults.operations.add.enabled,
        range: cloneRange(defaults.operations.add.range),
      },
      subtract: {
        enabled: defaults.operations.subtract.enabled,
        range: cloneRange(defaults.operations.subtract.range),
      },
      multiply: {
        enabled: defaults.operations.multiply.enabled,
        range: cloneRange(defaults.operations.multiply.range),
      },
      divide: {
        enabled: defaults.operations.divide.enabled,
        range: cloneRange(defaults.operations.divide.range),
      },
    },
  };
}

function clampPrecision(precision: number): number {
  if (!Number.isFinite(precision)) {
    return 1;
  }
  return Math.max(1, Math.min(12, Math.floor(precision)));
}

function orderedRange(range: OperandRange): OperandRange {
  const min = Number.isFinite(range.min) ? range.min : DEFAULT_RANGE.min;
  const max = Number.isFinite(range.max) ? range.max : DEFAULT_RANGE.max;
  return min <= max ? { min, max } : { min: max, max: min };
}

function randomInteger(min: number, max: number, random: () => number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function hasRepresentableValue(range: OperandRange, precision: number): boolean {
  const factor = 10 ** precision;
  return Math.ceil(range.min * factor) <= Math.floor(range.max * factor);
}

function effectiveOperandPrecision(
  range: OperandRange,
  allowDecimals: boolean,
  precision: number,
): number {
  const ordered = orderedRange(range);
  const requestedPrecision = allowDecimals ? clampPrecision(precision) : 0;

  for (let candidate = requestedPrecision; candidate <= 12; candidate += 1) {
    if (hasRepresentableValue(ordered, candidate)) {
      return candidate;
    }
  }

  return requestedPrecision;
}

function roundToPrecision(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function randomOperand(
  range: OperandRange,
  allowDecimals: boolean,
  precision: number,
  random: () => number,
): number {
  const ordered = orderedRange(range);
  const safePrecision = effectiveOperandPrecision(ordered, allowDecimals, precision);

  const factor = 10 ** safePrecision;
  const min = Math.ceil(ordered.min * factor);
  const max = Math.floor(ordered.max * factor);
  return roundToPrecision(randomInteger(min, max, random) / factor, safePrecision);
}

function randomNonZeroOperand(
  range: OperandRange,
  allowDecimals: boolean,
  precision: number,
  random: () => number,
): number {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const value = randomOperand(range, allowDecimals, precision, random);
    if (Math.abs(value) > 0) {
      return value;
    }
  }

  const ordered = orderedRange(range);
  if (ordered.max < 0) {
    return ordered.max;
  }
  return ordered.min > 0 ? ordered.min : 1;
}

function formatNumber(value: number, precision: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }

  return value
    .toFixed(precision)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1');
}

function getEnabledOperations(settings: MentalMathSettings): MentalMathOperation[] {
  const operations = Object.entries(settings.operations)
    .filter((entry): entry is [MentalMathOperation, OperationSettings] => entry[1].enabled)
    .map(([operation]) => operation);

  return operations.length > 0 ? operations : ['add'];
}

function createDivisionQuestion(
  operationSettings: OperationSettings,
  settings: MentalMathSettings,
  random: () => number,
): { left: number; right: number; answer: number; precision: number } {
  const range = operationSettings.range;
  const precision = effectiveOperandPrecision(
    range,
    settings.allowDecimals,
    settings.decimalPrecision,
  );

  if (precision === 0) {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const left = randomOperand(range, false, 1, random);
      const right = randomNonZeroOperand(range, false, 1, random);
      if (Number.isInteger(left / right)) {
        return { left, right, answer: left / right, precision: 0 };
      }
    }
  }

  const left = randomOperand(range, settings.allowDecimals, settings.decimalPrecision, random);
  const right = randomNonZeroOperand(
    range,
    settings.allowDecimals,
    settings.decimalPrecision,
    random,
  );
  return {
    left,
    right,
    answer: roundToPrecision(left / right, precision || 2),
    precision,
  };
}

export function createMentalMathQuestion(
  settings: MentalMathSettings,
  random: () => number = Math.random,
): MentalMathQuestion {
  const enabledOperations = getEnabledOperations(settings);
  const operation = enabledOperations[randomInteger(0, enabledOperations.length - 1, random)];
  const operationSettings = settings.operations[operation];
  const precision = effectiveOperandPrecision(
    operationSettings.range,
    settings.allowDecimals,
    settings.decimalPrecision,
  );

  let left = randomOperand(
    operationSettings.range,
    settings.allowDecimals,
    settings.decimalPrecision,
    random,
  );
  let right = randomOperand(
    operationSettings.range,
    settings.allowDecimals,
    settings.decimalPrecision,
    random,
  );
  let answer: number;

  if (operation === 'add') {
    answer = roundToPrecision(left + right, precision);
  } else if (operation === 'subtract') {
    answer = roundToPrecision(left - right, precision);
  } else if (operation === 'multiply') {
    answer = roundToPrecision(left * right, precision);
  } else {
    const division = createDivisionQuestion(operationSettings, settings, random);
    left = division.left;
    right = division.right;
    answer = division.answer;
  }

  const questionPrecision = precision;
  const leftText = formatNumber(left, questionPrecision);
  const rightText = formatNumber(right, questionPrecision);
  const answerText = formatNumber(answer, questionPrecision);

  return {
    left,
    right,
    operation,
    symbol: OPERATION_SYMBOLS[operation],
    prompt: `${leftText} ${OPERATION_SYMBOLS[operation]} ${rightText}`,
    answer,
    answerText,
    precision: questionPrecision,
  };
}

export function isCorrectMentalMathAnswer(
  rawAnswer: string,
  question: MentalMathQuestion,
): boolean {
  const normalized = rawAnswer.trim().replace(',', '.');
  if (!normalized) {
    return false;
  }

  const submitted = Number(normalized);
  if (!Number.isFinite(submitted)) {
    return false;
  }

  const tolerance = question.precision > 0 ? 0.5 / 10 ** question.precision : 0.000001;
  return Math.abs(submitted - question.answer) <= tolerance;
}

export function calculateChallengePoints(
  isCorrect: boolean,
  responseMs: number,
  limitMs: number | null,
  speedBonus: boolean,
): number {
  if (!isCorrect) {
    return 0;
  }

  if (!speedBonus || limitMs === null || limitMs <= 0) {
    return 10;
  }

  const remainingRatio = Math.max(0, Math.min(1, (limitMs - responseMs) / limitMs));
  return 10 + Math.round(remainingRatio * 5);
}

function mergeSettings(input?: Partial<MentalMathSettings>): MentalMathSettings {
  const defaults = createDefaultMentalMathSettings();
  if (!input) {
    return defaults;
  }

  return {
    ...defaults,
    ...input,
    operations: {
      add: { ...defaults.operations.add, ...input.operations?.add },
      subtract: { ...defaults.operations.subtract, ...input.operations?.subtract },
      multiply: { ...defaults.operations.multiply, ...input.operations?.multiply },
      divide: { ...defaults.operations.divide, ...input.operations?.divide },
    },
    decimalPrecision: clampPrecision(Number(input.decimalPrecision ?? defaults.decimalPrecision)),
  };
}

export function run(input: MentalMathRunInput = {}): MentalMathRunOutput {
  const settings = mergeSettings(input.settings);
  const random = createSeededRandom(input.seed ?? Date.now());
  const rawCount = input.count ?? 10;
  const normalizedCount = Number.isFinite(rawCount) ? rawCount : 10;
  const count = Math.max(1, Math.min(100, Math.floor(normalizedCount)));
  const questions = Array.from({ length: count }, () => createMentalMathQuestion(settings, random));
  return { ok: true, questions };
}
