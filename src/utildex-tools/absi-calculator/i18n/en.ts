export default {
  WAIST_LABEL: 'Waist',
  HEIGHT_LABEL: 'Height',
  WEIGHT_LABEL: 'Weight',
  WAIST_HINT: 'Measure halfway between the lowest rib and the iliac crest.',
  HEIGHT_HINT: 'Standing height without shoes.',
  WEIGHT_HINT: 'Light clothing, no shoes.',
  UNIT_CM: 'cm',
  UNIT_IN: 'in',
  UNIT_KG: 'kg',
  UNIT_LB: 'lb',
  UNIT_TOGGLE_WAIST: 'Waist unit',
  UNIT_TOGGLE_HEIGHT: 'Height unit',
  UNIT_TOGGLE_WEIGHT: 'Weight unit',

  PRIMARY_RESULT_LABEL: 'ABSI z-score',
  RESULT_HINT: 'Sex- and age-adjusted shape index (mortality risk)',
  SECONDARY_RESULTS_LABEL: 'Details',
  RESULT_PLACEHOLDER: '—',
  ENTER_ALL_HINT: 'Enter waist, height, weight, sex and age to calculate.',
  ABSI_RAW_LABEL: 'ABSI',
  BMI_LABEL: 'BMI',

  INTERPRETATION_HEADING: 'Interpretation',
  AXIS_LEFT_LABEL: 'Very low risk',
  AXIS_RIGHT_LABEL: 'Very high risk',
  PROFILE_DEFAULTS_BADGE: 'Using default profile',
  PROFILE_DEFAULTS_HINT_SHORT: 'Defaults in use — personalize for accuracy.',

  TIER_VERYLOW: 'Very low risk',
  TIER_LOW: 'Low risk',
  TIER_AVERAGE: 'Average risk',
  TIER_HIGH: 'High risk',
  TIER_VERYHIGH: 'Very high risk',

  SUMMARY_VERYLOW:
    'Your ABSI is well below average for your sex and age — associated with the lowest mortality risk in this metric.',
  SUMMARY_LOW:
    'Your ABSI is below average for your sex and age — associated with lower mortality risk.',
  SUMMARY_AVERAGE: 'Your ABSI is near the population average for your sex and age.',
  SUMMARY_HIGH:
    'Your ABSI is above average for your sex and age — associated with elevated mortality risk independent of BMI.',
  SUMMARY_VERYHIGH:
    'Your ABSI is well above average for your sex and age — associated with the highest mortality risk in this metric. Consider discussing with a clinician.',

  NOTE_PEDIATRIC_BLOCKED:
    'ABSI z-score reference data are not established for children and adolescents.',
  NOTE_OLDER_ADULT: 'Above ~80 years, ABSI reference data are sparse; interpret with caution.',
  NOTE_POPULATION:
    'ABSI reference values were derived from US (NHANES) adults; performance may vary in other populations.',

  PROFILE_HEADING: 'Your profile',
  PROFILE_SEX: 'Sex',
  PROFILE_SEX_FEMALE: 'Female',
  PROFILE_SEX_MALE: 'Male',
  PROFILE_AGE: 'Age',

  WHY_SEX:
    'ABSI distributions differ between women and men, so the z-score uses sex-specific reference means and standard deviations.',
  WHY_AGE:
    'ABSI tends to rise with age. The z-score uses age-decade-specific reference values to isolate shape from age effects.',

  METHODOLOGY_BUTTON: 'Methodology & references',
  MODAL_CLOSE: 'Close',
  METHOD_HEADING: 'Methodology & limitations',
  METHOD_BODY:
    'Krakauer & Krakauer (2012) defined ABSI to capture abdominal shape independently of overall size. The z-score compares your ABSI to NHANES sex- and age-decade reference values; positive z-scores indicate a more cylindrical/abdominal profile, associated with increased all-cause mortality risk independently of BMI.',
  METHOD_FORMULA:
    'ABSI = WC(m) / (BMI^(2/3) · height(m)^(1/2))    with BMI = weight(kg) / height(m)^2',
  METHOD_LIMITATIONS:
    'Limitations: ABSI is a research-grade metric most useful for population-level mortality stratification. It does not replace clinical evaluation, and reference data here are derived from NHANES adults. Avoid over-interpreting individual scores near the average.',

  REFERENCES_HEADING: 'References',
  REF_KRAKAUER_2012:
    'Krakauer NY, Krakauer JC. A new body shape index predicts mortality hazard independently of body mass index. PLoS ONE. 2012;7(7):e39504.',
  REF_KRAKAUER_2014:
    'Krakauer NY, Krakauer JC. Dynamic association of mortality hazard with body shape. PLoS ONE. 2014;9(2):e88793.',
  REF_DHANA_2016:
    'Dhana K et al. Anthropometric measures in cardiovascular disease prediction: comparison of laboratory-based versus non-laboratory-based model. Heart. 2016;102(13):1023–9.',

  PRIVACY_NOTE: 'No data leaves your device. All calculations run locally.',
  DISCLAIMER:
    'This tool is for educational purposes and does not provide medical advice, diagnosis, or treatment.',

  EXPORT_FILENAME: 'absi-result.txt',
};
