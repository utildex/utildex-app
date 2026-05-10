import type { z } from 'zod';
import { schema } from './homa-calculator.schema';

/**
 * HOMA Calculator — pure computation kernel.
 * All logic is deterministic and runs locally (no I/O, no network).
 */

export type GlucoseUnit = 'mg/dL' | 'mmol/L';
export type Sex = 'female' | 'male';
export type BMICategory = 'underweight' | 'normal' | 'overweight' | 'obese';
export type Population =
  | 'western_european'
  | 'east_asian'
  | 'south_asian'
  | 'hispanic'
  | 'middle_eastern'
  | 'sub_saharan'
  | 'other';
export type MenopausalStatus = 'pre' | 'post';
export type Method = 'homa-ir' | 'homa-b' | 'homa-s' | 'quicki';
export type Tier = 'optimal' | 'normal' | 'mild' | 'elevated' | 'high';

export const MGDL_PER_MMOL = 18.018;

export interface ClinicalInputs {
  glucose: number;
  glucoseUnit: GlucoseUnit;
  insulin: number; // µU/mL (= mIU/L)
}

export interface Profile {
  sex: Sex;
  age: number;
  bmiCategory: BMICategory;
  population: Population;
  menopausalStatus: MenopausalStatus;
}

export interface Results {
  homaIr: number | null;
  homaB: number | null;
  homaS: number | null;
  quicki: number | null;
  glucoseMmol: number | null;
  glucoseMgdl: number | null;
  /** Reason HOMA-%B is null (when applicable). */
  homaBError: 'glucose-too-low' | null;
}

export function toMmol(glucose: number, unit: GlucoseUnit): number {
  return unit === 'mmol/L' ? glucose : glucose / MGDL_PER_MMOL;
}

export function toMgdl(glucose: number, unit: GlucoseUnit): number {
  return unit === 'mg/dL' ? glucose : glucose * MGDL_PER_MMOL;
}

const EMPTY_RESULTS: Results = {
  homaIr: null,
  homaB: null,
  homaS: null,
  quicki: null,
  glucoseMmol: null,
  glucoseMgdl: null,
  homaBError: null,
};

export function compute(input: ClinicalInputs): Results {
  const { glucose, glucoseUnit, insulin } = input;
  if (!Number.isFinite(glucose) || !Number.isFinite(insulin) || glucose <= 0 || insulin <= 0) {
    return { ...EMPTY_RESULTS };
  }

  const glucoseMmol = toMmol(glucose, glucoseUnit);
  const glucoseMgdl = toMgdl(glucose, glucoseUnit);

  const homaIr = (insulin * glucoseMmol) / 22.5;

  let homaB: number | null = null;
  let homaBError: Results['homaBError'] = null;
  const denomB = glucoseMmol - 3.5;
  if (denomB > 0) {
    homaB = (20 * insulin) / denomB;
  } else {
    homaBError = 'glucose-too-low';
  }

  const homaS = homaIr > 0 ? (1 / homaIr) * 100 : null;

  // QUICKI uses log10 (per the original Katz et al. 2000 formulation).
  const quicki = 1 / (Math.log10(insulin) + Math.log10(glucoseMgdl));

  return {
    homaIr,
    homaB,
    homaS,
    quicki,
    glucoseMmol,
    glucoseMgdl,
    homaBError,
  };
}

/* -------------------------------------------------------------------------- */
/* Reference thresholds for HOMA-IR (upper bounds per tier)                   */
/* -------------------------------------------------------------------------- */

export interface ThresholdSet {
  /** Upper bound of "Optimal" (exclusive). */
  optimalMax: number;
  /** Upper bound of "Normal" (inclusive). */
  normalMax: number;
  /** Upper bound of "Mildly elevated" (inclusive). */
  mildMax: number;
  /** Upper bound of "Elevated" (inclusive). Above this is "High". */
  elevatedMax: number;
}

/**
 * Population-specific HOMA-IR thresholds calibrated for normal-weight adults.
 * South Asian and Sub-Saharan African populations fall back to Western European
 * due to insufficient population-specific data; this is surfaced in the UI.
 */
