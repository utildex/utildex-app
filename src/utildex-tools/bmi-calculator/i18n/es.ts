export default {
  HEIGHT_LABEL: 'Altura',
  WEIGHT_LABEL: 'Peso',
  UNIT_CM: 'cm',
  UNIT_IN: 'in',
  UNIT_KG: 'kg',
  UNIT_LB: 'lb',
  UNIT_TOGGLE_HEIGHT: 'Unidad de altura',
  UNIT_TOGGLE_WEIGHT: 'Unidad de peso',
  CONVERTED_PREFIX: '=',

  STANDARD_LABEL: 'Estándar de referencia',
  STANDARD_WHO: 'OMS (internacional)',
  STANDARD_ASIA_PACIFIC: 'OMS Asia-Pacífico',

  PRIMARY_RESULT_LABEL: 'IMC',
  RESULT_HINT: 'Índice de masa corporal (kg/m²)',
  SECONDARY_RESULTS_LABEL: 'Información adicional',
  HEALTHY_RANGE_LABEL: 'Rango de peso saludable',
  RESULT_PLACEHOLDER: '—',
  ENTER_BOTH_HINT: 'Introduce tu altura y tu peso para calcular.',

  INTERPRETATION_HEADING: 'Interpretación',
  AXIS_LEFT_LABEL: 'Bajo peso',
  AXIS_RIGHT_LABEL: 'Obesidad',
  PROFILE_DEFAULTS_BADGE: 'Usando perfil por defecto',
  PROFILE_DEFAULTS_HINT_SHORT: 'Valores por defecto — personaliza para mayor precisión.',

  TIER_UNDERWEIGHT: 'Bajo peso',
  TIER_NORMAL: 'Peso normal',
  TIER_OVERWEIGHT: 'Sobrepeso',
  TIER_OBESE_I: 'Obesidad de clase I',
  TIER_OBESE_II: 'Obesidad de clase II',
  TIER_OBESE_III: 'Obesidad de clase III',

  SUMMARY_UNDERWEIGHT:
    'Tu IMC está por debajo del rango saludable. Considera comentarlo con un profesional sanitario.',
  SUMMARY_NORMAL: 'Tu IMC se encuentra dentro del rango saludable para el estándar elegido.',
  SUMMARY_OVERWEIGHT:
    'Tu IMC está por encima del rango saludable. Cambios en el estilo de vida suelen permitir volver al rango.',
  SUMMARY_OBESE_I:
    'Tu IMC indica obesidad de clase I — considera comentarlo con un profesional sanitario.',
  SUMMARY_OBESE_II:
    'Tu IMC indica obesidad de clase II — recomendamos comentarlo con un profesional sanitario.',
  SUMMARY_OBESE_III:
    'Tu IMC indica obesidad de clase III — recomendamos comentarlo con un profesional sanitario.',

  NOTE_ASIA_PACIFIC:
    'Aplicando puntos de corte OMS Asia-Pacífico (sobrepeso ≥ 23, obesidad ≥ 27,5).',
  NOTE_PEDIATRIC_BLOCKED:
    'La interpretación pediátrica requiere percentiles específicos por edad y sexo, no implementados aquí.',
  NOTE_OLDER_ADULT:
    'El IMC es menos preciso por encima de los 65 años; la pérdida muscular y los cambios en la composición corporal afectan a la interpretación.',
  NOTE_ATHLETE_CAVEAT:
    'El IMC no distingue masa muscular de masa grasa y puede sobreestimar la adiposidad en personas muy musculadas.',

  PROFILE_HEADING: 'Tu perfil',
  PROFILE_SEX: 'Sexo',
  PROFILE_SEX_FEMALE: 'Mujer',
  PROFILE_SEX_MALE: 'Hombre',
  PROFILE_AGE: 'Edad',
  PROFILE_STANDARD: 'Estándar',

  WHY_SEX:
    'El sexo no cambia los puntos de corte de IMC en adultos pero afecta a la interpretación de la composición corporal; las mujeres tienen más grasa esencial que los hombres.',
  WHY_AGE:
    'Los puntos de corte de IMC se aplican solo a adultos. A partir de los 65 años los cambios de composición corporal reducen la precisión.',
  WHY_STANDARD:
    'Los puntos de corte OMS Asia-Pacífico (sobrepeso ≥ 23, obesidad ≥ 27,5) reflejan mejor el riesgo cardiometabólico en poblaciones del Este y Sur de Asia.',

  METHODOLOGY_BUTTON: 'Metodología y referencias',
  MODAL_CLOSE: 'Cerrar',
  METHOD_HEADING: 'Metodología y limitaciones',
  METHOD_BODY:
    'El IMC fue popularizado por Adolphe Quetelet en el siglo XIX y adoptado por la OMS como herramienta de cribado a escala poblacional. Es un índice de cribado, no una prueba diagnóstica. Un mismo IMC puede corresponder a porcentajes de masa grasa muy distintos según edad, sexo, etnicidad y condición física.',
  METHOD_FORMULA: 'IMC = peso (kg) / altura (m)²',
  METHOD_LIMITATIONS:
    'Limitaciones: el IMC no mide la composición corporal. Puede sobreestimar la adiposidad en personas musculosas y subestimarla en personas mayores con sarcopenia. Interpreta siempre con el contexto clínico.',

  REFERENCES_HEADING: 'Referencias',
  REF_WHO_2000:
    'OMS. Obesidad: prevención y manejo de la epidemia mundial. Serie de Informes Técnicos 894. 2000.',
  REF_WHO_ASIA_2004:
    'WHO Expert Consultation. Appropriate body-mass index for Asian populations and its implications for policy and intervention strategies. The Lancet. 2004.',
  REF_NHLBI:
    'NHLBI Clinical Guidelines on the Identification, Evaluation, and Treatment of Overweight and Obesity in Adults. 1998.',

  PRIVACY_NOTE: 'Ningún dato sale de tu dispositivo. Todos los cálculos se realizan localmente.',
  DISCLAIMER:
    'Esta herramienta tiene fines educativos y no proporciona consejo médico, diagnóstico ni tratamiento.',

  EXPORT_FILENAME: 'resultado-imc.txt',
};
