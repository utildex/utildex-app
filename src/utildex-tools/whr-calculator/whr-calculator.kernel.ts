import type { z } from 'zod';
import { schema } from './whr-calculator.schema';

/**
 * Waist-to-Hip Ratio (WHR) Calculator — pure computation kernel.
 * All logic is deterministic and runs locally.
 */

export type LengthUnit = 'cm' | 'in';
export type Sex = 'female' | 'male';
export type Tier = 'low' | 'moderate' | 'high';

export const CM_PER_INCH = 2.54;

export interface ClinicalInputs {
  waist: number;
  hip: number;
  unit: LengthUnit;
}

export interface Profile {
  sex: Sex;
  age: number;
}

export interface Results {
  whr: number | null;
  waistCm: number | null;
  hipCm: number | null;
}

export function toCm(value: number, unit: LengthUnit): number {
  return unit === 'cm' ? value : value * CM_PER_INCH;
}

export function compute(input: ClinicalInputs): Results {
  const { waist, hip, unit } = input;
  if (!Number.isFinite(waist) || !Number.isFinite(hip) || waist <= 0 || hip <= 0) {
    return { whr: null, waistCm: null, hipCm: null };
  }
  const waistCm = toCm(waist, unit);
  const hipCm = toCm(hip, unit);
  if (hipCm <= 0) return { whr: null, waistCm: null, hipCm: null };
  return { whr: waistCm / hipCm, waistCm, hipCm };
}

/* -------------------------------------------------------------------------- */
/* Reference thresholds (WHO 2008)                                            */
/* -------------------------------------------------------------------------- */

export interface ThresholdSet {
  /** Upper bound of "low risk" (inclusive). */
  lowMax: number;
  /** Upper bound of "moderate risk" (inclusive). Above is "high risk". */
  moderateMax: number;
}

// WHO Waist Circumference and Waist–Hip Ratio Report (Geneva, 2008)
const FEMALE_THRESHOLDS: ThresholdSet = { lowMax: 0.8, moderateMax: 0.85 };
const MALE_THRESHOLDS: ThresholdSet = { lowMax: 0.9, moderateMax: 0.99 };

export interface AdjustmentInfo {
  pediatricBlocked: boolean;
  olderAdultNote: boolean;
  pregnancyCaveat: boolean;
}

export interface ResolvedThresholds {
  thresholds: ThresholdSet;
  adjustments: AdjustmentInfo;
}

export function resolveThresholds(profile: Profile): ResolvedThresholds {
  const thresholds = profile.sex === 'female' ? FEMALE_THRESHOLDS : MALE_THRESHOLDS;
  return {
    thresholds,
    adjustments: {
      pediatricBlocked: profile.age < 18,
      olderAdultNote: profile.age >= 65,
      pregnancyCaveat: false,
    },
  };
}

export function classify(whr: number, t: ThresholdSet): Tier {
  if (whr <= t.lowMax) return 'low';
  if (whr <= t.moderateMax) return 'moderate';
  return 'high';
}

/** WHO waist circumference cutoffs (cm) for substantially increased risk. */
export function waistRiskCutoffCm(sex: Sex): number {
  return sex === 'female' ? 88 : 102;
}

export function run(input: z.infer<typeof schema.input>): z.infer<typeof schema.output> {
  const result = compute(input);
  return { whr: result.whr, waistCm: result.waistCm, hipCm: result.hipCm };
}
