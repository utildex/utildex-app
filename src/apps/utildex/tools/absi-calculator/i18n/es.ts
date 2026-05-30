export default {
  WAIST_LABEL: 'Cintura',
  HEIGHT_LABEL: 'Altura',
  WEIGHT_LABEL: 'Peso',
  WAIST_HINT: 'Mide a medio camino entre la ├║ltima costilla y la cresta il├¡aca.',
  HEIGHT_HINT: 'Altura de pie, sin zapatos.',
  WEIGHT_HINT: 'Ropa ligera, sin zapatos.',
  UNIT_CM: 'cm',
  UNIT_IN: 'in',
  UNIT_KG: 'kg',
  UNIT_LB: 'lb',
  UNIT_TOGGLE_WAIST: 'Unidad de cintura',
  UNIT_TOGGLE_HEIGHT: 'Unidad de altura',
  UNIT_TOGGLE_WEIGHT: 'Unidad de peso',

  PRIMARY_RESULT_LABEL: 'Puntuaci├│n z de ABSI',
  RESULT_HINT: '├ìndice de forma ajustado por sexo y edad (riesgo de mortalidad)',
  SECONDARY_RESULTS_LABEL: 'Detalles',
  RESULT_PLACEHOLDER: 'ÔÇö',
  ENTER_ALL_HINT: 'Introduce cintura, altura, peso, sexo y edad para calcular.',
  ABSI_RAW_LABEL: 'ABSI',
  BMI_LABEL: 'IMC',

  INTERPRETATION_HEADING: 'Interpretaci├│n',
  AXIS_LEFT_LABEL: 'Riesgo muy bajo',
  AXIS_RIGHT_LABEL: 'Riesgo muy alto',
  PROFILE_DEFAULTS_BADGE: 'Usando perfil por defecto',
  PROFILE_DEFAULTS_HINT_SHORT: 'Valores por defecto ÔÇö personaliza para mayor precisi├│n.',

  TIER_VERYLOW: 'Riesgo muy bajo',
  TIER_LOW: 'Riesgo bajo',
  TIER_AVERAGE: 'Riesgo medio',
  TIER_HIGH: 'Riesgo alto',
  TIER_VERYHIGH: 'Riesgo muy alto',

  SUMMARY_VERYLOW:
    'Tu ABSI est├í claramente por debajo de la media para tu sexo y edad ÔÇö asociado al menor riesgo de mortalidad seg├║n este indicador.',
  SUMMARY_LOW:
    'Tu ABSI est├í por debajo de la media para tu sexo y edad ÔÇö asociado a un riesgo de mortalidad reducido.',
  SUMMARY_AVERAGE: 'Tu ABSI est├í cerca de la media poblacional para tu sexo y edad.',
  SUMMARY_HIGH:
    'Tu ABSI est├í por encima de la media para tu sexo y edad ÔÇö asociado a mayor riesgo de mortalidad, independientemente del IMC.',
  SUMMARY_VERYHIGH:
    'Tu ABSI est├í claramente por encima de la media para tu sexo y edad ÔÇö asociado al mayor riesgo de mortalidad seg├║n este indicador. Considera comentarlo con un profesional sanitario.',

  NOTE_PEDIATRIC_BLOCKED:
    'No existen referencias de la puntuaci├│n z de ABSI para ni├▒os y adolescentes.',
  NOTE_OLDER_ADULT:
    'Por encima de los ~80 a├▒os, los datos de referencia de ABSI son escasos; interpreta con cautela.',
  NOTE_POPULATION:
    'Los valores de referencia de ABSI provienen de adultos de EE. UU. (NHANES); el rendimiento puede variar en otras poblaciones.',

  PROFILE_HEADING: 'Tu perfil',
  PROFILE_SEX: 'Sexo',
  PROFILE_SEX_FEMALE: 'Mujer',
  PROFILE_SEX_MALE: 'Hombre',
  PROFILE_AGE: 'Edad',

  WHY_SEX:
    'Las distribuciones de ABSI difieren entre mujeres y hombres; la puntuaci├│n z usa medias y desviaciones t├¡picas espec├¡ficas del sexo.',
  WHY_AGE:
    'El ABSI tiende a aumentar con la edad. La puntuaci├│n z utiliza referencias por d├®cada de edad para aislar la forma corporal de los efectos de la edad.',

  METHODOLOGY_BUTTON: 'Metodolog├¡a y referencias',
  MODAL_CLOSE: 'Cerrar',
  METHOD_HEADING: 'Metodolog├¡a y limitaciones',
  METHOD_BODY:
    'Krakauer y Krakauer (2012) definieron el ABSI para captar la forma abdominal independientemente del tama├▒o corporal global. La puntuaci├│n z compara tu ABSI con los valores de referencia NHANES por sexo y d├®cada de edad; valores positivos indican un perfil m├ís cil├¡ndrico/abdominal, asociado a mayor riesgo de mortalidad por todas las causas, independientemente del IMC.',
  METHOD_FORMULA:
    'ABSI = CC(m) / (IMC^(2/3) ┬À altura(m)^(1/2))    con IMC = peso(kg) / altura(m)^2',
  METHOD_LIMITATIONS:
    'Limitaciones: el ABSI es una m├®trica de investigaci├│n ├║til sobre todo a nivel poblacional para la estratificaci├│n de mortalidad. No sustituye la evaluaci├│n cl├¡nica y las referencias proceden de adultos NHANES. Evita sobre-interpretar puntuaciones individuales pr├│ximas a la media.',

  REFERENCES_HEADING: 'Referencias',
  REF_KRAKAUER_2012:
    'Krakauer NY, Krakauer JC. A new body shape index predicts mortality hazard independently of body mass index. PLoS ONE. 2012;7(7):e39504.',
  REF_KRAKAUER_2014:
    'Krakauer NY, Krakauer JC. Dynamic association of mortality hazard with body shape. PLoS ONE. 2014;9(2):e88793.',
  REF_DHANA_2016:
    'Dhana K et al. Anthropometric measures in cardiovascular disease prediction: comparison of laboratory-based versus non-laboratory-based model. Heart. 2016;102(13):1023ÔÇô9.',

  PRIVACY_NOTE: 'Ning├║n dato sale de tu dispositivo. Todos los c├ílculos se realizan localmente.',
  DISCLAIMER:
    'Esta herramienta tiene fines educativos y no proporciona consejo m├®dico, diagn├│stico ni tratamiento.',

  EXPORT_FILENAME: 'resultado-absi.txt',
};
