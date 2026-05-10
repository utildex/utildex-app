export default {
  // Inputs
  WAIST_LABEL: 'Waist',
  HIP_LABEL: 'Hip',
  WAIST_HINT: 'Measure at the natural waist (just above the navel), exhaled, relaxed.',
  HIP_HINT: 'Measure at the widest part of the buttocks.',
  UNIT_CM: 'cm',
  UNIT_IN: 'in',
  UNIT_TOGGLE: 'Unit',
  CONVERTED_PREFIX: '=',

  // Result
  PRIMARY_RESULT_LABEL: 'WHR',
  RESULT_HINT: 'Waist-to-Hip Ratio',
  SECONDARY_RESULTS_LABEL: 'Additional info',
  WAIST_CIRCUMFERENCE_LABEL: 'Waist circumference',
  RESULT_PLACEHOLDER: '—',
  ENTER_BOTH_HINT: 'Enter your waist and hip measurements to calculate.',

  // Interpretation
  INTERPRETATION_HEADING: 'Interpretation',
  AXIS_LEFT_LABEL: 'Low risk',
  AXIS_RIGHT_LABEL: 'High risk',
  PROFILE_DEFAULTS_BADGE: 'Using default profile',
  PROFILE_DEFAULTS_HINT_SHORT: 'Defaults in use — personalize for accuracy.',

  TIER_LOW: 'Low risk',
  TIER_MODERATE: 'Moderate risk',
  TIER_HIGH: 'High risk',

  SUMMARY_LOW: 'Your WHR is in the low-risk range for your sex.',
  SUMMARY_MODERATE:
    'Your WHR indicates a moderately increased cardiometabolic risk. Lifestyle adjustments often help.',
  SUMMARY_HIGH:
    'Your WHR indicates a substantially increased cardiometabolic risk — consider discussing it with a clinician.',

  WAIST_RISK_NOTE_HIGH: 'Your waist circumference is at or above the WHO action threshold.',
  WAIST_RISK_NOTE_OK: 'Your waist circumference is below the WHO action threshold.',

  // Notes
  NOTE_PEDIATRIC_BLOCKED: 'WHR thresholds are not established for children and adolescents.',
  NOTE_OLDER_ADULT: 'WHR is less specific above 65 due to changes in fat distribution.',
  NOTE_PREGNANCY_CAVEAT: 'WHR is not meaningful during pregnancy.',

  // Profile
  PROFILE_HEADING: 'Your profile',
  PROFILE_SEX: 'Sex',
  PROFILE_SEX_FEMALE: 'Female',
  PROFILE_SEX_MALE: 'Male',
  PROFILE_AGE: 'Age',

  // Tooltips
  WHY_SEX:
    'WHR cutoffs differ between women and men because fat distribution is sexually dimorphic.',
  WHY_AGE: 'WHR thresholds apply to adults only. Above 65, fat redistribution reduces specificity.',

  // Methodology
  METHODOLOGY_BUTTON: 'Methodology & references',
  MODAL_CLOSE: 'Close',
  METHOD_HEADING: 'Methodology & limitations',
  METHOD_BODY:
    'WHR is the ratio of waist circumference to hip circumference. It is a simple proxy for central (abdominal) adiposity, which is a stronger predictor of cardiovascular disease and type 2 diabetes than overall obesity. Measurements should be taken with a non-stretching tape, on bare skin, after a normal exhale.',
  METHOD_FORMULA: 'WHR = waist (cm) / hip (cm)',
  METHOD_THRESHOLDS:
    'WHO 2008 cutoffs — Women: low ≤ 0.80, moderate 0.81–0.85, high > 0.85. Men: low ≤ 0.90, moderate 0.91–0.99, high > 0.99. Waist action thresholds: 88 cm (women), 102 cm (men).',
  METHOD_LIMITATIONS:
    'Limitations: WHR depends on measurement technique and may not be appropriate during pregnancy or in individuals with significant abdominal surgery history. Always interpret with clinical context.',

  REFERENCES_HEADING: 'References',
  REF_WHO_2008:
    'WHO. Waist Circumference and Waist–Hip Ratio: Report of a WHO Expert Consultation. Geneva, 2008.',
  REF_WHO_2011:
    'WHO. Waist Circumference and Waist–Hip Ratio Action Levels. WHO Technical Report. 2011.',
  REF_DESPRES_2012:
    'Després JP. Body Fat Distribution and Risk of Cardiovascular Disease: An Update. Circulation. 2012.',

  PRIVACY_NOTE: 'No data leaves your device. All calculations run locally.',
  DISCLAIMER:
    'This tool is for educational purposes and does not provide medical advice, diagnosis, or treatment.',

  EXPORT_FILENAME: 'whr-result.txt',
};
