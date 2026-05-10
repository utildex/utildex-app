export default {
  HIP_LABEL: 'Cadera',
  HEIGHT_LABEL: 'Altura',
  HIP_HINT: 'Mide en la parte más ancha de los glúteos.',
  HEIGHT_HINT: 'Altura de pie, sin zapatos.',
  UNIT_CM: 'cm',
  UNIT_IN: 'in',
  UNIT_TOGGLE_HIP: 'Unidad de cadera',
  UNIT_TOGGLE_HEIGHT: 'Unidad de altura',
  CONVERTED_PREFIX: '=',

  PRIMARY_RESULT_LABEL: 'IAC',
  RESULT_HINT: 'Índice de Adiposidad Corporal (estimación del % de grasa corporal)',
  SECONDARY_RESULTS_LABEL: 'Información adicional',
  RESULT_PLACEHOLDER: '—',
  ENTER_BOTH_HINT: 'Introduce tu circunferencia de cadera y tu altura para calcular.',

  INTERPRETATION_HEADING: 'Interpretación',
  AXIS_LEFT_LABEL: 'Bajo peso',
  AXIS_RIGHT_LABEL: 'Obesidad',
  PROFILE_DEFAULTS_BADGE: 'Usando perfil por defecto',
  PROFILE_DEFAULTS_HINT_SHORT: 'Valores por defecto — personaliza para mayor precisión.',

  TIER_UNDERWEIGHT: 'Bajo peso',
  TIER_NORMAL: 'Normal',
  TIER_OVERWEIGHT: 'Sobrepeso',
  TIER_OBESE: 'Obesidad',

  SUMMARY_UNDERWEIGHT: 'Tu IAC está por debajo del rango saludable para tu sexo y tramo de edad.',
  SUMMARY_NORMAL: 'Tu IAC está dentro del rango saludable para tu sexo y tramo de edad.',
  SUMMARY_OVERWEIGHT:
    'Tu IAC está por encima del rango saludable. Cambios en el estilo de vida suelen ayudar.',
  SUMMARY_OBESE:
    'Tu IAC se sitúa en el rango de obesidad — considera comentarlo con un profesional sanitario.',

  NOTE_PEDIATRIC_BLOCKED: 'Los umbrales de IAC no están establecidos para niños y adolescentes.',
  NOTE_OLDER_ADULT:
    'Los umbrales de IAC por encima de ~80 años son extrapolados; interpreta con cautela.',
  NOTE_POPULATION:
    'Los umbrales de IAC se derivaron de una cohorte mexicano-americana; su generalización es discutida.',

  PROFILE_HEADING: 'Tu perfil',
  PROFILE_SEX: 'Sexo',
  PROFILE_SEX_FEMALE: 'Mujer',
  PROFILE_SEX_MALE: 'Hombre',
  PROFILE_AGE: 'Edad',

  WHY_SEX:
    'Los umbrales de IAC difieren entre mujeres y hombres porque la distribución y el porcentaje global de grasa varían según el sexo.',
  WHY_AGE:
    'Los umbrales de IAC están estratificados por tramo de edad (20–39, 40–59, 60–79). Por debajo de 18 años no están definidos.',

  METHODOLOGY_BUTTON: 'Metodología y referencias',
  MODAL_CLOSE: 'Cerrar',
  METHOD_HEADING: 'Metodología y limitaciones',
  METHOD_BODY:
    'El Índice de Adiposidad Corporal fue propuesto por Bergman et al. (2011) como una estimación del porcentaje de grasa corporal sin necesidad de pesar. Solo utiliza la circunferencia de cadera y la altura. Su principal atractivo es prescindir del peso, a veces poco práctico o poco fiable.',
  METHOD_FORMULA: 'IAC = cadera (cm) / altura (m)^1,5 − 18',
  METHOD_LIMITATIONS:
    'Limitaciones: el IAC se derivó de una sola cohorte étnica y ha mostrado precisión variable en estudios de validación posteriores. Varias comparaciones directas indican que el IMC junto con la circunferencia de cintura supera al IAC para predecir el porcentaje de grasa y el riesgo cardiometabólico. Interpreta siempre con el contexto clínico.',

  REFERENCES_HEADING: 'Referencias',
  REF_BERGMAN_2011:
    'Bergman RN et al. A better index of body adiposity. Obesity (Silver Spring). 2011.',
  REF_FREEDMAN_2012:
    'Freedman DS et al. The body adiposity index (hip circumference ÷ height^1.5) is not a more accurate measure of adiposity than BMI, waist circumference, or hip circumference. Obesity. 2012.',
  REF_LOPEZ_2012:
    'López-Alvarenga JC et al. Body adiposity index: a critical reappraisal. Obesity. 2012.',

  PRIVACY_NOTE: 'Ningún dato sale de tu dispositivo. Todos los cálculos se realizan localmente.',
  DISCLAIMER:
    'Esta herramienta tiene fines educativos y no proporciona consejo médico, diagnóstico ni tratamiento.',

  EXPORT_FILENAME: 'resultado-iac.txt',
};
