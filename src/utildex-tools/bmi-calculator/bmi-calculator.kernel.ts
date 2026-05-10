import type { z } from 'zod';
import { schema } from './bmi-calculator.schema';

/**
 * BMI Calculator — pure computation kernel.
 * All logic is deterministic and runs locally.
 */

export type HeightUnit = 'cm' | 'in';
export type WeightUnit = 'kg' | 'lb';
export type Sex = 'female' | 'male';
export type Standard = 'who' | 'asia_pacific';
export type Tier = 'underweight' | 'normal' | 'overweight' | 'obese_i' | 'obese_ii' | 'obese_iii';

export const CM_PER_INCH = 2.54;
export const KG_PER_LB = 0.45359237;

export interface ClinicalInputs {
  height: number;
  heightUnit: HeightUnit;
  weight: number;
  weightUnit: WeightUnit;
}

export interface Profile {
  sex: Sex;
  age: number;
  standard: Standard;
}

export interface Results {
  bmi: number | null;
  heightMeters: number | null;
  weightKg: number | null;
}

export function toMeters(height: number, unit: HeightUnit): number {
  return unit === 'cm' ? height / 100 : (height * CM_PER_INCH) / 100;
}

export function toKg(weight: number, unit: WeightUnit): number {
  return unit === 'kg' ? weight : weight * KG_PER_LB;
}

export function compute(input: ClinicalInputs): Results {
  const { height, heightUnit, weight, weightUnit } = input;
  if (!Number.isFinite(height) || !Number.isFinite(weight) || height <= 0 || weight <= 0) {
    return { bmi: null, heightMeters: null, weightKg: null };
  }
  const heightMeters = toMeters(height, heightUnit);
  const weightKg = toKg(weight, weightUnit);
  if (heightMeters <= 0) return { bmi: null, heightMeters: null, weightKg: null };
  const bmi = weightKg / (heightMeters * heightMeters);
  return { bmi, heightMeters, weightKg };
}

/* -------------------------------------------------------------------------- */
/* Reference thresholds                                                       */
/* -------------------------------------------------------------------------- */

export interface ThresholdSet {
  /** Upper bound of "Underweight" (exclusive). */
  underweightMax: number;
  /** Upper bound of "Normal" (exclusive). */
  normalMax: number;
  /** Upper bound of "Overweight" (exclusive). */
  overweightMax: number;
  /** Upper bound of "Obese class I" (exclusive). */
  obeseIMax: number;
  /** Upper bound of "Obese class II" (exclusive). Above this is "Obese class III". */
  obeseIIMax: number;
}

const WHO_THRESHOLDS: ThresholdSet = {
  underweightMax: 18.5,
  normalMax: 25,
  overweightMax: 30,
  obeseIMax: 35,
  obeseIIMax: 40,
};

// WHO Asia-Pacific (2004 expert consultation) lowered cutoffs for overweight & obese.
const ASIA_PACIFIC_THRESHOLDS: ThresholdSet = {
  underweightMax: 18.5,
  normalMax: 23,
  overweightMax: 27.5,
  obeseIMax: 32.5,
  obeseIIMax: 37.5,
};

export interface AdjustmentInfo {
  asiaPacific: boolean;
  pediatricBlocked: boolean;
  olderAdultNote: boolean;
  athleteCaveat: boolean;
}

export interface ResolvedThresholds {
  thresholds: ThresholdSet;
  adjustments: AdjustmentInfo;
}

export function resolveThresholds(profile: Profile): ResolvedThresholds {
  const thresholds = profile.standard === 'asia_pacific' ? ASIA_PACIFIC_THRESHOLDS : WHO_THRESHOLDS;

  return {
    thresholds,
    adjustments: {
      asiaPacific: profile.standard === 'asia_pacific',
      pediatricBlocked: profile.age < 18,
      olderAdultNote: profile.age >= 65,
      athleteCaveat: false, // exposed for future use; kept off by default
    },
  };
}

export function classify(bmi: number, t: ThresholdSet): Tier {
  if (bmi < t.underweightMax) return 'underweight';
  if (bmi < t.normalMax) return 'normal';
  if (bmi < t.overweightMax) return 'overweight';
  if (bmi < t.obeseIMax) return 'obese_i';
  if (bmi < t.obeseIIMax) return 'obese_ii';
  return 'obese_iii';
}

/**
 * Healthy-weight range (kg) for the given height, using the Normal-tier bounds.
 */
export function healthyWeightRangeKg(
  heightMeters: number,
  t: ThresholdSet,
): { min: number; max: number } | null {
  if (!Number.isFinite(heightMeters) || heightMeters <= 0) return null;
  const h2 = heightMeters * heightMeters;
  return { min: t.underweightMax * h2, max: t.normalMax * h2 };
}

export function run(input: z.infer<typeof schema.input>): z.infer<typeof schema.output> {
  const result = compute(input);
  return {
    bmi: result.bmi,
    heightMeters: result.heightMeters,
    weightKg: result.weightKg,
  };
}
