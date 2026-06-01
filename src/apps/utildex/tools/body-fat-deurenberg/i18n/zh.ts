export default {
  WEIGHT_LABEL: '体重',
  HEIGHT_LABEL: '身高',
  WEIGHT_HINT: '轻便衣物，不穿鞋。',
  HEIGHT_HINT: '不穿鞋的站立身高。',
  UNIT_KG: '千克',
  UNIT_LB: '磅',
  UNIT_CM: '厘米',
  UNIT_IN: '英寸',
  UNIT_TOGGLE_WEIGHT: '体重单位',
  UNIT_TOGGLE_HEIGHT: '身高单位',

  PRIMARY_RESULT_LABEL: '体脂率',
  RESULT_HINT: '估算的体脂百分比（Deurenberg）',
  SECONDARY_RESULTS_LABEL: '身体成分',
  RESULT_PLACEHOLDER: '—',
  ENTER_ALL_HINT: '请输入体重、身高、性别和年龄以计算。',
  BMI_LABEL: 'BMI',
  FAT_MASS_LABEL: '脂肪量',
  LEAN_MASS_LABEL: '瘦体重',

  INTERPRETATION_HEADING: '解读',
  AXIS_LEFT_LABEL: '必需脂肪',
  AXIS_RIGHT_LABEL: '肥胖',
  PROFILE_DEFAULTS_BADGE: '使用默认资料',
  PROFILE_DEFAULTS_HINT_SHORT: '使用默认值——填写资料以提高准确度。',

  TIER_ESSENTIAL: '必需脂肪',
  TIER_ATHLETIC: '运动员',
  TIER_FITNESS: '健身水平',
  TIER_AVERAGE: '一般水平',
  TIER_OBESE: '肥胖',

  SUMMARY_ESSENTIAL: '您估算的体脂处于必需脂肪范围。长期过低可能影响健康。',
  SUMMARY_ATHLETIC: '您估算的体脂处于运动员水平，常见于训练有素者。',
  SUMMARY_FITNESS: '您估算的体脂处于健身水平，通常与规律运动相关。',
  SUMMARY_AVERAGE: '您估算的体脂处于成年人群体的平均范围。',
  SUMMARY_OBESE: '您估算的体脂处于肥胖范围——建议与临床医生讨论。',

  NOTE_PEDIATRIC_FORMULA: '已应用 Deurenberg 儿童公式（7–15 岁）。儿童估算精度较低。',
  NOTE_VERY_YOUNG_BLOCKED: 'Deurenberg 公式未在 7 岁以下验证。',
  NOTE_OLDER_ADULT: '约 75 岁以上，身体成分变化可能降低公式的准确性。',
  NOTE_ETHNICITY: 'Deurenberg 公式主要基于欧裔队列建立，准确性会因族裔与运动员体型而异。',

  PROFILE_HEADING: '您的资料',
  PROFILE_SEX: '性别',
  PROFILE_SEX_FEMALE: '女性',
  PROFILE_SEX_MALE: '男性',
  PROFILE_AGE: '年龄',

  WHY_SEX: '在相同 BMI 下，女性的体脂百分比平均比男性高约 10 个百分点，公式已考虑此差异。',
  WHY_AGE: '在相同 BMI 下，体脂随年龄增长而上升、肌肉量下降，公式按年龄进行调整。',

  METHODOLOGY_BUTTON: '方法学与参考文献',
  MODAL_CLOSE: '关闭',
  METHOD_HEADING: '方法与局限',
  METHOD_BODY:
    'Deurenberg 等人（1991）建立了将体脂百分比与 BMI、年龄、性别相关联的回归方程，并通过密度法进行了验证。儿童变体（7–15 岁）使用不同的系数。',
  METHOD_FORMULA_ADULT:
    '成人：体脂% = 1.20·BMI + 0.23·年龄 − 10.8·性别 − 5.4    （性别：男 = 1，女 = 0）',
  METHOD_FORMULA_CHILD: '儿童（7–15 岁）：体脂% = 1.51·BMI − 0.70·年龄 − 3.6·性别 + 1.4',
  METHOD_LIMITATIONS:
    '局限：方程可解释体脂方差的约 70–80%，典型误差约 ±4%。在极瘦运动员（高估体脂）、肌肉发达、严重肥胖、老年人及非原始队列族裔中精度下降。临床决策请优先使用 DEXA 或空气置换体积测量。',

  REFERENCES_HEADING: '参考文献',
  REF_DEURENBERG_1991:
    'Deurenberg P, Weststrate JA, Seidell JC. Body mass index as a measure of body fatness: age- and sex-specific prediction formulas. Br J Nutr. 1991;65(2):105–14.',
  REF_DEURENBERG_1998:
    'Deurenberg P, Yap M, van Staveren WA. Body mass index and percent body fat: a meta-analysis among different ethnic groups. Int J Obes. 1998;22(12):1164–71.',
  REF_GALLAGHER_2000:
    'Gallagher D 等。Healthy percentage body fat ranges: an approach for developing guidelines based on body mass index。Am J Clin Nutr。2000;72(3):694–701。',

  PRIVACY_NOTE: '数据不会离开您的设备，所有计算均在本地完成。',
  DISCLAIMER: '本工具仅供教育用途，不构成医疗建议、诊断或治疗。',

  EXPORT_FILENAME: '体脂-deurenberg.txt',
};
