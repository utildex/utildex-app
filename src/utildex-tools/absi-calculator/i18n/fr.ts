export default {
  WAIST_LABEL: 'Tour de taille',
  HEIGHT_LABEL: 'Taille',
  WEIGHT_LABEL: 'Poids',
  WAIST_HINT: 'Mesurez à mi-distance entre la dernière côte et la crête iliaque.',
  HEIGHT_HINT: 'Taille debout, sans chaussures.',
  WEIGHT_HINT: 'Vêtements légers, sans chaussures.',
  UNIT_CM: 'cm',
  UNIT_IN: 'in',
  UNIT_KG: 'kg',
  UNIT_LB: 'lb',
  UNIT_TOGGLE_WAIST: 'Unité du tour de taille',
  UNIT_TOGGLE_HEIGHT: 'Unité de taille',
  UNIT_TOGGLE_WEIGHT: 'Unité de poids',

  PRIMARY_RESULT_LABEL: 'Score z ABSI',
  RESULT_HINT: 'Indice de forme ajusté pour le sexe et l\u2019âge (risque de mortalité)',
  SECONDARY_RESULTS_LABEL: 'Détails',
  RESULT_PLACEHOLDER: '—',
  ENTER_ALL_HINT: 'Saisissez tour de taille, taille, poids, sexe et âge pour calculer.',
  ABSI_RAW_LABEL: 'ABSI',
  BMI_LABEL: 'IMC',

  INTERPRETATION_HEADING: 'Interprétation',
  AXIS_LEFT_LABEL: 'Risque très faible',
  AXIS_RIGHT_LABEL: 'Risque très élevé',
  PROFILE_DEFAULTS_BADGE: 'Profil par défaut utilisé',
  PROFILE_DEFAULTS_HINT_SHORT: 'Valeurs par défaut — personnalisez pour plus de précision.',

  TIER_VERYLOW: 'Risque très faible',
  TIER_LOW: 'Risque faible',
  TIER_AVERAGE: 'Risque moyen',
  TIER_HIGH: 'Risque élevé',
  TIER_VERYHIGH: 'Risque très élevé',

  SUMMARY_VERYLOW:
    'Votre ABSI est nettement inférieur à la moyenne pour votre sexe et votre âge — associé au risque de mortalité le plus faible selon cet indicateur.',
  SUMMARY_LOW:
    'Votre ABSI est inférieur à la moyenne pour votre sexe et votre âge — associé à un risque de mortalité réduit.',
  SUMMARY_AVERAGE:
    'Votre ABSI se situe près de la moyenne de la population pour votre sexe et votre âge.',
  SUMMARY_HIGH:
    'Votre ABSI est supérieur à la moyenne pour votre sexe et votre âge — associé à un risque de mortalité accru, indépendant de l\u2019IMC.',
  SUMMARY_VERYHIGH:
    'Votre ABSI est nettement supérieur à la moyenne pour votre sexe et votre âge — associé au risque de mortalité le plus élevé selon cet indicateur. Envisagez d\u2019en discuter avec un professionnel de santé.',

  NOTE_PEDIATRIC_BLOCKED:
    'Les références de score z ABSI ne sont pas établies pour les enfants et adolescents.',
  NOTE_OLDER_ADULT:
    'Au-delà d\u2019environ 80 ans, les données de référence ABSI sont rares ; interprétez avec prudence.',
  NOTE_POPULATION:
    'Les valeurs de référence ABSI proviennent d\u2019adultes américains (NHANES) ; les performances peuvent varier selon la population.',

  PROFILE_HEADING: 'Votre profil',
  PROFILE_SEX: 'Sexe',
  PROFILE_SEX_FEMALE: 'Femme',
  PROFILE_SEX_MALE: 'Homme',
  PROFILE_AGE: 'Âge',

  WHY_SEX:
    'Les distributions d\u2019ABSI diffèrent entre femmes et hommes ; le score z utilise des moyennes et écarts-types spécifiques au sexe.',
  WHY_AGE:
    'L\u2019ABSI tend à augmenter avec l\u2019âge. Le score z utilise des références par décennie d\u2019âge pour isoler la forme corporelle des effets de l\u2019âge.',

  METHODOLOGY_BUTTON: 'Méthodologie et références',
  MODAL_CLOSE: 'Fermer',
  METHOD_HEADING: 'Méthodologie et limites',
  METHOD_BODY:
    'Krakauer et Krakauer (2012) ont défini l\u2019ABSI pour capter la forme abdominale indépendamment de la taille corporelle globale. Le score z compare votre ABSI aux valeurs de référence NHANES par sexe et décennie d\u2019âge ; un score positif indique un profil plus cylindrique/abdominal, associé à un risque accru de mortalité toutes causes, indépendamment de l\u2019IMC.',
  METHOD_FORMULA:
    'ABSI = TT(m) / (IMC^(2/3) · taille(m)^(1/2))    avec IMC = poids(kg) / taille(m)^2',
  METHOD_LIMITATIONS:
    'Limites : l\u2019ABSI est un indicateur de recherche surtout utile à l\u2019échelle populationnelle pour la stratification de la mortalité. Il ne remplace pas l\u2019évaluation clinique, et les références ici proviennent d\u2019adultes NHANES. Évitez de surinterpréter des scores individuels proches de la moyenne.',

  REFERENCES_HEADING: 'Références',
  REF_KRAKAUER_2012:
    'Krakauer NY, Krakauer JC. A new body shape index predicts mortality hazard independently of body mass index. PLoS ONE. 2012;7(7):e39504.',
  REF_KRAKAUER_2014:
    'Krakauer NY, Krakauer JC. Dynamic association of mortality hazard with body shape. PLoS ONE. 2014;9(2):e88793.',
  REF_DHANA_2016:
    'Dhana K et al. Anthropometric measures in cardiovascular disease prediction: comparison of laboratory-based versus non-laboratory-based model. Heart. 2016;102(13):1023–9.',

  PRIVACY_NOTE: 'Aucune donnée ne quitte votre appareil. Tous les calculs sont locaux.',
  DISCLAIMER:
    'Cet outil est à but éducatif et ne fournit ni avis médical, ni diagnostic, ni traitement.',

  EXPORT_FILENAME: 'resultat-absi.txt',
};
