export default {
  // Method tabs
  METHOD_LABEL: 'Calculation method',
  METHOD_HOMA_IR: 'HOMA-IR',
  METHOD_HOMA_B: 'HOMA-%B',
  METHOD_HOMA_S: 'HOMA-%S',
  METHOD_QUICKI: 'QUICKI',
  METHOD_HOMA_IR_HINT: 'Insulin resistance index',
  METHOD_HOMA_B_HINT: 'Beta-cell function',
  METHOD_HOMA_S_HINT: 'Insulin sensitivity',
  METHOD_QUICKI_HINT: 'Quantitative insulin sensitivity check',

  // Clinical inputs
  CLINICAL_HEADING: 'Clinical inputs',
  GLUCOSE_LABEL: 'Fasting glucose',
  INSULIN_LABEL: 'Fasting insulin',
  INSULIN_UNIT: 'µU/mL (mIU/L)',
  UNIT_MGDL: 'mg/dL',
  UNIT_MMOL: 'mmol/L',
  UNIT_TOGGLE_LABEL: 'Glucose unit',
  CONVERTED_PREFIX: '=',

  // Results
  PRIMARY_RESULT_LABEL: 'Primary result',
  SECONDARY_RESULTS_LABEL: 'Other indices',
  RESULT_PLACEHOLDER: '—',
  ENTER_BOTH_HINT: 'Enter glucose and insulin to compute results.',
  GLUCOSE_TOO_LOW: 'Glucose value too low for beta-cell function calculation.',

  // Interpretation
  INTERPRETATION_HEADING: 'Interpretation',
  INTERPRETATION_BASED_ON: 'Based on:',
  PROFILE_DEFAULTS_BADGE: 'Using default profile',
  PROFILE_DEFAULTS_HINT:
    'These are default values — enter your profile below for a personalized interpretation.',
  PROFILE_DEFAULTS_HINT_SHORT: 'Defaults in use — personalize for accuracy.',
  AXIS_LEFT_LABEL: 'Optimal',
  AXIS_RIGHT_LABEL: 'High',
  TIER_OPTIMAL: 'Optimal',
  TIER_NORMAL: 'Normal',
  TIER_MILD: 'Mildly elevated',
  TIER_ELEVATED: 'Elevated',
  TIER_HIGH: 'High',
  QUICKI_TIER_OPTIMAL: 'High sensitivity',
  QUICKI_TIER_NORMAL: 'Normal sensitivity',
  QUICKI_TIER_REDUCED: 'Insulin resistance likely',

  // Per-tier plain-language summaries (HOMA-IR)
  IR_SUMMARY_OPTIMAL:
    'Your result is in the optimal range for your profile. This suggests strong insulin sensitivity.',
  IR_SUMMARY_NORMAL: 'Your result is within the normal range for your profile.',
  IR_SUMMARY_MILD:
    'Your result suggests mildly elevated insulin resistance. Lifestyle factors often shift this back into the normal range.',
  IR_SUMMARY_ELEVATED:
    'Your result suggests elevated insulin resistance — consider discussing it with a clinician.',
  IR_SUMMARY_HIGH:
    'Your result suggests a high insulin resistance — we recommend discussing it with a clinician.',

  QUICKI_SUMMARY_OPTIMAL: 'Your QUICKI value suggests high insulin sensitivity.',
  QUICKI_SUMMARY_NORMAL: 'Your QUICKI value is within the normal sensitivity range.',
  QUICKI_SUMMARY_REDUCED:
    'Your QUICKI value suggests reduced insulin sensitivity — consider discussing it with a clinician.',

  HOMA_B_NOTE:
    '100% represents estimated normal beta-cell function in a healthy young adult. Values below 100% suggest reduced function; above 100% may indicate compensatory hypersecretion.',
  HOMA_S_NOTE: '100% represents estimated normal insulin sensitivity. Higher values are better.',

  // Adjustment notes
  NOTE_BMI_ADJUSTED: 'Reference ranges are adjusted for your BMI category.',
  NOTE_POSTMENO_ADJUSTED: 'Upper bounds are slightly raised to reflect post-menopausal physiology.',
  NOTE_POPULATION_FALLBACK:
    'Population-specific reference data is limited for this group; Western European ranges are used as a fallback.',
  NOTE_PEDIATRIC_BLOCKED:
    'Interpretation for children and adolescents requires age- and sex-specific pediatric reference charts not implemented in this tool.',
  NOTE_YOUNG_ADULT: 'Values may be slightly lower than the adult reference for ages under 25.',
  NOTE_OLDER_ADULT:
    'A mild upward drift is expected with age; interpretation is less precise above 65.',
  NOTE_PROFILE_CHANGED:
    "Your score didn't change, but the reference range for your profile is different.",

  // Profile section
  PROFILE_HEADING: 'Your profile',
  PROFILE_TOGGLE_SHOW: 'Show profile',
  PROFILE_TOGGLE_HIDE: 'Hide profile',
  PROFILE_SEX: 'Sex',
  PROFILE_SEX_FEMALE: 'Female',
  PROFILE_SEX_MALE: 'Male',
  PROFILE_AGE: 'Age',
  PROFILE_BMI: 'BMI category',
  PROFILE_BMI_UNDER: 'Underweight',
  PROFILE_BMI_NORMAL: 'Normal weight',
  PROFILE_BMI_OVER: 'Overweight',
  PROFILE_BMI_OBESE: 'Obese',
  PROFILE_POPULATION: 'Population group',
  POP_WESTERN: 'Western European',
  POP_EAST_ASIAN: 'East Asian (Japanese / Chinese / Korean)',
  POP_SOUTH_ASIAN: 'South Asian',
  POP_HISPANIC: 'Hispanic / Latin American',
  POP_MIDDLE_EASTERN: 'Middle Eastern',
  POP_SUB_SAHARAN: 'Sub-Saharan African',
  POP_OTHER: 'Other / unspecified',
  PROFILE_MENOPAUSE: 'Menopausal status',
  MENO_PRE: 'Pre-menopausal',
  MENO_POST: 'Post-menopausal',

  // Why-we-ask
  WHY_LABEL: 'Why do we ask?',
  WHY_SEX:
    'Insulin resistance values trend slightly higher in males. The effect is small (~0.3 units) so we do not shift thresholds, but we acknowledge it.',
  WHY_AGE:
    'Pediatric ranges differ. Younger adults trend slightly lower, and a mild upward drift is expected after 65.',
  WHY_BMI:
    'Higher BMI raises expected HOMA-IR baselines. Reference ranges are shifted upward for overweight and obese profiles.',
  WHY_POPULATION:
    'Insulin sensitivity baselines differ across population groups due to genetic and metabolic factors.',
  WHY_MENOPAUSE:
    'Post-menopausal physiology can mildly raise normal HOMA-IR values; we shift the upper bounds slightly.',

  // Methodology
  METHODOLOGY_BUTTON: 'Methodology & references',
  MODAL_CLOSE: 'Close',
  REFERENCES_HEADING: 'References',
  REF_MATTHEWS_1985:
    'Matthews DR, Hosker JP, Rudenski AS, et al. Homeostasis model assessment: insulin resistance and β-cell function from fasting plasma glucose and insulin concentrations in man. Diabetologia. 1985.',
  REF_LEVY_1998:
    'Levy JC, Matthews DR, Hermans MP. Correct homeostasis model assessment (HOMA) evaluation uses the computer program (HOMA2). Diabetes Care. 1998. — Oxford OCDEM HOMA Calculator.',
  REF_KATZ_2000:
    'Katz A, Nambi SS, Mather K, et al. Quantitative insulin sensitivity check index: a simple, accurate method for assessing insulin sensitivity in humans (QUICKI). J Clin Endocrinol Metab. 2000.',
  REF_MATLI_2021:
    'Matli B et al. HOMA-IR reference intervals in a German population. Clinical Chemistry and Laboratory Medicine (CCLM). 2021.',
  REF_ICHIKAWA_2014:
    'Ichikawa T et al. Japanese cutoff for insulin resistance (HOMA-IR ≥ 1.7). Internal Medicine. 2014.',
  REF_KNHANES:
    'Korea National Health and Nutrition Examination Survey (KNHANES) 2008–2010 — Korean reference values for HOMA-IR.',
  REF_EPIRCE:
    'EPIRCE study (Spain) — Age- and sex-specific HOMA-IR distributions in the Spanish population.',
  METHOD_HEADING: 'Methodology & limitations',
  METHOD_BODY:
    'HOMA (Homeostatic Model Assessment) was introduced by Matthews et al. in 1985. It is a screening tool, not a diagnostic test. Results depend on the insulin assay used; absolute cutoffs vary across laboratories. This tool computes:',
  METHOD_FORMULA_IR: 'HOMA-IR = insulin (µU/mL) × glucose (mmol/L) / 22.5',
  METHOD_FORMULA_B: 'HOMA-%B = 20 × insulin / (glucose mmol/L − 3.5)',
  METHOD_FORMULA_S: 'HOMA-%S = 100 / HOMA-IR',
  METHOD_FORMULA_QUICKI: 'QUICKI = 1 / (log₁₀(insulin) + log₁₀(glucose mg/dL))',
  METHOD_LIMITATIONS:
    'Limitations: HOMA assumes steady-state fasting conditions, performs less well in advanced diabetes, and is sensitive to assay variability. Always interpret alongside clinical context.',
  METHOD_REFERENCE: 'Reference paper: Matthews DR et al., Diabetologia 1985.',

  // Privacy
  PRIVACY_NOTE: 'No data leaves your device. All calculations run locally.',
  DISCLAIMER:
    'This tool is for educational purposes and does not provide medical advice, diagnosis, or treatment.',

  // Action bar
  EXPORT_FILENAME: 'homa-results.txt',
};
