import { describe, expect, it } from 'vitest';

import {
  createDefaultMentalMathSettings,
  createMentalMathQuestion,
  run,
  type MentalMathOperation,
  type OperandRange,
} from './mental-math.kernel';

function settingsForOnlyOperation(
  operation: MentalMathOperation,
  range: OperandRange,
  allowDecimals = false,
  decimalPrecision = 1,
) {
  const settings = createDefaultMentalMathSettings();
  settings.allowDecimals = allowDecimals;
  settings.decimalPrecision = decimalPrecision;

  for (const key of Object.keys(settings.operations) as MentalMathOperation[]) {
    settings.operations[key] = {
      enabled: key === operation,
      range: { ...range },
    };
  }

  return settings;
}

describe('mental math kernel', () => {
  it('keeps seeded runs deterministic', () => {
    const first = run({ seed: 42, count: 5 }).questions.map((question) => question.prompt);
    const second = run({ seed: 42, count: 5 }).questions.map((question) => question.prompt);

    expect(second).toEqual(first);
  });

  it('normalizes non-finite and bounded run counts', () => {
    expect(run({ count: Number.NaN }).questions).toHaveLength(10);
    expect(run({ count: 0 }).questions).toHaveLength(1);
    expect(run({ count: 500 }).questions).toHaveLength(100);
  });

  it('falls back to addition when every operation is disabled', () => {
    const settings = createDefaultMentalMathSettings();
    for (const operation of Object.keys(settings.operations) as MentalMathOperation[]) {
      settings.operations[operation].enabled = false;
    }

    const question = createMentalMathQuestion(settings, () => 0);

    expect(question.operation).toBe('add');
    expect(Number.isFinite(question.answer)).toBe(true);
  });

  it('keeps operands inside an integer-disabled custom range with no whole values', () => {
    const range = { min: 1.2, max: 1.8 };
    const settings = settingsForOnlyOperation('add', range, false, 1);

    const question = createMentalMathQuestion(settings, () => 0);

    expect(question.left).toBeGreaterThanOrEqual(range.min);
    expect(question.left).toBeLessThanOrEqual(range.max);
    expect(question.right).toBeGreaterThanOrEqual(range.min);
    expect(question.right).toBeLessThanOrEqual(range.max);
    expect(question.precision).toBe(1);
  });

  it('raises precision for decimal ranges narrower than the requested grid', () => {
    const range = { min: 0.01, max: 0.04 };
    const settings = settingsForOnlyOperation('add', range, true, 1);

    const question = createMentalMathQuestion(settings, () => 0.99);

    expect(question.left).toBeGreaterThanOrEqual(range.min);
    expect(question.left).toBeLessThanOrEqual(range.max);
    expect(question.right).toBeGreaterThanOrEqual(range.min);
    expect(question.right).toBeLessThanOrEqual(range.max);
    expect(question.precision).toBe(2);
  });

  it('generates finite division questions with non-zero divisors', () => {
    const settings = settingsForOnlyOperation('divide', { min: 1, max: 12 });

    for (let seed = 1; seed <= 20; seed += 1) {
      const question = run({ settings, seed, count: 1 }).questions[0];

      expect(question.operation).toBe('divide');
      expect(question.right).not.toBe(0);
      expect(Number.isFinite(question.answer)).toBe(true);
    }
  });
});