const HOMA_IR_BASE_THRESHOLDS: Record<Population, ThresholdSet> = {
  western_european: { optimalMax: 1.0, normalMax: 1.9, mildMax: 2.4, elevatedMax: 4.0 },
  east_asian: { optimalMax: 1.0, normalMax: 1.6, mildMax: 2.2, elevatedMax: 3.5 },
  south_asian: { optimalMax: 1.0, normalMax: 1.9, mildMax: 2.4, elevatedMax: 4.0 },
  hispanic: { optimalMax: 1.5, normalMax: 2.5, mildMax: 3.5, elevatedMax: 4.5 },
  middle_eastern: { optimalMax: 1.0, normalMax: 1.8, mildMax: 2.5, elevatedMax: 4.0 },
  sub_saharan: { optimalMax: 1.0, normalMax: 1.9, mildMax: 2.4, elevatedMax: 4.0 },
  other: { optimalMax: 1.0, normalMax: 1.9, mildMax: 2.4, elevatedMax: 4.0 },
};

export const POPULATIONS_USING_FALLBACK: ReadonlySet<Population> = new Set([
  'south_asian',
  'sub_saharan',
  'other',
]);

function shiftThresholds(t: ThresholdSet, delta: number): ThresholdSet {
  return {
    optimalMax: Math.max(0, t.optimalMax + delta),
    normalMax: Math.max(0, t.normalMax + delta),
    mildMax: Math.max(0, t.mildMax + delta),
    elevatedMax: Math.max(0, t.elevatedMax + delta),
  };
}

export interface AdjustmentInfo {
  bmiAdjusted: boolean;
  postMenopausalAdjusted: boolean;
  populationFallback: boolean;
  pediatricBlocked: boolean;
  youngAdultNote: boolean;
  olderAdultNote: boolean;
}

export interface ResolvedThresholds {
  thresholds: ThresholdSet;
  adjustments: AdjustmentInfo;
}

export function resolveHomaIrThresholds(profile: Profile): ResolvedThresholds {
  const base = HOMA_IR_BASE_THRESHOLDS[profile.population] ?? HOMA_IR_BASE_THRESHOLDS.other;

  let thresholds = base;
  let bmiAdjusted = false;
  if (profile.bmiCategory === 'overweight') {
    thresholds = shiftThresholds(thresholds, 0.5);
    bmiAdjusted = true;
  } else if (profile.bmiCategory === 'obese') {
    thresholds = shiftThresholds(thresholds, 1.0);
    bmiAdjusted = true;
  }

  let postMenopausalAdjusted = false;
  if (profile.sex === 'female' && profile.menopausalStatus === 'post' && profile.age >= 45) {
    thresholds = {
      ...thresholds,
      normalMax: thresholds.normalMax + 0.3,
      mildMax: thresholds.mildMax + 0.3,
    };
    postMenopausalAdjusted = true;
  }

  return {
    thresholds,
    adjustments: {
      bmiAdjusted,
      postMenopausalAdjusted,
      populationFallback: POPULATIONS_USING_FALLBACK.has(profile.population),
      pediatricBlocked: profile.age < 18,
      youngAdultNote: profile.age >= 18 && profile.age <= 25,
      olderAdultNote: profile.age > 65,
    },
  };
}

export function classifyHomaIr(value: number, t: ThresholdSet): Tier {
  if (value < t.optimalMax) return 'optimal';
  if (value <= t.normalMax) return 'normal';
  if (value <= t.mildMax) return 'mild';
  if (value <= t.elevatedMax) return 'elevated';
  return 'high';
}

export function classifyQuicki(value: number): Tier {
  // Three-tier scale per spec (mapped to color tiers).
  if (value > 0.45) return 'optimal';
  if (value >= 0.33) return 'normal';
  return 'elevated';
}

export function run(input: z.infer<typeof schema.input>): z.infer<typeof schema.output> {
  const result = compute(input);
  return {
    homaIr: result.homaIr,
    homaB: result.homaB,
    homaS: result.homaS,
    quicki: result.quicki,
    glucoseMmol: result.glucoseMmol,
    glucoseMgdl: result.glucoseMgdl,
  };
}
