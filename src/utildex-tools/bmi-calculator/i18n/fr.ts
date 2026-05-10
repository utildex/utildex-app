export default {
  HEIGHT_LABEL: 'Taille',
  WEIGHT_LABEL: 'Poids',
  UNIT_CM: 'cm',
  UNIT_IN: 'in',
  UNIT_KG: 'kg',
  UNIT_LB: 'lb',
  UNIT_TOGGLE_HEIGHT: 'Unité de taille',
  UNIT_TOGGLE_WEIGHT: 'Unité de poids',
  CONVERTED_PREFIX: '=',

  STANDARD_LABEL: 'Référence',
  STANDARD_WHO: 'OMS (international)',
  STANDARD_ASIA_PACIFIC: 'OMS Asie-Pacifique',

  PRIMARY_RESULT_LABEL: 'IMC',
  RESULT_HINT: 'Indice de masse corporelle (kg/m²)',
  SECONDARY_RESULTS_LABEL: 'Informations complémentaires',
  HEALTHY_RANGE_LABEL: 'Plage de poids santé',
  RESULT_PLACEHOLDER: '—',
  ENTER_BOTH_HINT: 'Saisissez votre taille et votre poids pour calculer.',

  INTERPRETATION_HEADING: 'Interprétation',
  AXIS_LEFT_LABEL: 'Insuffisance',
  AXIS_RIGHT_LABEL: 'Obésité',
  PROFILE_DEFAULTS_BADGE: 'Profil par défaut utilisé',
  PROFILE_DEFAULTS_HINT_SHORT: 'Valeurs par défaut — personnalisez pour plus de précision.',

  TIER_UNDERWEIGHT: 'Insuffisance pondérale',
  TIER_NORMAL: 'Poids normal',
  TIER_OVERWEIGHT: 'Surpoids',
  TIER_OBESE_I: 'Obésité de classe I',
  TIER_OBESE_II: 'Obésité de classe II',
  TIER_OBESE_III: 'Obésité de classe III',

  SUMMARY_UNDERWEIGHT:
    'Votre IMC est inférieur à la plage saine. Envisagez d\u2019en discuter avec un professionnel de santé.',
  SUMMARY_NORMAL: 'Votre IMC se situe dans la plage saine pour la référence choisie.',
  SUMMARY_OVERWEIGHT:
    'Votre IMC est supérieur à la plage saine. Des ajustements du mode de vie permettent souvent d\u2019y revenir.',
  SUMMARY_OBESE_I:
    'Votre IMC indique une obésité de classe I — envisagez d\u2019en discuter avec un professionnel de santé.',
  SUMMARY_OBESE_II:
    'Votre IMC indique une obésité de classe II — nous vous recommandons d\u2019en discuter avec un professionnel de santé.',
  SUMMARY_OBESE_III:
    'Votre IMC indique une obésité de classe III — nous vous recommandons d\u2019en discuter avec un professionnel de santé.',

  NOTE_ASIA_PACIFIC: 'Seuils OMS Asie-Pacifique (surpoids ≥ 23, obésité ≥ 27,5) appliqués.',
  NOTE_PEDIATRIC_BLOCKED:
    'L\u2019interprétation pédiatrique nécessite des percentiles spécifiques par âge et sexe, non implémentés ici.',
  NOTE_OLDER_ADULT:
    'L\u2019IMC est moins précis après 65 ans ; la perte musculaire et la composition corporelle modifient l\u2019interprétation.',
  NOTE_ATHLETE_CAVEAT:
    'L\u2019IMC ne distingue pas la masse musculaire de la masse grasse et peut surestimer l\u2019adiposité chez les personnes très musclées.',

  PROFILE_HEADING: 'Votre profil',
  PROFILE_SEX: 'Sexe',
  PROFILE_SEX_FEMALE: 'Femme',
  PROFILE_SEX_MALE: 'Homme',
  PROFILE_AGE: 'Âge',
  PROFILE_STANDARD: 'Référence',

  WHY_SEX:
    'Le sexe ne modifie pas les seuils IMC adultes mais influence l\u2019interprétation de la composition corporelle ; les femmes ont une masse grasse essentielle plus élevée.',
  WHY_AGE:
    'Les seuils IMC s\u2019appliquent uniquement aux adultes. Après 65 ans, la composition corporelle évolue et la précision diminue.',
  WHY_STANDARD:
    'Les seuils OMS Asie-Pacifique (surpoids ≥ 23, obésité ≥ 27,5) reflètent mieux le risque cardiométabolique des populations d\u2019Asie de l\u2019Est et du Sud.',

  METHODOLOGY_BUTTON: 'Méthodologie et références',
  MODAL_CLOSE: 'Fermer',
  METHOD_HEADING: 'Méthodologie et limites',
  METHOD_BODY:
    'L\u2019IMC a été popularisé par Adolphe Quetelet au XIXᵉ siècle et adopté par l\u2019OMS comme outil de dépistage à l\u2019échelle des populations. C\u2019est un indice de dépistage, pas un test diagnostique. Un même IMC peut correspondre à des pourcentages de masse grasse très différents selon l\u2019âge, le sexe, l\u2019ethnicité et la condition physique.',
  METHOD_FORMULA: 'IMC = poids (kg) / taille (m)²',
  METHOD_LIMITATIONS:
    'Limites : l\u2019IMC ne mesure pas la composition corporelle. Il peut surestimer l\u2019adiposité chez les personnes musclées et la sous-estimer chez les personnes âgées sarcopéniques. Toujours interpréter avec le contexte clinique.',

  REFERENCES_HEADING: 'Références',
  REF_WHO_2000:
    'OMS. Obésité : prévention et prise en charge de l\u2019épidémie mondiale. Série de rapports techniques 894. 2000.',
  REF_WHO_ASIA_2004:
    'WHO Expert Consultation. Appropriate body-mass index for Asian populations and its implications for policy and intervention strategies. The Lancet. 2004.',
  REF_NHLBI:
    'NHLBI Clinical Guidelines on the Identification, Evaluation, and Treatment of Overweight and Obesity in Adults. 1998.',

  PRIVACY_NOTE: 'Aucune donnée ne quitte votre appareil. Tous les calculs sont locaux.',
  DISCLAIMER:
    'Cet outil est à but éducatif et ne fournit ni avis médical, ni diagnostic, ni traitement.',

  EXPORT_FILENAME: 'resultat-imc.txt',
};
