export default {
  // Inputs
  HEIGHT_LABEL: 'Height',
  WEIGHT_LABEL: 'Weight',
  UNIT_CM: 'cm',
  UNIT_IN: 'in',
  UNIT_KG: 'kg',
  UNIT_LB: 'lb',
  UNIT_TOGGLE_HEIGHT: 'Height unit',
  UNIT_TOGGLE_WEIGHT: 'Weight unit',
  CONVERTED_PREFIX: '=',

  STANDARD_LABEL: 'Reference standard',
  STANDARD_WHO: 'WHO (international)',
  STANDARD_ASIA_PACIFIC: 'WHO Asia-Pacific',

  // Result
  PRIMARY_RESULT_LABEL: 'BMI',
  RESULT_HINT: 'Body Mass Index (kg/m²)',
  SECONDARY_RESULTS_LABEL: 'Additional info',
  HEALTHY_RANGE_LABEL: 'Healthy weight range',
  RESULT_PLACEHOLDER: '—',
  ENTER_BOTH_HINT: 'Enter your height and weight to calculate.',

  // Interpretation
  INTERPRETATION_HEADING: 'Interpretation',
  AXIS_LEFT_LABEL: 'Underweight',
  AXIS_RIGHT_LABEL: 'Obese',
  PROFILE_DEFAULTS_BADGE: 'Using default profile',
  PROFILE_DEFAULTS_HINT_SHORT: 'Defaults in use — personalize for accuracy.',

  TIER_UNDERWEIGHT: 'Underweight',
  TIER_NORMAL: 'Normal weight',
  TIER_OVERWEIGHT: 'Overweight',
  TIER_OBESE_I: 'Obesity class I',
  TIER_OBESE_II: 'Obesity class II',
  TIER_OBESE_III: 'Obesity class III',

  SUMMARY_UNDERWEIGHT:
    'Your BMI is below the healthy range. Consider discussing nutrition and overall health with a clinician.',
  SUMMARY_NORMAL: 'Your BMI is within the healthy range for your reference standard.',
  SUMMARY_OVERWEIGHT:
    'Your BMI is above the healthy range. Lifestyle adjustments often bring it back into range.',
  SUMMARY_OBESE_I: 'Your BMI indicates obesity class I — consider discussing it with a clinician.',
  SUMMARY_OBESE_II:
    'Your BMI indicates obesity class II — we recommend discussing it with a clinician.',
  SUMMARY_OBESE_III:
    'Your BMI indicates obesity class III — we recommend discussing it with a clinician.',

  // Notes
  NOTE_ASIA_PACIFIC: 'Using WHO Asia-Pacific cutoffs (lower thresholds for overweight & obesity).',
  NOTE_PEDIATRIC_BLOCKED:
    'BMI interpretation for children and adolescents requires age- and sex-specific percentiles, not implemented in this tool.',
  NOTE_OLDER_ADULT:
    'BMI is less precise above 65; muscle loss and body composition changes affect interpretation.',
  NOTE_ATHLETE_CAVEAT:
    'BMI does not distinguish muscle from fat mass and may overestimate adiposity in highly muscular individuals.',

  // Profile
  PROFILE_HEADING: 'Your profile',
  PROFILE_SEX: 'Sex',
  PROFILE_SEX_FEMALE: 'Female',
  PROFILE_SEX_MALE: 'Male',
  PROFILE_AGE: 'Age',
  PROFILE_STANDARD: 'Standard',

  // Tooltips
  WHY_SEX:
    'Sex does not change adult BMI cutoffs but affects body-composition interpretation; women carry more essential fat than men.',
  WHY_AGE:
    'BMI cutoffs apply to adults only. Above 65, body composition changes reduce BMI accuracy.',
  WHY_STANDARD:
    'WHO Asia-Pacific cutoffs (overweight ≥ 23, obesity ≥ 27.5) better reflect cardiometabolic risk in East and South Asian populations.',

  // Methodology
  METHODOLOGY_BUTTON: 'Methodology & references',
  MODAL_CLOSE: 'Close',
  METHOD_HEADING: 'Methodology & limitations',
  METHOD_BODY:
    'BMI was popularized by Adolphe Quetelet in the 19th century and adopted by the WHO as a population-level screening tool. It is a screening index, not a diagnostic test. The same BMI may correspond to different body-fat percentages across age, sex, ethnicity, and fitness level.',
  METHOD_FORMULA: 'BMI = weight (kg) / height (m)²',
  METHOD_LIMITATIONS:
    'Limitations: BMI does not measure body composition. It can overestimate adiposity in muscular individuals and underestimate it in older adults with sarcopenia. Always interpret with clinical context.',

  REFERENCES_HEADING: 'References',
  REF_WHO_2000:
    'WHO. Obesity: preventing and managing the global epidemic. Technical Report Series 894. 2000.',
  REF_WHO_ASIA_2004:
    'WHO Expert Consultation. Appropriate body-mass index for Asian populations and its implications for policy and intervention strategies. The Lancet. 2004.',
  REF_NHLBI:
    'NHLBI Clinical Guidelines on the Identification, Evaluation, and Treatment of Overweight and Obesity in Adults. 1998.',

  PRIVACY_NOTE: 'No data leaves your device. All calculations run locally.',
  DISCLAIMER:
    'This tool is for educational purposes and does not provide medical advice, diagnosis, or treatment.',

  EXPORT_FILENAME: 'bmi-result.txt',
};
