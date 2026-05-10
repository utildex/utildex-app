import type { z } from 'zod';
import { schema } from './absi-calculator.schema';

/**
 * A Body Shape Index (ABSI) — Krakauer & Krakauer, 2012.
 * ABSI = WC(m) / (BMI^(2/3) · height(m)^(1/2))
 * Reference (mean/SD) ABSI values from NHANES are sex- and age-stratified;
 * a z-score quantifies abdominal-shape mortality risk independent of BMI.
 * Pure, deterministic, runs locally.
 */

export type WeightUnit = 'kg' | 'lb';
export type LengthUnit = 'cm' | 'in';
export type Sex = 'female' | 'male';
export type Tier = 'veryLow' | 'low' | 'average' | 'high' | 'veryHigh';

export const KG_PER_LB = 0.45359237;
export const CM_PER_INCH = 2.54;

export interface ClinicalInputs {
  waist: number;
  waistUnit: LengthUnit;
  height: number;
  heightUnit: LengthUnit;
  weight: number;
  weightUnit: WeightUnit;
  sex: Sex;
  age: number;
}

export interface Profile {
  sex: Sex;
  age: number;
}

export interface Results {
  absi: number | null;
  absiZ: number | null;
  bmi: number | null;
}

export function toKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value * KG_PER_LB;
}

export function toCm(value: number, unit: LengthUnit): number {
  return unit === 'cm' ? value : value * CM_PER_INCH;
}

/* -------------------------------------------------------------------------- */
/* Reference ABSI mean / SD (NHANES, Krakauer 2012, by sex and age decade).   */
/* Values are approximate published reference points and used for z-scoring.  */
/* -------------------------------------------------------------------------- */

interface RefBand {
  /** Inclusive lower bound of the decade. */
  minAge: number;
  mean: number;
  sd: number;
}

const FEMALE_REF: RefBand[] = [
  { minAge: 18, mean: 0.0744, sd: 0.0049 },
  { minAge: 30, mean: 0.0759, sd: 0.005 },
  { minAge: 40, mean: 0.0779, sd: 0.0049 },
  { minAge: 50, mean: 0.0795, sd: 0.0049 },
  { minAge: 60, mean: 0.0807, sd: 0.0048 },
  { minAge: 70, mean: 0.0823, sd: 0.0049 },
  { minAge: 80, mean: 0.0838, sd: 0.005 },
];

const MALE_REF: RefBand[] = [
  { minAge: 18, mean: 0.0788, sd: 0.0048 },
  { minAge: 30, mean: 0.0794, sd: 0.0049 },
  { minAge: 40, mean: 0.0809, sd: 0.0048 },
  { minAge: 50, mean: 0.0824, sd: 0.0048 },
  { minAge: 60, mean: 0.0833, sd: 0.0048 },
  { minAge: 70, mean: 0.0848, sd: 0.0049 },
  { minAge: 80, mean: 0.086, sd: 0.0049 },
];

function pickRef(bands: RefBand[], age: number): RefBand {
  let chosen = bands[0];
  for (const b of bands) {
    if (age >= b.minAge) chosen = b;
  }
  return chosen;
}

export interface AdjustmentInfo {
  pediatricBlocked: boolean;
  olderAdultNote: boolean;
  populationCaveat: boolean;
}

export interface ResolvedReference {
  ref: RefBand;
  adjustments: AdjustmentInfo;
}

export function resolveReference(profile: Profile): ResolvedReference {
  const bands = profile.sex === 'female' ? FEMALE_REF : MALE_REF;
  const ref = pickRef(bands, profile.age);
  return {
    ref,
    adjustments: {
      pediatricBlocked: profile.age < 18,
      olderAdultNote: profile.age >= 80,
      populationCaveat: true,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Computation                                                                */
/* -------------------------------------------------------------------------- */

export function compute(input: ClinicalInputs): Results {
  const { waist, waistUnit, height, heightUnit, weight, weightUnit, sex, age } = input;
  if (
    !Number.isFinite(waist) ||
    !Number.isFinite(height) ||
    !Number.isFinite(weight) ||
    waist <= 0 ||
    height <= 0 ||
    weight <= 0
  ) {
    return { absi: null, absiZ: null, bmi: null };
  }
  const waistM = toCm(waist, waistUnit) / 100;
  const heightM = toCm(height, heightUnit) / 100;
  const kg = toKg(weight, weightUnit);
  if (heightM <= 0) return { absi: null, absiZ: null, bmi: null };
  const bmi = kg / (heightM * heightM);
  const absi = waistM / (Math.pow(bmi, 2 / 3) * Math.sqrt(heightM));

  let absiZ: number | null = null;
  if (Number.isFinite(age) && age >= 18) {
    const { ref } = resolveReference({ sex, age });
    absiZ = (absi - ref.mean) / ref.sd;
  }

  return { absi, absiZ, bmi };
}

/* -------------------------------------------------------------------------- */
/* Risk tiers (mortality-based ABSI z-score bands, Krakauer 2014)             */
/* -------------------------------------------------------------------------- */

export interface ZThresholds {
  veryLowMax: number;
  lowMax: number;
  averageMax: number;
  highMax: number;
}

export const Z_THRESHOLDS: ZThresholds = {
  veryLowMax: -0.868,
  lowMax: -0.272,
  averageMax: 0.229,
  highMax: 0.798,
};

export function classifyZ(z: number, t: ZThresholds = Z_THRESHOLDS): Tier {
  if (z < t.veryLowMax) return 'veryLow';
  if (z < t.lowMax) return 'low';
  if (z < t.averageMax) return 'average';
  if (z < t.highMax) return 'high';
  return 'veryHigh';
}

export function run(input: z.infer<typeof schema.input>): z.infer<typeof schema.output> {
  const r = compute(input);
  return { absi: r.absi, absiZ: r.absiZ, bmi: r.bmi };
}
