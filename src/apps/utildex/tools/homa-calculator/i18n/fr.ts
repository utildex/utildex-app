export default {
  METHOD_LABEL: 'Méthode de calcul',
  METHOD_HOMA_IR: 'HOMA-IR',
  METHOD_HOMA_B: 'HOMA-%B',
  METHOD_HOMA_S: 'HOMA-%S',
  METHOD_QUICKI: 'QUICKI',
  METHOD_HOMA_IR_HINT: "Indice d'insulinorésistance",
  METHOD_HOMA_B_HINT: 'Fonction des cellules bêta',
  METHOD_HOMA_S_HINT: "Sensibilité à l'insuline",
  METHOD_QUICKI_HINT: "Vérification quantitative de la sensibilité à l'insuline",

  CLINICAL_HEADING: 'Données cliniques',
  GLUCOSE_LABEL: 'Glycémie à jeun',
  INSULIN_LABEL: 'Insulinémie à jeun',
  INSULIN_UNIT: 'µU/mL (mIU/L)',
  UNIT_MGDL: 'mg/dL',
  UNIT_MMOL: 'mmol/L',
  UNIT_TOGGLE_LABEL: 'Unité de glycémie',
  CONVERTED_PREFIX: '=',

  PRIMARY_RESULT_LABEL: 'Résultat principal',
  SECONDARY_RESULTS_LABEL: 'Autres indices',
  RESULT_PLACEHOLDER: '—',
  ENTER_BOTH_HINT: "Saisissez la glycémie et l'insulinémie pour calculer.",
  GLUCOSE_TOO_LOW: 'Valeur de glycémie trop basse pour le calcul de la fonction des cellules bêta.',

  INTERPRETATION_HEADING: 'Interprétation',
  INTERPRETATION_BASED_ON: 'Basée sur :',
  PROFILE_DEFAULTS_BADGE: 'Profil par défaut utilisé',
  PROFILE_DEFAULTS_HINT:
    'Ces valeurs sont par défaut — saisissez votre profil ci-dessous pour une interprétation personnalisée.',
  PROFILE_DEFAULTS_HINT_SHORT: 'Valeurs par défaut — personnalisez pour plus de précision.',
  AXIS_LEFT_LABEL: 'Optimal',
  AXIS_RIGHT_LABEL: 'Élevé',
  TIER_OPTIMAL: 'Optimal',
  TIER_NORMAL: 'Normal',
  TIER_MILD: 'Légèrement élevé',
  TIER_ELEVATED: 'Élevé',
  TIER_HIGH: 'Très élevé',
  QUICKI_TIER_OPTIMAL: 'Sensibilité élevée',
  QUICKI_TIER_NORMAL: 'Sensibilité normale',
  QUICKI_TIER_REDUCED: 'Insulinorésistance probable',

  IR_SUMMARY_OPTIMAL:
    "Votre résultat se situe dans la plage optimale pour votre profil, ce qui suggère une bonne sensibilité à l'insuline.",
  IR_SUMMARY_NORMAL: 'Votre résultat se situe dans la plage normale pour votre profil.',
  IR_SUMMARY_MILD:
    'Votre résultat suggère une insulinorésistance légèrement élevée. Les facteurs liés au mode de vie permettent souvent de revenir dans la plage normale.',
  IR_SUMMARY_ELEVATED:
    "Votre résultat suggère une insulinorésistance élevée — envisagez d'en discuter avec un professionnel de santé.",
  IR_SUMMARY_HIGH:
    'Votre résultat suggère une insulinorésistance importante — nous vous recommandons d’en discuter avec un professionnel de santé.',

  QUICKI_SUMMARY_OPTIMAL: "Votre valeur QUICKI suggère une sensibilité élevée à l'insuline.",
  QUICKI_SUMMARY_NORMAL: 'Votre valeur QUICKI se situe dans la plage de sensibilité normale.',
  QUICKI_SUMMARY_REDUCED:
    "Votre valeur QUICKI suggère une sensibilité réduite — envisagez d'en discuter avec un professionnel de santé.",

  HOMA_B_NOTE:
    '100% représente une fonction bêta normale chez un adulte jeune en bonne santé. En dessous : fonction réduite ; au-dessus : possible hypersécrétion compensatoire.',
  HOMA_S_NOTE:
    "100% représente une sensibilité normale à l'insuline. Plus c'est élevé, mieux c'est.",

  NOTE_BMI_ADJUSTED: 'Les plages de référence sont ajustées à votre catégorie d’IMC.',
  NOTE_POSTMENO_ADJUSTED:
    'Les bornes supérieures sont légèrement relevées pour la physiologie post-ménopause.',
  NOTE_POPULATION_FALLBACK:
    'Les données de référence spécifiques sont limitées pour ce groupe ; les plages européennes sont utilisées par défaut.',
  NOTE_PEDIATRIC_BLOCKED:
    'L’interprétation pédiatrique nécessite des courbes de référence par âge et sexe non implémentées ici.',
  NOTE_YOUNG_ADULT:
    'Les valeurs peuvent être légèrement plus basses que la référence adulte avant 25 ans.',
  NOTE_OLDER_ADULT:
    'Une légère dérive vers le haut est attendue avec l’âge ; l’interprétation est moins précise après 65 ans.',
  NOTE_PROFILE_CHANGED:
    'Votre score n’a pas changé, mais la plage de référence pour votre profil est différente.',

  PROFILE_HEADING: 'Votre profil',
  PROFILE_TOGGLE_SHOW: 'Afficher le profil',
  PROFILE_TOGGLE_HIDE: 'Masquer le profil',
  PROFILE_SEX: 'Sexe',
  PROFILE_SEX_FEMALE: 'Femme',
  PROFILE_SEX_MALE: 'Homme',
  PROFILE_AGE: 'Âge',
  PROFILE_BMI: 'Catégorie d’IMC',
  PROFILE_BMI_UNDER: 'Insuffisance pondérale',
  PROFILE_BMI_NORMAL: 'Poids normal',
  PROFILE_BMI_OVER: 'Surpoids',
  PROFILE_BMI_OBESE: 'Obésité',
  PROFILE_POPULATION: 'Groupe de population',
  POP_WESTERN: 'Européen occidental',
  POP_EAST_ASIAN: "Asiatique de l'Est (Japon / Chine / Corée)",
  POP_SOUTH_ASIAN: 'Sud-asiatique',
  POP_HISPANIC: 'Hispanique / Latino-américain',
  POP_MIDDLE_EASTERN: 'Moyen-oriental',
  POP_SUB_SAHARAN: 'Africain subsaharien',
  POP_OTHER: 'Autre / non spécifié',
  PROFILE_MENOPAUSE: 'Statut ménopausique',
  MENO_PRE: 'Pré-ménopause',
  MENO_POST: 'Post-ménopause',

  WHY_LABEL: 'Pourquoi cette question ?',
  WHY_SEX:
    "Les valeurs sont légèrement plus élevées chez les hommes (~0,3 unité). Les seuils ne sont pas décalés mais l'effet est mentionné.",
  WHY_AGE:
    'Les plages pédiatriques diffèrent. Les jeunes adultes tendent légèrement plus bas et une dérive vers le haut est attendue après 65 ans.',
  WHY_BMI:
    'Un IMC élevé augmente la baseline attendue. Les plages de référence sont décalées vers le haut en surpoids/obésité.',
  WHY_POPULATION:
    "Les baselines de sensibilité à l'insuline diffèrent selon les groupes de population pour des raisons génétiques et métaboliques.",
  WHY_MENOPAUSE:
    'La physiologie post-ménopause peut légèrement augmenter les valeurs HOMA-IR normales ; les bornes supérieures sont légèrement relevées.',

  METHODOLOGY_BUTTON: 'Méthodologie et références',
  MODAL_CLOSE: 'Fermer',
  REFERENCES_HEADING: 'Références',
  REF_MATTHEWS_1985:
    'Matthews DR, Hosker JP, Rudenski AS, et al. Homeostasis model assessment : insulin resistance and β-cell function from fasting plasma glucose and insulin concentrations in man. Diabetologia. 1985.',
  REF_LEVY_1998:
    'Levy JC, Matthews DR, Hermans MP. Correct HOMA evaluation uses the computer program (HOMA2). Diabetes Care. 1998. — Calculateur HOMA d’Oxford OCDEM.',
  REF_KATZ_2000:
    'Katz A, Nambi SS, Mather K, et al. QUICKI — Quantitative insulin sensitivity check index. J Clin Endocrinol Metab. 2000.',
  REF_MATLI_2021:
    'Matli B et al. Intervalles de référence HOMA-IR dans une population allemande. CCLM. 2021.',
  REF_ICHIKAWA_2014:
    'Ichikawa T et al. Seuil japonais d’insulino-résistance (HOMA-IR ≥ 1.7). Internal Medicine. 2014.',
  REF_KNHANES:
    'Étude KNHANES (Corée) 2008–2010 — valeurs de référence HOMA-IR dans la population coréenne.',
  REF_EPIRCE:
    'Étude EPIRCE (Espagne) — distributions HOMA-IR par âge et sexe dans la population espagnole.',
  METHOD_HEADING: 'Méthodologie et limites',
  METHOD_BODY:
    'HOMA (Homeostatic Model Assessment) a été proposé par Matthews et al. en 1985. C’est un outil de dépistage, pas un test diagnostique. Les résultats dépendent du dosage d’insuline utilisé ; les seuils absolus varient entre laboratoires. Cet outil calcule :',
  METHOD_FORMULA_IR: 'HOMA-IR = insuline (µU/mL) × glycémie (mmol/L) / 22,5',
  METHOD_FORMULA_B: 'HOMA-%B = 20 × insuline / (glycémie mmol/L − 3,5)',
  METHOD_FORMULA_S: 'HOMA-%S = 100 / HOMA-IR',
  METHOD_FORMULA_QUICKI: 'QUICKI = 1 / (log₁₀(insuline) + log₁₀(glycémie mg/dL))',
  METHOD_LIMITATIONS:
    'Limites : HOMA suppose un état stationnaire à jeun, est moins fiable en diabète avancé et sensible à la variabilité des dosages. Toujours interpréter avec le contexte clinique.',
  METHOD_REFERENCE: 'Référence : Matthews DR et al., Diabetologia 1985.',

  PRIVACY_NOTE: 'Aucune donnée ne quitte votre appareil. Tous les calculs sont locaux.',
  DISCLAIMER:
    'Cet outil est à but éducatif et ne fournit ni avis médical, ni diagnostic, ni traitement.',

  EXPORT_FILENAME: 'resultats-homa.txt',
};
