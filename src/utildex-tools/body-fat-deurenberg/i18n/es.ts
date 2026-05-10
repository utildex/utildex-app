export default {
  WEIGHT_LABEL: 'Peso',
  HEIGHT_LABEL: 'Altura',
  WEIGHT_HINT: 'Ropa ligera, sin zapatos.',
  HEIGHT_HINT: 'Altura de pie, sin zapatos.',
  UNIT_KG: 'kg',
  UNIT_LB: 'lb',
  UNIT_CM: 'cm',
  UNIT_IN: 'in',
  UNIT_TOGGLE_WEIGHT: 'Unidad de peso',
  UNIT_TOGGLE_HEIGHT: 'Unidad de altura',

  PRIMARY_RESULT_LABEL: 'Grasa corporal',
  RESULT_HINT: 'Porcentaje de grasa corporal estimado (Deurenberg)',
  SECONDARY_RESULTS_LABEL: 'Composición',
  RESULT_PLACEHOLDER: '—',
  ENTER_ALL_HINT: 'Introduce peso, altura, sexo y edad para calcular.',
  BMI_LABEL: 'IMC',
  FAT_MASS_LABEL: 'Masa grasa',
  LEAN_MASS_LABEL: 'Masa magra',

  INTERPRETATION_HEADING: 'Interpretación',
  AXIS_LEFT_LABEL: 'Esencial',
  AXIS_RIGHT_LABEL: 'Obesidad',
  PROFILE_DEFAULTS_BADGE: 'Usando perfil por defecto',
  PROFILE_DEFAULTS_HINT_SHORT: 'Valores por defecto — personaliza para mayor precisión.',

  TIER_ESSENTIAL: 'Grasa esencial',
  TIER_ATHLETIC: 'Atletas',
  TIER_FITNESS: 'En forma',
  TIER_AVERAGE: 'Promedio',
  TIER_OBESE: 'Obesidad',

  SUMMARY_ESSENTIAL:
    'Tu grasa corporal estimada está en el rango esencial. Mantenerse así de bajo puede afectar a la salud.',
  SUMMARY_ATHLETIC: 'Tu grasa corporal estimada está en el rango de atletas entrenados.',
  SUMMARY_FITNESS:
    'Tu grasa corporal estimada está en el rango «en forma», propio de quienes hacen ejercicio regular.',
  SUMMARY_AVERAGE:
    'Tu grasa corporal estimada está en el rango promedio de la población adulta general.',
  SUMMARY_OBESE:
    'Tu grasa corporal estimada está en el rango de obesidad — considera comentarlo con un profesional sanitario.',

  NOTE_PEDIATRIC_FORMULA:
    'Se aplicó la fórmula pediátrica de Deurenberg (7–15 años). Las estimaciones en niños son menos precisas.',
  NOTE_VERY_YOUNG_BLOCKED:
    'Las fórmulas de Deurenberg no están validadas por debajo de los 7 años.',
  NOTE_OLDER_ADULT:
    'Por encima de ~75 años, los cambios en la composición corporal pueden reducir la precisión de la fórmula.',
  NOTE_ETHNICITY:
    'Las ecuaciones de Deurenberg se desarrollaron en cohortes mayoritariamente europeas; la precisión varía según la etnia y la complexión atlética.',

  PROFILE_HEADING: 'Tu perfil',
  PROFILE_SEX: 'Sexo',
  PROFILE_SEX_FEMALE: 'Mujer',
  PROFILE_SEX_MALE: 'Hombre',
  PROFILE_AGE: 'Edad',

  WHY_SEX:
    'Con el mismo IMC, las mujeres tienen en promedio ~10 puntos más de grasa corporal que los hombres; las fórmulas lo tienen en cuenta.',
  WHY_AGE:
    'Con el mismo IMC, la grasa corporal tiende a aumentar con la edad mientras disminuye la masa muscular; la fórmula se ajusta por edad.',

  METHODOLOGY_BUTTON: 'Metodología y referencias',
  MODAL_CLOSE: 'Cerrar',
  METHOD_HEADING: 'Metodología y limitaciones',
  METHOD_BODY:
    'Deurenberg et al. (1991) desarrollaron ecuaciones de regresión que relacionan el porcentaje de grasa corporal con IMC, edad y sexo, validadas mediante densitometría. La variante pediátrica (7–15 años) utiliza coeficientes diferentes.',
  METHOD_FORMULA_ADULT:
    'Adultos: %GC = 1,20·IMC + 0,23·edad − 10,8·sexo − 5,4    (sexo: hombre = 1, mujer = 0)',
  METHOD_FORMULA_CHILD: 'Niños (7–15): %GC = 1,51·IMC − 0,70·edad − 3,6·sexo + 1,4',
  METHOD_LIMITATIONS:
    'Limitaciones: estas ecuaciones explican ~70–80 % de la varianza de la grasa corporal, con un error típico de ±4 %. La precisión disminuye en deportistas muy delgados (sobreestima la grasa), personas muy musculosas, personas con obesidad importante, personas mayores y grupos étnicos fuera de la cohorte original. Para decisiones clínicas, prefiere DEXA o pletismografía.',

  REFERENCES_HEADING: 'Referencias',
  REF_DEURENBERG_1991:
    'Deurenberg P, Weststrate JA, Seidell JC. Body mass index as a measure of body fatness: age- and sex-specific prediction formulas. Br J Nutr. 1991;65(2):105–14.',
  REF_DEURENBERG_1998:
    'Deurenberg P, Yap M, van Staveren WA. Body mass index and percent body fat: a meta-analysis among different ethnic groups. Int J Obes. 1998;22(12):1164–71.',
  REF_GALLAGHER_2000:
    'Gallagher D et al. Healthy percentage body fat ranges: an approach for developing guidelines based on body mass index. Am J Clin Nutr. 2000;72(3):694–701.',

  PRIVACY_NOTE: 'Ningún dato sale de tu dispositivo. Todos los cálculos se realizan localmente.',
  DISCLAIMER:
    'Esta herramienta tiene fines educativos y no proporciona consejo médico, diagnóstico ni tratamiento.',

  EXPORT_FILENAME: 'grasa-corporal-deurenberg.txt',
};
