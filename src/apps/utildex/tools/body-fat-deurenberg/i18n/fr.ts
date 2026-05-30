export default {
  WEIGHT_LABEL: 'Poids',
  HEIGHT_LABEL: 'Taille',
  WEIGHT_HINT: 'V├¬tements l├®gers, sans chaussures.',
  HEIGHT_HINT: 'Taille debout, sans chaussures.',
  UNIT_KG: 'kg',
  UNIT_LB: 'lb',
  UNIT_CM: 'cm',
  UNIT_IN: 'in',
  UNIT_TOGGLE_WEIGHT: 'Unit├® de poids',
  UNIT_TOGGLE_HEIGHT: 'Unit├® de taille',

  PRIMARY_RESULT_LABEL: 'Masse grasse',
  RESULT_HINT: 'Pourcentage de masse grasse estim├® (Deurenberg)',
  SECONDARY_RESULTS_LABEL: 'Composition',
  RESULT_PLACEHOLDER: 'ÔÇö',
  ENTER_ALL_HINT: 'Saisissez poids, taille, sexe et ├óge pour calculer.',
  BMI_LABEL: 'IMC',
  FAT_MASS_LABEL: 'Masse grasse',
  LEAN_MASS_LABEL: 'Masse maigre',

  INTERPRETATION_HEADING: 'Interpr├®tation',
  AXIS_LEFT_LABEL: 'Essentielle',
  AXIS_RIGHT_LABEL: 'Ob├®sit├®',
  PROFILE_DEFAULTS_BADGE: 'Profil par d├®faut utilis├®',
  PROFILE_DEFAULTS_HINT_SHORT: 'Valeurs par d├®faut ÔÇö personnalisez pour plus de pr├®cision.',

  TIER_ESSENTIAL: 'Graisse essentielle',
  TIER_ATHLETIC: 'Sportif',
  TIER_FITNESS: 'En forme',
  TIER_AVERAGE: 'Moyen',
  TIER_OBESE: 'Ob├®sit├®',

  SUMMARY_ESSENTIAL:
    'Votre masse grasse estim├®e se situe au niveau essentiel. Des valeurs aussi basses sur la dur├®e peuvent nuire ├á la sant├®.',
  SUMMARY_ATHLETIC: 'Votre masse grasse estim├®e est dans la plage des sportifs entra├«n├®s.',
  SUMMARY_FITNESS:
    'Votre masse grasse estim├®e est dans la plage ┬½ en forme ┬╗, typique d\u2019une activit├® physique r├®guli├¿re.',
  SUMMARY_AVERAGE:
    'Votre masse grasse estim├®e est dans la moyenne de la population adulte g├®n├®rale.',
  SUMMARY_OBESE:
    'Votre masse grasse estim├®e se situe dans la plage de l\u2019ob├®sit├® ÔÇö envisagez d\u2019en discuter avec un professionnel de sant├®.',

  NOTE_PEDIATRIC_FORMULA:
    'Formule p├®diatrique de Deurenberg appliqu├®e (7ÔÇô15 ans). Les estimations chez l\u2019enfant sont moins pr├®cises.',
  NOTE_VERY_YOUNG_BLOCKED: 'Les formules de Deurenberg ne sont pas valid├®es avant 7 ans.',
  NOTE_OLDER_ADULT:
    'Au-del├á d\u2019environ 75 ans, l\u2019├®volution de la composition corporelle peut r├®duire la pr├®cision de la formule.',
  NOTE_ETHNICITY:
    'Les ├®quations de Deurenberg ont ├®t├® d├®velopp├®es sur des cohortes majoritairement europ├®ennes ; la pr├®cision varie selon l\u2019ethnie et la corpulence athl├®tique.',

  PROFILE_HEADING: 'Votre profil',
  PROFILE_SEX: 'Sexe',
  PROFILE_SEX_FEMALE: 'Femme',
  PROFILE_SEX_MALE: 'Homme',
  PROFILE_AGE: '├ége',

  WHY_SEX:
    '├Ç IMC ├®gal, le pourcentage de masse grasse est en moyenne ~10 points plus ├®lev├® chez la femme que chez l\u2019homme ; les formules en tiennent compte.',
  WHY_AGE:
    '├Ç IMC ├®gal, la masse grasse augmente avec l\u2019├óge tandis que la masse musculaire diminue ; la formule s\u2019ajuste ├á l\u2019├óge.',

  METHODOLOGY_BUTTON: 'M├®thodologie et r├®f├®rences',
  MODAL_CLOSE: 'Fermer',
  METHOD_HEADING: 'M├®thodologie et limites',
  METHOD_BODY:
    'Deurenberg et al. (1991) ont d├®velopp├® des ├®quations de r├®gression reliant le pourcentage de masse grasse ├á l\u2019IMC, l\u2019├óge et le sexe, valid├®es par densitom├®trie. La variante p├®diatrique (7ÔÇô15 ans) utilise des coefficients diff├®rents.',
  METHOD_FORMULA_ADULT:
    'Adultes : MG% = 1,20┬ÀIMC + 0,23┬À├óge ÔêÆ 10,8┬Àsexe ÔêÆ 5,4    (sexe : homme = 1, femme = 0)',
  METHOD_FORMULA_CHILD: 'Enfants (7ÔÇô15 ans) : MG% = 1,51┬ÀIMC ÔêÆ 0,70┬À├óge ÔêÆ 3,6┬Àsexe + 1,4',
  METHOD_LIMITATIONS:
    'Limites : ces ├®quations expliquent ~70ÔÇô80 % de la variance de la masse grasse, avec une erreur typique de ┬▒4 %. La pr├®cision se d├®grade pour les sportifs tr├¿s maigres (surestimation), les profils tr├¿s muscl├®s, les personnes tr├¿s ob├¿ses, les personnes ├óg├®es et les groupes ethniques en dehors de la cohorte d\u2019origine. Pour des d├®cisions cliniques, pr├®f├®rez la DEXA ou la pl├®thysmographie.',

  REFERENCES_HEADING: 'R├®f├®rences',
  REF_DEURENBERG_1991:
    'Deurenberg P, Weststrate JA, Seidell JC. Body mass index as a measure of body fatness: age- and sex-specific prediction formulas. Br J Nutr. 1991;65(2):105ÔÇô14.',
  REF_DEURENBERG_1998:
    'Deurenberg P, Yap M, van Staveren WA. Body mass index and percent body fat: a meta-analysis among different ethnic groups. Int J Obes. 1998;22(12):1164ÔÇô71.',
  REF_GALLAGHER_2000:
    'Gallagher D et al. Healthy percentage body fat ranges: an approach for developing guidelines based on body mass index. Am J Clin Nutr. 2000;72(3):694ÔÇô701.',

  PRIVACY_NOTE: 'Aucune donn├®e ne quitte votre appareil. Tous les calculs sont locaux.',
  DISCLAIMER:
    'Cet outil est ├á but ├®ducatif et ne fournit ni avis m├®dical, ni diagnostic, ni traitement.',

  EXPORT_FILENAME: 'masse-grasse-deurenberg.txt',
};
