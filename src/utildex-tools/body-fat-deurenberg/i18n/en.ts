export default {
  WEIGHT_LABEL: 'Weight',
  HEIGHT_LABEL: 'Height',
  WEIGHT_HINT: 'Light clothing, no shoes.',
  HEIGHT_HINT: 'Standing height without shoes.',
  UNIT_KG: 'kg',
  UNIT_LB: 'lb',
  UNIT_CM: 'cm',
  UNIT_IN: 'in',
  UNIT_TOGGLE_WEIGHT: 'Weight unit',
  UNIT_TOGGLE_HEIGHT: 'Height unit',

  PRIMARY_RESULT_LABEL: 'Body fat',
  RESULT_HINT: 'Estimated body-fat percentage (Deurenberg)',
  SECONDARY_RESULTS_LABEL: 'Composition',
  RESULT_PLACEHOLDER: '—',
  ENTER_ALL_HINT: 'Enter weight, height, sex and age to calculate.',
  BMI_LABEL: 'BMI',
  FAT_MASS_LABEL: 'Fat mass',
  LEAN_MASS_LABEL: 'Lean mass',

  INTERPRETATION_HEADING: 'Interpretation',
  AXIS_LEFT_LABEL: 'Essential',
  AXIS_RIGHT_LABEL: 'Obese',
  PROFILE_DEFAULTS_BADGE: 'Using default profile',
  PROFILE_DEFAULTS_HINT_SHORT: 'Defaults in use — personalize for accuracy.',

  TIER_ESSENTIAL: 'Essential fat',
  TIER_ATHLETIC: 'Athletes',
  TIER_FITNESS: 'Fitness',
  TIER_AVERAGE: 'Average',
  TIER_OBESE: 'Obese',

  SUMMARY_ESSENTIAL:
    'Your estimated body-fat is in the essential-fat range. Sustained values this low may impair health.',
  SUMMARY_ATHLETIC:
    'Your estimated body-fat is in the athletic range, typical of trained individuals.',
  SUMMARY_FITNESS:
    'Your estimated body-fat is in the fitness range — typically associated with regular exercise.',
  SUMMARY_AVERAGE:
    'Your estimated body-fat is in the average range for the general adult population.',
  SUMMARY_OBESE:
    'Your estimated body-fat is in the obese range — consider discussing it with a clinician.',

  NOTE_PEDIATRIC_FORMULA:
    'Pediatric Deurenberg formula applied (ages 7–15). Estimates in children are less precise.',
  NOTE_VERY_YOUNG_BLOCKED: 'Deurenberg formulas are not validated under age 7.',
  NOTE_OLDER_ADULT:
    'Above ~75 years, body composition shifts may reduce the formula\u2019s accuracy.',
  NOTE_ETHNICITY:
    'Deurenberg equations were developed in mostly Caucasian European cohorts; accuracy varies by ethnicity and athletic build.',

  PROFILE_HEADING: 'Your profile',
  PROFILE_SEX: 'Sex',
  PROFILE_SEX_FEMALE: 'Female',
  PROFILE_SEX_MALE: 'Male',
  PROFILE_AGE: 'Age',

  WHY_SEX:
    'Body-fat at a given BMI is on average ~10 percentage points higher in women than in men, and the formulas account for this.',
  WHY_AGE:
    'At the same BMI, body-fat tends to rise with age as muscle mass declines; the formula adjusts for age.',

  METHODOLOGY_BUTTON: 'Methodology & references',
  MODAL_CLOSE: 'Close',
  METHOD_HEADING: 'Methodology & limitations',
  METHOD_BODY:
    'Deurenberg et al. (1991) developed regression equations linking body-fat percentage to BMI, age and sex, validated against densitometry. The pediatric variant (ages 7–15) uses different coefficients.',
  METHOD_FORMULA_ADULT:
    'Adults: BF% = 1.20·BMI + 0.23·age − 10.8·sex − 5.4    (sex: male = 1, female = 0)',
  METHOD_FORMULA_CHILD: 'Children (7–15): BF% = 1.51·BMI − 0.70·age − 3.6·sex + 1.4',
  METHOD_LIMITATIONS:
    'Limitations: Regression equations explain ~70–80% of body-fat variance and have a typical error of ±4%. Accuracy degrades for very lean athletes (overestimates fat), highly muscular builds, very obese individuals, the elderly, and ethnic groups outside the original cohort. For clinical decisions, prefer DXA or air-displacement plethysmography.',

  REFERENCES_HEADING: 'References',
  REF_DEURENBERG_1991:
    'Deurenberg P, Weststrate JA, Seidell JC. Body mass index as a measure of body fatness: age- and sex-specific prediction formulas. Br J Nutr. 1991;65(2):105–14.',
  REF_DEURENBERG_1998:
    'Deurenberg P, Yap M, van Staveren WA. Body mass index and percent body fat: a meta-analysis among different ethnic groups. Int J Obes. 1998;22(12):1164–71.',
  REF_GALLAGHER_2000:
    'Gallagher D et al. Healthy percentage body fat ranges: an approach for developing guidelines based on body mass index. Am J Clin Nutr. 2000;72(3):694–701.',

  PRIVACY_NOTE: 'No data leaves your device. All calculations run locally.',
  DISCLAIMER:
    'This tool is for educational purposes and does not provide medical advice, diagnosis, or treatment.',

  EXPORT_FILENAME: 'body-fat-deurenberg.txt',
};
