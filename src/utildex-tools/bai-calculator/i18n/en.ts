export default {
  HIP_LABEL: 'Hip',
  HEIGHT_LABEL: 'Height',
  HIP_HINT: 'Measure at the widest part of the buttocks.',
  HEIGHT_HINT: 'Standing height without shoes.',
  UNIT_CM: 'cm',
  UNIT_IN: 'in',
  UNIT_TOGGLE_HIP: 'Hip unit',
  UNIT_TOGGLE_HEIGHT: 'Height unit',
  CONVERTED_PREFIX: '=',

  PRIMARY_RESULT_LABEL: 'BAI',
  RESULT_HINT: 'Body Adiposity Index (% body fat estimate)',
  SECONDARY_RESULTS_LABEL: 'Additional info',
  RESULT_PLACEHOLDER: '—',
  ENTER_BOTH_HINT: 'Enter your hip circumference and height to calculate.',

  INTERPRETATION_HEADING: 'Interpretation',
  AXIS_LEFT_LABEL: 'Underweight',
  AXIS_RIGHT_LABEL: 'Obese',
  PROFILE_DEFAULTS_BADGE: 'Using default profile',
  PROFILE_DEFAULTS_HINT_SHORT: 'Defaults in use — personalize for accuracy.',

  TIER_UNDERWEIGHT: 'Underweight',
  TIER_NORMAL: 'Normal',
  TIER_OVERWEIGHT: 'Overweight',
  TIER_OBESE: 'Obese',

  SUMMARY_UNDERWEIGHT: 'Your BAI is below the healthy range for your sex and age band.',
  SUMMARY_NORMAL: 'Your BAI is within the healthy range for your sex and age band.',
  SUMMARY_OVERWEIGHT:
    'Your BAI is above the healthy range. Lifestyle adjustments often bring it back into range.',
  SUMMARY_OBESE: 'Your BAI is in the obese range — consider discussing it with a clinician.',

  NOTE_PEDIATRIC_BLOCKED: 'BAI thresholds are not established for children and adolescents.',
  NOTE_OLDER_ADULT: 'BAI cutoffs above ~80 years are extrapolated; interpret with caution.',
  NOTE_POPULATION:
    'BAI cutoffs were derived from a Mexican-American cohort; their generalizability is debated.',

  PROFILE_HEADING: 'Your profile',
  PROFILE_SEX: 'Sex',
  PROFILE_SEX_FEMALE: 'Female',
  PROFILE_SEX_MALE: 'Male',
  PROFILE_AGE: 'Age',

  WHY_SEX:
    'BAI cutoffs differ between women and men because fat distribution and overall body-fat percentage differ by sex.',
  WHY_AGE:
    'BAI cutoffs are stratified by age band (20–39, 40–59, 60–79). Below 18 cutoffs are not defined.',

  METHODOLOGY_BUTTON: 'Methodology & references',
  MODAL_CLOSE: 'Close',
  METHOD_HEADING: 'Methodology & limitations',
  METHOD_BODY:
    'The Body Adiposity Index was proposed by Bergman et al. (2011) as a weight-free estimate of body-fat percentage. It uses only hip circumference and height. Its main appeal is the lack of weight measurement, which can be impractical or unreliable in some settings.',
  METHOD_FORMULA: 'BAI = hip (cm) / height (m)^1.5 − 18',
  METHOD_LIMITATIONS:
    'Limitations: BAI was derived from a single ethnic cohort and has shown variable accuracy in subsequent validation studies. Several head-to-head comparisons report that BMI plus waist circumference outperforms BAI for predicting body-fat percentage and cardiometabolic risk. Always interpret with clinical context.',

  REFERENCES_HEADING: 'References',
  REF_BERGMAN_2011:
    'Bergman RN et al. A better index of body adiposity. Obesity (Silver Spring). 2011.',
  REF_FREEDMAN_2012:
    'Freedman DS et al. The body adiposity index (hip circumference ÷ height^1.5) is not a more accurate measure of adiposity than BMI, waist circumference, or hip circumference. Obesity. 2012.',
  REF_LOPEZ_2012:
    'López-Alvarenga JC et al. Body adiposity index: a critical reappraisal. Obesity. 2012.',

  PRIVACY_NOTE: 'No data leaves your device. All calculations run locally.',
  DISCLAIMER:
    'This tool is for educational purposes and does not provide medical advice, diagnosis, or treatment.',

  EXPORT_FILENAME: 'bai-result.txt',
};
