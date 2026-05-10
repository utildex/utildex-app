export default {
  WAIST_LABEL: 'Cintura',
  HEIGHT_LABEL: 'Altura',
  WEIGHT_LABEL: 'Peso',
  WAIST_HINT: 'Mide a medio camino entre la última costilla y la cresta ilíaca.',
  HEIGHT_HINT: 'Altura de pie, sin zapatos.',
  WEIGHT_HINT: 'Ropa ligera, sin zapatos.',
  UNIT_CM: 'cm',
  UNIT_IN: 'in',
  UNIT_KG: 'kg',
  UNIT_LB: 'lb',
  UNIT_TOGGLE_WAIST: 'Unidad de cintura',
  UNIT_TOGGLE_HEIGHT: 'Unidad de altura',
  UNIT_TOGGLE_WEIGHT: 'Unidad de peso',

  PRIMARY_RESULT_LABEL: 'Puntuación z de ABSI',
  RESULT_HINT: 'Índice de forma ajustado por sexo y edad (riesgo de mortalidad)',
  SECONDARY_RESULTS_LABEL: 'Detalles',
  RESULT_PLACEHOLDER: '—',
  ENTER_ALL_HINT: 'Introduce cintura, altura, peso, sexo y edad para calcular.',
  ABSI_RAW_LABEL: 'ABSI',
  BMI_LABEL: 'IMC',

  INTERPRETATION_HEADING: 'Interpretación',
  AXIS_LEFT_LABEL: 'Riesgo muy bajo',
  AXIS_RIGHT_LABEL: 'Riesgo muy alto',
  PROFILE_DEFAULTS_BADGE: 'Usando perfil por defecto',
  PROFILE_DEFAULTS_HINT_SHORT: 'Valores por defecto — personaliza para mayor precisión.',

  TIER_VERYLOW: 'Riesgo muy bajo',
  TIER_LOW: 'Riesgo bajo',
  TIER_AVERAGE: 'Riesgo medio',
  TIER_HIGH: 'Riesgo alto',
  TIER_VERYHIGH: 'Riesgo muy alto',

  SUMMARY_VERYLOW:
    'Tu ABSI está claramente por debajo de la media para tu sexo y edad — asociado al menor riesgo de mortalidad según este indicador.',
  SUMMARY_LOW:
    'Tu ABSI está por debajo de la media para tu sexo y edad — asociado a un riesgo de mortalidad reducido.',
  SUMMARY_AVERAGE: 'Tu ABSI está cerca de la media poblacional para tu sexo y edad.',
  SUMMARY_HIGH:
    'Tu ABSI está por encima de la media para tu sexo y edad — asociado a mayor riesgo de mortalidad, independientemente del IMC.',
  SUMMARY_VERYHIGH:
    'Tu ABSI está claramente por encima de la media para tu sexo y edad — asociado al mayor riesgo de mortalidad según este indicador. Considera comentarlo con un profesional sanitario.',

  NOTE_PEDIATRIC_BLOCKED:
    'No existen referencias de la puntuación z de ABSI para niños y adolescentes.',
  NOTE_OLDER_ADULT:
    'Por encima de los ~80 años, los datos de referencia de ABSI son escasos; interpreta con cautela.',
  NOTE_POPULATION:
    'Los valores de referencia de ABSI provienen de adultos de EE. UU. (NHANES); el rendimiento puede variar en otras poblaciones.',

  PROFILE_HEADING: 'Tu perfil',
  PROFILE_SEX: 'Sexo',
  PROFILE_SEX_FEMALE: 'Mujer',
  PROFILE_SEX_MALE: 'Hombre',
  PROFILE_AGE: 'Edad',

  WHY_SEX:
    'Las distribuciones de ABSI difieren entre mujeres y hombres; la puntuación z usa medias y desviaciones típicas específicas del sexo.',
  WHY_AGE:
    'El ABSI tiende a aumentar con la edad. La puntuación z utiliza referencias por década de edad para aislar la forma corporal de los efectos de la edad.',

  METHODOLOGY_BUTTON: 'Metodología y referencias',
  MODAL_CLOSE: 'Cerrar',
  METHOD_HEADING: 'Metodología y limitaciones',
  METHOD_BODY:
    'Krakauer y Krakauer (2012) definieron el ABSI para captar la forma abdominal independientemente del tamaño corporal global. La puntuación z compara tu ABSI con los valores de referencia NHANES por sexo y década de edad; valores positivos indican un perfil más cilíndrico/abdominal, asociado a mayor riesgo de mortalidad por todas las causas, independientemente del IMC.',
  METHOD_FORMULA:
    'ABSI = CC(m) / (IMC^(2/3) · altura(m)^(1/2))    con IMC = peso(kg) / altura(m)^2',
  METHOD_LIMITATIONS:
    'Limitaciones: el ABSI es una métrica de investigación útil sobre todo a nivel poblacional para la estratificación de mortalidad. No sustituye la evaluación clínica y las referencias proceden de adultos NHANES. Evita sobre-interpretar puntuaciones individuales próximas a la media.',

  REFERENCES_HEADING: 'Referencias',
  REF_KRAKAUER_2012:
    'Krakauer NY, Krakauer JC. A new body shape index predicts mortality hazard independently of body mass index. PLoS ONE. 2012;7(7):e39504.',
  REF_KRAKAUER_2014:
    'Krakauer NY, Krakauer JC. Dynamic association of mortality hazard with body shape. PLoS ONE. 2014;9(2):e88793.',
  REF_DHANA_2016:
    'Dhana K et al. Anthropometric measures in cardiovascular disease prediction: comparison of laboratory-based versus non-laboratory-based model. Heart. 2016;102(13):1023–9.',

  PRIVACY_NOTE: 'Ningún dato sale de tu dispositivo. Todos los cálculos se realizan localmente.',
  DISCLAIMER:
    'Esta herramienta tiene fines educativos y no proporciona consejo médico, diagnóstico ni tratamiento.',

  EXPORT_FILENAME: 'resultado-absi.txt',
};
