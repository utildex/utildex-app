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
  SECONDARY_RESULTS_LABEL: 'Composici├│n',
  RESULT_PLACEHOLDER: 'ÔÇö',
  ENTER_ALL_HINT: 'Introduce peso, altura, sexo y edad para calcular.',
  BMI_LABEL: 'IMC',
  FAT_MASS_LABEL: 'Masa grasa',
  LEAN_MASS_LABEL: 'Masa magra',

  INTERPRETATION_HEADING: 'Interpretaci├│n',
  AXIS_LEFT_LABEL: 'Esencial',
  AXIS_RIGHT_LABEL: 'Obesidad',
  PROFILE_DEFAULTS_BADGE: 'Usando perfil por defecto',
  PROFILE_DEFAULTS_HINT_SHORT: 'Valores por defecto ÔÇö personaliza para mayor precisi├│n.',

  TIER_ESSENTIAL: 'Grasa esencial',
  TIER_ATHLETIC: 'Atletas',
  TIER_FITNESS: 'En forma',
  TIER_AVERAGE: 'Promedio',
  TIER_OBESE: 'Obesidad',

  SUMMARY_ESSENTIAL:
    'Tu grasa corporal estimada est├í en el rango esencial. Mantenerse as├¡ de bajo puede afectar a la salud.',
  SUMMARY_ATHLETIC: 'Tu grasa corporal estimada est├í en el rango de atletas entrenados.',
  SUMMARY_FITNESS:
    'Tu grasa corporal estimada est├í en el rango ┬½en forma┬╗, propio de quienes hacen ejercicio regular.',
  SUMMARY_AVERAGE:
    'Tu grasa corporal estimada est├í en el rango promedio de la poblaci├│n adulta general.',
  SUMMARY_OBESE:
    'Tu grasa corporal estimada est├í en el rango de obesidad ÔÇö considera comentarlo con un profesional sanitario.',

  NOTE_PEDIATRIC_FORMULA:
    'Se aplic├│ la f├│rmula pedi├ítrica de Deurenberg (7ÔÇô15 a├▒os). Las estimaciones en ni├▒os son menos precisas.',
  NOTE_VERY_YOUNG_BLOCKED:
    'Las f├│rmulas de Deurenberg no est├ín validadas por debajo de los 7 a├▒os.',
  NOTE_OLDER_ADULT:
    'Por encima de ~75 a├▒os, los cambios en la composici├│n corporal pueden reducir la precisi├│n de la f├│rmula.',
  NOTE_ETHNICITY:
    'Las ecuaciones de Deurenberg se desarrollaron en cohortes mayoritariamente europeas; la precisi├│n var├¡a seg├║n la etnia y la complexi├│n atl├®tica.',

  PROFILE_HEADING: 'Tu perfil',
  PROFILE_SEX: 'Sexo',
  PROFILE_SEX_FEMALE: 'Mujer',
  PROFILE_SEX_MALE: 'Hombre',
  PROFILE_AGE: 'Edad',

  WHY_SEX:
    'Con el mismo IMC, las mujeres tienen en promedio ~10 puntos m├ís de grasa corporal que los hombres; las f├│rmulas lo tienen en cuenta.',
  WHY_AGE:
    'Con el mismo IMC, la grasa corporal tiende a aumentar con la edad mientras disminuye la masa muscular; la f├│rmula se ajusta por edad.',

  METHODOLOGY_BUTTON: 'Metodolog├¡a y referencias',
  MODAL_CLOSE: 'Cerrar',
  METHOD_HEADING: 'Metodolog├¡a y limitaciones',
  METHOD_BODY:
    'Deurenberg et al. (1991) desarrollaron ecuaciones de regresi├│n que relacionan el porcentaje de grasa corporal con IMC, edad y sexo, validadas mediante densitometr├¡a. La variante pedi├ítrica (7ÔÇô15 a├▒os) utiliza coeficientes diferentes.',
  METHOD_FORMULA_ADULT:
    'Adultos: %GC = 1,20┬ÀIMC + 0,23┬Àedad ÔêÆ 10,8┬Àsexo ÔêÆ 5,4    (sexo: hombre = 1, mujer = 0)',
  METHOD_FORMULA_CHILD: 'Ni├▒os (7ÔÇô15): %GC = 1,51┬ÀIMC ÔêÆ 0,70┬Àedad ÔêÆ 3,6┬Àsexo + 1,4',
  METHOD_LIMITATIONS:
    'Limitaciones: estas ecuaciones explican ~70ÔÇô80 % de la varianza de la grasa corporal, con un error t├¡pico de ┬▒4 %. La precisi├│n disminuye en deportistas muy delgados (sobreestima la grasa), personas muy musculosas, personas con obesidad importante, personas mayores y grupos ├®tnicos fuera de la cohorte original. Para decisiones cl├¡nicas, prefiere DEXA o pletismograf├¡a.',

  REFERENCES_HEADING: 'Referencias',
  REF_DEURENBERG_1991:
    'Deurenberg P, Weststrate JA, Seidell JC. Body mass index as a measure of body fatness: age- and sex-specific prediction formulas. Br J Nutr. 1991;65(2):105ÔÇô14.',
  REF_DEURENBERG_1998:
    'Deurenberg P, Yap M, van Staveren WA. Body mass index and percent body fat: a meta-analysis among different ethnic groups. Int J Obes. 1998;22(12):1164ÔÇô71.',
  REF_GALLAGHER_2000:
    'Gallagher D et al. Healthy percentage body fat ranges: an approach for developing guidelines based on body mass index. Am J Clin Nutr. 2000;72(3):694ÔÇô701.',

  PRIVACY_NOTE: 'Ning├║n dato sale de tu dispositivo. Todos los c├ílculos se realizan localmente.',
  DISCLAIMER:
    'Esta herramienta tiene fines educativos y no proporciona consejo m├®dico, diagn├│stico ni tratamiento.',

  EXPORT_FILENAME: 'grasa-corporal-deurenberg.txt',
};
