import type { z } from 'zod';
import { schema } from './body-fat-deurenberg.schema';

/**
 * Body-fat percentage estimate — Deurenberg formulas (1991, 1998).
 * - Adult formula (Deurenberg 1991): BF% = 1.20·BMI + 0.23·age − 10.8·sex − 5.4
 * - Pediatric formula (Deurenberg 1991): BF% = 1.51·BMI − 0.70·age − 3.6·sex + 1.4
 *   where sex = 1 (male), 0 (female).
 * Pure, deterministic, runs locally.
 */

export type WeightUnit = 'kg' | 'lb';
export type LengthUnit = 'cm' | 'in';
export type Sex = 'female' | 'male';
export type Tier = 'essential' | 'athletic' | 'fitness' | 'average' | 'obese';

export const KG_PER_LB = 0.45359237;
export const CM_PER_INCH = 2.54;

export interface ClinicalInputs {
  weight: number;
  weightUnit: WeightUnit;
  height: number;
  heightUnit: LengthUnit;
  sex: Sex;
  age: number;
}

export interface Results {
  bodyFatPercent: number | null;
  bmi: number | null;
  fatMassKg: number | null;
  leanMassKg: number | null;
  /** Which formula was used (adult vs child). */
  formula: 'adult' | 'child' | null;
}

export function toKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value * KG_PER_LB;
}

export function toCm(value: number, unit: LengthUnit): number {
  return unit === 'cm' ? value : value * CM_PER_INCH;
}

export function compute(input: ClinicalInputs): Results {
  const { weight, weightUnit, height, heightUnit, sex, age } = input;
  if (
    !Number.isFinite(weight) ||
    !Number.isFinite(height) ||
    !Number.isFinite(age) ||
    weight <= 0 ||
    height <= 0 ||
    age <= 0
  ) {
    return { bodyFatPercent: null, bmi: null, fatMassKg: null, leanMassKg: null, formula: null };
  }
  const kg = toKg(weight, weightUnit);
  const meters = toCm(height, heightUnit) / 100;
  if (meters <= 0) {
    return { bodyFatPercent: null, bmi: null, fatMassKg: null, leanMassKg: null, formula: null };
  }
  const bmi = kg / (meters * meters);
  const sexFlag = sex === 'male' ? 1 : 0;

  let bf: number;
  let formula: 'adult' | 'child';
  if (age < 16) {
    bf = 1.51 * bmi - 0.7 * age - 3.6 * sexFlag + 1.4;
    formula = 'child';
  } else {
    bf = 1.2 * bmi + 0.23 * age - 10.8 * sexFlag - 5.4;
    formula = 'adult';
  }

  const bodyFatPercent = Math.max(0, bf);
  const fatMassKg = (bodyFatPercent / 100) * kg;
  const leanMassKg = kg - fatMassKg;

  return { bodyFatPercent, bmi, fatMassKg, leanMassKg, formula };
}

/* -------------------------------------------------------------------------- */
/* Reference categories (American Council on Exercise, by sex)                */
/* -------------------------------------------------------------------------- */

export interface ThresholdSet {
  /** Upper bound of "Essential fat" (exclusive). */
  essentialMax: number;
  /** Upper bound of "Athletes" (exclusive). */
  athleticMax: number;
  /** Upper bound of "Fitness" (exclusive). */
  fitnessMax: number;
  /** Upper bound of "Average" (exclusive). Above is "Obese". */
  averageMax: number;
}

const FEMALE_THRESHOLDS: ThresholdSet = {
  essentialMax: 14,
  athleticMax: 21,
  fitnessMax: 25,
  averageMax: 32,
};

const MALE_THRESHOLDS: ThresholdSet = {
  essentialMax: 6,
  athleticMax: 14,
  fitnessMax: 18,
  averageMax: 25,
};

export interface AdjustmentInfo {
  pediatricFormula: boolean;
  veryYoungBlocked: boolean;
  olderAdultNote: boolean;
  ethnicityCaveat: boolean;
}

export interface ResolvedThresholds {
  thresholds: ThresholdSet;
  adjustments: AdjustmentInfo;
}

export function resolveThresholds(profile: { sex: Sex; age: number }): ResolvedThresholds {
  const thresholds = profile.sex === 'female' ? FEMALE_THRESHOLDS : MALE_THRESHOLDS;
  return {
    thresholds,
    adjustments: {
      pediatricFormula: profile.age < 16 && profile.age >= 7,
      veryYoungBlocked: profile.age < 7,
      olderAdultNote: profile.age >= 75,
      ethnicityCaveat: true,
    },
  };
}

export function classify(bf: number, t: ThresholdSet): Tier {
  if (bf < t.essentialMax) return 'essential';
  if (bf < t.athleticMax) return 'athletic';
  if (bf < t.fitnessMax) return 'fitness';
  if (bf < t.averageMax) return 'average';
  return 'obese';
}

export function run(input: z.infer<typeof schema.input>): z.infer<typeof schema.output> {
  const r = compute(input);
  return {
    bodyFatPercent: r.bodyFatPercent,
    bmi: r.bmi,
    fatMassKg: r.fatMassKg,
    leanMassKg: r.leanMassKg,
  };
}
