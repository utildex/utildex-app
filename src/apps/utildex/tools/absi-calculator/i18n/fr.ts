export default {
  WAIST_LABEL: 'Tour de taille',
  HEIGHT_LABEL: 'Taille',
  WEIGHT_LABEL: 'Poids',
  WAIST_HINT: 'Mesurez ├á mi-distance entre la derni├¿re c├┤te et la cr├¬te iliaque.',
  HEIGHT_HINT: 'Taille debout, sans chaussures.',
  WEIGHT_HINT: 'V├¬tements l├®gers, sans chaussures.',
  UNIT_CM: 'cm',
  UNIT_IN: 'in',
  UNIT_KG: 'kg',
  UNIT_LB: 'lb',
  UNIT_TOGGLE_WAIST: 'Unit├® du tour de taille',
  UNIT_TOGGLE_HEIGHT: 'Unit├® de taille',
  UNIT_TOGGLE_WEIGHT: 'Unit├® de poids',

  PRIMARY_RESULT_LABEL: 'Score z ABSI',
  RESULT_HINT: 'Indice de forme ajust├® pour le sexe et l\u2019├óge (risque de mortalit├®)',
  SECONDARY_RESULTS_LABEL: 'D├®tails',
  RESULT_PLACEHOLDER: 'ÔÇö',
  ENTER_ALL_HINT: 'Saisissez tour de taille, taille, poids, sexe et ├óge pour calculer.',
  ABSI_RAW_LABEL: 'ABSI',
  BMI_LABEL: 'IMC',

  INTERPRETATION_HEADING: 'Interpr├®tation',
  AXIS_LEFT_LABEL: 'Risque tr├¿s faible',
  AXIS_RIGHT_LABEL: 'Risque tr├¿s ├®lev├®',
  PROFILE_DEFAULTS_BADGE: 'Profil par d├®faut utilis├®',
  PROFILE_DEFAULTS_HINT_SHORT: 'Valeurs par d├®faut ÔÇö personnalisez pour plus de pr├®cision.',

  TIER_VERYLOW: 'Risque tr├¿s faible',
  TIER_LOW: 'Risque faible',
  TIER_AVERAGE: 'Risque moyen',
  TIER_HIGH: 'Risque ├®lev├®',
  TIER_VERYHIGH: 'Risque tr├¿s ├®lev├®',

  SUMMARY_VERYLOW:
    'Votre ABSI est nettement inf├®rieur ├á la moyenne pour votre sexe et votre ├óge ÔÇö associ├® au risque de mortalit├® le plus faible selon cet indicateur.',
  SUMMARY_LOW:
    'Votre ABSI est inf├®rieur ├á la moyenne pour votre sexe et votre ├óge ÔÇö associ├® ├á un risque de mortalit├® r├®duit.',
  SUMMARY_AVERAGE:
    'Votre ABSI se situe pr├¿s de la moyenne de la population pour votre sexe et votre ├óge.',
  SUMMARY_HIGH:
    'Votre ABSI est sup├®rieur ├á la moyenne pour votre sexe et votre ├óge ÔÇö associ├® ├á un risque de mortalit├® accru, ind├®pendant de l\u2019IMC.',
  SUMMARY_VERYHIGH:
    'Votre ABSI est nettement sup├®rieur ├á la moyenne pour votre sexe et votre ├óge ÔÇö associ├® au risque de mortalit├® le plus ├®lev├® selon cet indicateur. Envisagez d\u2019en discuter avec un professionnel de sant├®.',

  NOTE_PEDIATRIC_BLOCKED:
    'Les r├®f├®rences de score z ABSI ne sont pas ├®tablies pour les enfants et adolescents.',
  NOTE_OLDER_ADULT:
    'Au-del├á d\u2019environ 80 ans, les donn├®es de r├®f├®rence ABSI sont rares ; interpr├®tez avec prudence.',
  NOTE_POPULATION:
    'Les valeurs de r├®f├®rence ABSI proviennent d\u2019adultes am├®ricains (NHANES) ; les performances peuvent varier selon la population.',

  PROFILE_HEADING: 'Votre profil',
  PROFILE_SEX: 'Sexe',
  PROFILE_SEX_FEMALE: 'Femme',
  PROFILE_SEX_MALE: 'Homme',
  PROFILE_AGE: '├ége',

  WHY_SEX:
    'Les distributions d\u2019ABSI diff├¿rent entre femmes et hommes ; le score z utilise des moyennes et ├®carts-types sp├®cifiques au sexe.',
  WHY_AGE:
    'L\u2019ABSI tend ├á augmenter avec l\u2019├óge. Le score z utilise des r├®f├®rences par d├®cennie d\u2019├óge pour isoler la forme corporelle des effets de l\u2019├óge.',

  METHODOLOGY_BUTTON: 'M├®thodologie et r├®f├®rences',
  MODAL_CLOSE: 'Fermer',
  METHOD_HEADING: 'M├®thodologie et limites',
  METHOD_BODY:
    'Krakauer et Krakauer (2012) ont d├®fini l\u2019ABSI pour capter la forme abdominale ind├®pendamment de la taille corporelle globale. Le score z compare votre ABSI aux valeurs de r├®f├®rence NHANES par sexe et d├®cennie d\u2019├óge ; un score positif indique un profil plus cylindrique/abdominal, associ├® ├á un risque accru de mortalit├® toutes causes, ind├®pendamment de l\u2019IMC.',
  METHOD_FORMULA:
    'ABSI = TT(m) / (IMC^(2/3) ┬À taille(m)^(1/2))    avec IMC = poids(kg) / taille(m)^2',
  METHOD_LIMITATIONS:
    'Limites : l\u2019ABSI est un indicateur de recherche surtout utile ├á l\u2019├®chelle populationnelle pour la stratification de la mortalit├®. Il ne remplace pas l\u2019├®valuation clinique, et les r├®f├®rences ici proviennent d\u2019adultes NHANES. ├ëvitez de surinterpr├®ter des scores individuels proches de la moyenne.',

  REFERENCES_HEADING: 'R├®f├®rences',
  REF_KRAKAUER_2012:
    'Krakauer NY, Krakauer JC. A new body shape index predicts mortality hazard independently of body mass index. PLoS ONE. 2012;7(7):e39504.',
  REF_KRAKAUER_2014:
    'Krakauer NY, Krakauer JC. Dynamic association of mortality hazard with body shape. PLoS ONE. 2014;9(2):e88793.',
  REF_DHANA_2016:
    'Dhana K et al. Anthropometric measures in cardiovascular disease prediction: comparison of laboratory-based versus non-laboratory-based model. Heart. 2016;102(13):1023ÔÇô9.',

  PRIVACY_NOTE: 'Aucune donn├®e ne quitte votre appareil. Tous les calculs sont locaux.',
  DISCLAIMER:
    'Cet outil est ├á but ├®ducatif et ne fournit ni avis m├®dical, ni diagnostic, ni traitement.',

  EXPORT_FILENAME: 'resultat-absi.txt',
};
