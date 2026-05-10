import type { z } from 'zod';
import { schema } from './bai-calculator.schema';

/**
 * Body Adiposity Index (BAI) — pure computation kernel.
 * BAI = hip(cm) / height(m)^1.5 − 18 (Bergman et al., 2011).
 * All logic is deterministic and runs locally.
 */

export type LengthUnit = 'cm' | 'in';
export type Sex = 'female' | 'male';
export type Tier = 'underweight' | 'normal' | 'overweight' | 'obese';

export const CM_PER_INCH = 2.54;

export interface ClinicalInputs {
  hip: number;
  hipUnit: LengthUnit;
  height: number;
  heightUnit: LengthUnit;
}

export interface Profile {
  sex: Sex;
  age: number;
}

export interface Results {
  bai: number | null;
  hipCm: number | null;
  heightMeters: number | null;
}

export function toCm(value: number, unit: LengthUnit): number {
  return unit === 'cm' ? value : value * CM_PER_INCH;
}

export function compute(input: ClinicalInputs): Results {
  const { hip, hipUnit, height, heightUnit } = input;
  if (!Number.isFinite(hip) || !Number.isFinite(height) || hip <= 0 || height <= 0) {
    return { bai: null, hipCm: null, heightMeters: null };
  }
  const hipCm = toCm(hip, hipUnit);
  const heightMeters = toCm(height, heightUnit) / 100;
  if (heightMeters <= 0) return { bai: null, hipCm: null, heightMeters: null };
  const bai = hipCm / Math.pow(heightMeters, 1.5) - 18;
  return { bai, hipCm, heightMeters };
}

/* -------------------------------------------------------------------------- */
/* Reference thresholds (Bergman et al. 2011, age- and sex-specific)          */
/* -------------------------------------------------------------------------- */

export interface ThresholdSet {
  /** Upper bound of "Underweight" (exclusive). */
  underweightMax: number;
  /** Upper bound of "Normal" (exclusive). */
  normalMax: number;
  /** Upper bound of "Overweight" (exclusive). Above is "Obese". */
  overweightMax: number;
}

interface AgeBand {
  minAge: number;
  thresholds: ThresholdSet;
}

const FEMALE_BANDS: AgeBand[] = [
  { minAge: 18, thresholds: { underweightMax: 21, normalMax: 33, overweightMax: 39 } },
  { minAge: 40, thresholds: { underweightMax: 23, normalMax: 35, overweightMax: 41 } },
  { minAge: 60, thresholds: { underweightMax: 25, normalMax: 38, overweightMax: 43 } },
];

const MALE_BANDS: AgeBand[] = [
  { minAge: 18, thresholds: { underweightMax: 8, normalMax: 21, overweightMax: 26 } },
  { minAge: 40, thresholds: { underweightMax: 11, normalMax: 23, overweightMax: 29 } },
  { minAge: 60, thresholds: { underweightMax: 13, normalMax: 25, overweightMax: 31 } },
];

function pickBand(bands: AgeBand[], age: number): ThresholdSet {
  let chosen = bands[0].thresholds;
  for (const band of bands) {
    if (age >= band.minAge) chosen = band.thresholds;
  }
  return chosen;
}

export interface AdjustmentInfo {
  pediatricBlocked: boolean;
  olderAdultNote: boolean;
  populationCaveat: boolean;
}

export interface ResolvedThresholds {
  thresholds: ThresholdSet;
  adjustments: AdjustmentInfo;
}

export function resolveThresholds(profile: Profile): ResolvedThresholds {
  const bands = profile.sex === 'female' ? FEMALE_BANDS : MALE_BANDS;
  const thresholds = pickBand(bands, profile.age);
  return {
    thresholds,
    adjustments: {
      pediatricBlocked: profile.age < 18,
      olderAdultNote: profile.age >= 80,
      populationCaveat: true, // BAI cutoffs are derived from a Mexican-American cohort.
    },
  };
}

export function classify(bai: number, t: ThresholdSet): Tier {
  if (bai < t.underweightMax) return 'underweight';
  if (bai < t.normalMax) return 'normal';
  if (bai < t.overweightMax) return 'overweight';
  return 'obese';
}

export function run(input: z.infer<typeof schema.input>): z.infer<typeof schema.output> {
  const result = compute(input);
  return { bai: result.bai, hipCm: result.hipCm, heightMeters: result.heightMeters };
}
