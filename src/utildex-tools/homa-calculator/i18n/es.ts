export default {
  METHOD_LABEL: 'Metodo de calculo',
  METHOD_HOMA_IR: 'HOMA-IR',
  METHOD_HOMA_B: 'HOMA-%B',
  METHOD_HOMA_S: 'HOMA-%S',
  METHOD_QUICKI: 'QUICKI',
  METHOD_HOMA_IR_HINT: 'Indice de resistencia a la insulina',
  METHOD_HOMA_B_HINT: 'Funcion de las celulas beta',
  METHOD_HOMA_S_HINT: 'Sensibilidad a la insulina',
  METHOD_QUICKI_HINT: 'Verificacion cuantitativa de sensibilidad a la insulina',

  CLINICAL_HEADING: 'Datos clinicos',
  GLUCOSE_LABEL: 'Glucosa en ayunas',
  INSULIN_LABEL: 'Insulina en ayunas',
  INSULIN_UNIT: 'µU/mL (mIU/L)',
  UNIT_MGDL: 'mg/dL',
  UNIT_MMOL: 'mmol/L',
  UNIT_TOGGLE_LABEL: 'Unidad de glucosa',
  CONVERTED_PREFIX: '=',

  PRIMARY_RESULT_LABEL: 'Resultado principal',
  SECONDARY_RESULTS_LABEL: 'Otros indices',
  RESULT_PLACEHOLDER: '—',
  ENTER_BOTH_HINT: 'Introduce glucosa e insulina para calcular.',
  GLUCOSE_TOO_LOW: 'Valor de glucosa demasiado bajo para calcular la funcion de celulas beta.',

  INTERPRETATION_HEADING: 'Interpretacion',
  INTERPRETATION_BASED_ON: 'Basada en:',
  PROFILE_DEFAULTS_BADGE: 'Usando perfil por defecto',
  PROFILE_DEFAULTS_HINT:
    'Estos son valores por defecto: introduce tu perfil para una interpretacion personalizada.',
  PROFILE_DEFAULTS_HINT_SHORT: 'Valores por defecto — personaliza para mayor precision.',
  AXIS_LEFT_LABEL: 'Optimo',
  AXIS_RIGHT_LABEL: 'Elevado',
  TIER_OPTIMAL: 'Optimo',
  TIER_NORMAL: 'Normal',
  TIER_MILD: 'Levemente elevado',
  TIER_ELEVATED: 'Elevado',
  TIER_HIGH: 'Muy elevado',
  QUICKI_TIER_OPTIMAL: 'Sensibilidad alta',
  QUICKI_TIER_NORMAL: 'Sensibilidad normal',
  QUICKI_TIER_REDUCED: 'Resistencia a la insulina probable',

  IR_SUMMARY_OPTIMAL:
    'Tu resultado se encuentra en el rango optimo para tu perfil, lo que sugiere buena sensibilidad a la insulina.',
  IR_SUMMARY_NORMAL: 'Tu resultado se encuentra en el rango normal para tu perfil.',
  IR_SUMMARY_MILD:
    'Tu resultado sugiere una resistencia levemente elevada. Cambios en el estilo de vida suelen devolverlo al rango normal.',
  IR_SUMMARY_ELEVATED:
    'Tu resultado sugiere resistencia a la insulina elevada — considera comentarlo con un profesional clinico.',
  IR_SUMMARY_HIGH:
    'Tu resultado sugiere una resistencia a la insulina alta — recomendamos comentarlo con un profesional clinico.',

  QUICKI_SUMMARY_OPTIMAL: 'Tu QUICKI sugiere alta sensibilidad a la insulina.',
  QUICKI_SUMMARY_NORMAL: 'Tu QUICKI esta dentro del rango de sensibilidad normal.',
  QUICKI_SUMMARY_REDUCED:
    'Tu QUICKI sugiere sensibilidad reducida — considera comentarlo con un profesional clinico.',

  HOMA_B_NOTE:
    '100% representa la funcion beta normal en un adulto joven sano. Por debajo: funcion reducida; por encima: posible hipersecrecion compensatoria.',
  HOMA_S_NOTE: '100% representa sensibilidad normal a la insulina. Cuanto mas alto, mejor.',

  NOTE_BMI_ADJUSTED: 'Los rangos de referencia se ajustan a tu categoria de IMC.',
  NOTE_POSTMENO_ADJUSTED:
    'Los limites superiores se elevan ligeramente para fisiologia post-menopausia.',
  NOTE_POPULATION_FALLBACK:
    'Los datos especificos para este grupo son limitados; se usan los rangos europeos como respaldo.',
  NOTE_PEDIATRIC_BLOCKED:
    'La interpretacion pediatrica requiere tablas de referencia por edad/sexo no implementadas en esta herramienta.',
  NOTE_YOUNG_ADULT:
    'Los valores pueden ser ligeramente menores que la referencia adulta antes de los 25 anos.',
  NOTE_OLDER_ADULT:
    'Es esperable una leve deriva al alza con la edad; la interpretacion es menos precisa por encima de 65.',
  NOTE_PROFILE_CHANGED:
    'Tu puntuacion no cambio, pero el rango de referencia para tu perfil es diferente.',

  PROFILE_HEADING: 'Tu perfil',
  PROFILE_TOGGLE_SHOW: 'Mostrar perfil',
  PROFILE_TOGGLE_HIDE: 'Ocultar perfil',
  PROFILE_SEX: 'Sexo',
  PROFILE_SEX_FEMALE: 'Femenino',
  PROFILE_SEX_MALE: 'Masculino',
  PROFILE_AGE: 'Edad',
  PROFILE_BMI: 'Categoria de IMC',
  PROFILE_BMI_UNDER: 'Bajo peso',
  PROFILE_BMI_NORMAL: 'Peso normal',
  PROFILE_BMI_OVER: 'Sobrepeso',
  PROFILE_BMI_OBESE: 'Obesidad',
  PROFILE_POPULATION: 'Grupo poblacional',
  POP_WESTERN: 'Europeo occidental',
  POP_EAST_ASIAN: 'Asia oriental (Japon / China / Corea)',
  POP_SOUTH_ASIAN: 'Sur de Asia',
  POP_HISPANIC: 'Hispano / Latinoamericano',
  POP_MIDDLE_EASTERN: 'Oriente Medio',
  POP_SUB_SAHARAN: 'Africa subsahariana',
  POP_OTHER: 'Otro / no especificado',
  PROFILE_MENOPAUSE: 'Estado menopausico',
  MENO_PRE: 'Pre-menopausia',
  MENO_POST: 'Post-menopausia',

  WHY_LABEL: '¿Por que preguntamos?',
  WHY_SEX:
    'Los valores tienden a ser ligeramente mas altos en hombres (~0.3 unidades). No se decalan los umbrales pero se reconoce el efecto.',
  WHY_AGE:
    'Los rangos pediatricos difieren. Los adultos jovenes tienden a valores algo mas bajos y se espera una leve subida tras los 65.',
  WHY_BMI:
    'Un IMC alto eleva la baseline esperada. Los rangos se desplazan hacia arriba en sobrepeso/obesidad.',
  WHY_POPULATION:
    'La sensibilidad a la insulina baseline difiere entre grupos poblacionales por factores geneticos y metabolicos.',
  WHY_MENOPAUSE:
    'La fisiologia post-menopausia puede elevar levemente el HOMA-IR normal; los limites superiores se ajustan.',

  METHODOLOGY_BUTTON: 'Metodologia y referencias',
  MODAL_CLOSE: 'Cerrar',
  REFERENCES_HEADING: 'Referencias',
  REF_MATTHEWS_1985:
    'Matthews DR, Hosker JP, Rudenski AS, et al. Homeostasis model assessment: insulin resistance and β-cell function from fasting plasma glucose and insulin concentrations in man. Diabetologia. 1985.',
  REF_LEVY_1998:
    'Levy JC, Matthews DR, Hermans MP. Correct HOMA evaluation uses the computer program (HOMA2). Diabetes Care. 1998. — Calculadora HOMA de Oxford OCDEM.',
  REF_KATZ_2000:
    'Katz A, Nambi SS, Mather K, et al. QUICKI — Quantitative insulin sensitivity check index. J Clin Endocrinol Metab. 2000.',
  REF_MATLI_2021:
    'Matli B et al. Intervalos de referencia HOMA-IR en una poblacion alemana. CCLM. 2021.',
  REF_ICHIKAWA_2014:
    'Ichikawa T et al. Punto de corte japones para resistencia a la insulina (HOMA-IR ≥ 1.7). Internal Medicine. 2014.',
  REF_KNHANES:
    'Estudio KNHANES (Corea) 2008–2010 — valores de referencia HOMA-IR en la poblacion coreana.',
  REF_EPIRCE:
    'Estudio EPIRCE (Espana) — distribuciones de HOMA-IR por edad y sexo en la poblacion espanola.',
  METHOD_HEADING: 'Metodologia y limitaciones',
  METHOD_BODY:
    'HOMA (Homeostatic Model Assessment) fue propuesto por Matthews et al. en 1985. Es una herramienta de cribado, no diagnostica. Los resultados dependen del ensayo de insulina; los puntos de corte varian entre laboratorios. Esta herramienta calcula:',
  METHOD_FORMULA_IR: 'HOMA-IR = insulina (µU/mL) × glucosa (mmol/L) / 22.5',
  METHOD_FORMULA_B: 'HOMA-%B = 20 × insulina / (glucosa mmol/L − 3.5)',
  METHOD_FORMULA_S: 'HOMA-%S = 100 / HOMA-IR',
  METHOD_FORMULA_QUICKI: 'QUICKI = 1 / (log₁₀(insulina) + log₁₀(glucosa mg/dL))',
  METHOD_LIMITATIONS:
    'Limitaciones: HOMA asume estado estacionario en ayunas, rinde peor en diabetes avanzada y es sensible a la variabilidad del ensayo. Interpreta siempre con el contexto clinico.',
  METHOD_REFERENCE: 'Referencia: Matthews DR et al., Diabetologia 1985.',

  PRIVACY_NOTE: 'Ningun dato sale de tu dispositivo. Todos los calculos se ejecutan localmente.',
  DISCLAIMER:
    'Esta herramienta es educativa y no proporciona consejo medico, diagnostico ni tratamiento.',

  EXPORT_FILENAME: 'resultados-homa.txt',
};
