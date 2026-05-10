export default {
  WEIGHT_LABEL: 'Poids',
  HEIGHT_LABEL: 'Taille',
  WEIGHT_HINT: 'Vêtements légers, sans chaussures.',
  HEIGHT_HINT: 'Taille debout, sans chaussures.',
  UNIT_KG: 'kg',
  UNIT_LB: 'lb',
  UNIT_CM: 'cm',
  UNIT_IN: 'in',
  UNIT_TOGGLE_WEIGHT: 'Unité de poids',
  UNIT_TOGGLE_HEIGHT: 'Unité de taille',

  PRIMARY_RESULT_LABEL: 'Masse grasse',
  RESULT_HINT: 'Pourcentage de masse grasse estimé (Deurenberg)',
  SECONDARY_RESULTS_LABEL: 'Composition',
  RESULT_PLACEHOLDER: '—',
  ENTER_ALL_HINT: 'Saisissez poids, taille, sexe et âge pour calculer.',
  BMI_LABEL: 'IMC',
  FAT_MASS_LABEL: 'Masse grasse',
  LEAN_MASS_LABEL: 'Masse maigre',

  INTERPRETATION_HEADING: 'Interprétation',
  AXIS_LEFT_LABEL: 'Essentielle',
  AXIS_RIGHT_LABEL: 'Obésité',
  PROFILE_DEFAULTS_BADGE: 'Profil par défaut utilisé',
  PROFILE_DEFAULTS_HINT_SHORT: 'Valeurs par défaut — personnalisez pour plus de précision.',

  TIER_ESSENTIAL: 'Graisse essentielle',
  TIER_ATHLETIC: 'Sportif',
  TIER_FITNESS: 'En forme',
  TIER_AVERAGE: 'Moyen',
  TIER_OBESE: 'Obésité',

  SUMMARY_ESSENTIAL:
    'Votre masse grasse estimée se situe au niveau essentiel. Des valeurs aussi basses sur la durée peuvent nuire à la santé.',
  SUMMARY_ATHLETIC: 'Votre masse grasse estimée est dans la plage des sportifs entraînés.',
  SUMMARY_FITNESS:
    'Votre masse grasse estimée est dans la plage « en forme », typique d\u2019une activité physique régulière.',
  SUMMARY_AVERAGE:
    'Votre masse grasse estimée est dans la moyenne de la population adulte générale.',
  SUMMARY_OBESE:
    'Votre masse grasse estimée se situe dans la plage de l\u2019obésité — envisagez d\u2019en discuter avec un professionnel de santé.',

  NOTE_PEDIATRIC_FORMULA:
    'Formule pédiatrique de Deurenberg appliquée (7–15 ans). Les estimations chez l\u2019enfant sont moins précises.',
  NOTE_VERY_YOUNG_BLOCKED: 'Les formules de Deurenberg ne sont pas validées avant 7 ans.',
  NOTE_OLDER_ADULT:
    'Au-delà d\u2019environ 75 ans, l\u2019évolution de la composition corporelle peut réduire la précision de la formule.',
  NOTE_ETHNICITY:
    'Les équations de Deurenberg ont été développées sur des cohortes majoritairement européennes ; la précision varie selon l\u2019ethnie et la corpulence athlétique.',

  PROFILE_HEADING: 'Votre profil',
  PROFILE_SEX: 'Sexe',
  PROFILE_SEX_FEMALE: 'Femme',
  PROFILE_SEX_MALE: 'Homme',
  PROFILE_AGE: 'Âge',

  WHY_SEX:
    'À IMC égal, le pourcentage de masse grasse est en moyenne ~10 points plus élevé chez la femme que chez l\u2019homme ; les formules en tiennent compte.',
  WHY_AGE:
    'À IMC égal, la masse grasse augmente avec l\u2019âge tandis que la masse musculaire diminue ; la formule s\u2019ajuste à l\u2019âge.',

  METHODOLOGY_BUTTON: 'Méthodologie et références',
  MODAL_CLOSE: 'Fermer',
  METHOD_HEADING: 'Méthodologie et limites',
  METHOD_BODY:
    'Deurenberg et al. (1991) ont développé des équations de régression reliant le pourcentage de masse grasse à l\u2019IMC, l\u2019âge et le sexe, validées par densitométrie. La variante pédiatrique (7–15 ans) utilise des coefficients différents.',
  METHOD_FORMULA_ADULT:
    'Adultes : MG% = 1,20·IMC + 0,23·âge − 10,8·sexe − 5,4    (sexe : homme = 1, femme = 0)',
  METHOD_FORMULA_CHILD: 'Enfants (7–15 ans) : MG% = 1,51·IMC − 0,70·âge − 3,6·sexe + 1,4',
  METHOD_LIMITATIONS:
    'Limites : ces équations expliquent ~70–80 % de la variance de la masse grasse, avec une erreur typique de ±4 %. La précision se dégrade pour les sportifs très maigres (surestimation), les profils très musclés, les personnes très obèses, les personnes âgées et les groupes ethniques en dehors de la cohorte d\u2019origine. Pour des décisions cliniques, préférez la DEXA ou la pléthysmographie.',

  REFERENCES_HEADING: 'Références',
  REF_DEURENBERG_1991:
    'Deurenberg P, Weststrate JA, Seidell JC. Body mass index as a measure of body fatness: age- and sex-specific prediction formulas. Br J Nutr. 1991;65(2):105–14.',
  REF_DEURENBERG_1998:
    'Deurenberg P, Yap M, van Staveren WA. Body mass index and percent body fat: a meta-analysis among different ethnic groups. Int J Obes. 1998;22(12):1164–71.',
  REF_GALLAGHER_2000:
    'Gallagher D et al. Healthy percentage body fat ranges: an approach for developing guidelines based on body mass index. Am J Clin Nutr. 2000;72(3):694–701.',

  PRIVACY_NOTE: 'Aucune donnée ne quitte votre appareil. Tous les calculs sont locaux.',
  DISCLAIMER:
    'Cet outil est à but éducatif et ne fournit ni avis médical, ni diagnostic, ni traitement.',

  EXPORT_FILENAME: 'masse-grasse-deurenberg.txt',
};
