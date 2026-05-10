export default {
  HEIGHT_LABEL: '身高',
  WEIGHT_LABEL: '体重',
  UNIT_CM: '厘米',
  UNIT_IN: '英寸',
  UNIT_KG: '千克',
  UNIT_LB: '磅',
  UNIT_TOGGLE_HEIGHT: '身高单位',
  UNIT_TOGGLE_WEIGHT: '体重单位',
  CONVERTED_PREFIX: '=',

  STANDARD_LABEL: '参考标准',
  STANDARD_WHO: 'WHO（国际）',
  STANDARD_ASIA_PACIFIC: 'WHO 亚太',

  PRIMARY_RESULT_LABEL: 'BMI',
  RESULT_HINT: '身体质量指数（kg/m²）',
  SECONDARY_RESULTS_LABEL: '附加信息',
  HEALTHY_RANGE_LABEL: '健康体重范围',
  RESULT_PLACEHOLDER: '—',
  ENTER_BOTH_HINT: '请输入身高和体重以计算。',

  INTERPRETATION_HEADING: '解读',
  AXIS_LEFT_LABEL: '偏瘦',
  AXIS_RIGHT_LABEL: '肥胖',
  PROFILE_DEFAULTS_BADGE: '使用默认资料',
  PROFILE_DEFAULTS_HINT_SHORT: '使用默认值——填写资料以提高准确度。',

  TIER_UNDERWEIGHT: '体重过轻',
  TIER_NORMAL: '正常体重',
  TIER_OVERWEIGHT: '超重',
  TIER_OBESE_I: 'I 级肥胖',
  TIER_OBESE_II: 'II 级肥胖',
  TIER_OBESE_III: 'III 级肥胖',

  SUMMARY_UNDERWEIGHT: '您的 BMI 低于健康范围，建议与临床医生讨论。',
  SUMMARY_NORMAL: '您的 BMI 处于所选标准的健康范围内。',
  SUMMARY_OVERWEIGHT: '您的 BMI 高于健康范围，调整生活方式通常可回到范围内。',
  SUMMARY_OBESE_I: '您的 BMI 提示 I 级肥胖——建议与临床医生讨论。',
  SUMMARY_OBESE_II: '您的 BMI 提示 II 级肥胖——建议与临床医生讨论。',
  SUMMARY_OBESE_III: '您的 BMI 提示 III 级肥胖——建议与临床医生讨论。',

  NOTE_ASIA_PACIFIC: '已使用 WHO 亚太切点（超重 ≥ 23，肥胖 ≥ 27.5）。',
  NOTE_PEDIATRIC_BLOCKED: '儿童与青少年的解读需要按年龄与性别的百分位数，本工具未实现。',
  NOTE_OLDER_ADULT: '65 岁以上 BMI 准确性下降；肌肉流失与体成分变化会影响解读。',
  NOTE_ATHLETE_CAVEAT: 'BMI 不区分肌肉与脂肪，肌肉发达者可能被高估脂肪比例。',

  PROFILE_HEADING: '您的资料',
  PROFILE_SEX: '性别',
  PROFILE_SEX_FEMALE: '女性',
  PROFILE_SEX_MALE: '男性',
  PROFILE_AGE: '年龄',
  PROFILE_STANDARD: '标准',

  WHY_SEX: '性别不改变成人 BMI 切点，但影响体成分解读；女性必需脂肪含量高于男性。',
  WHY_AGE: 'BMI 切点仅适用于成人。65 岁后体成分变化使准确性降低。',
  WHY_STANDARD: 'WHO 亚太切点（超重 ≥ 23，肥胖 ≥ 27.5）更能反映东亚与南亚人群的心血管代谢风险。',

  METHODOLOGY_BUTTON: '方法学与参考文献',
  MODAL_CLOSE: '关闭',
  METHOD_HEADING: '方法与局限',
  METHOD_BODY:
    'BMI 由 19 世纪的 Adolphe Quetelet 普及，并被 WHO 采用为人群层面的筛查工具。它是筛查指标，而非诊断检验。同样的 BMI 在不同年龄、性别、种族和体能水平下可能对应不同的体脂百分比。',
  METHOD_FORMULA: 'BMI = 体重 (kg) / 身高 (m)²',
  METHOD_LIMITATIONS:
    '局限：BMI 不衡量体成分。在肌肉发达者中可能高估脂肪量，在肌少症的老年人中可能低估。请始终结合临床背景解读。',

  REFERENCES_HEADING: '参考文献',
  REF_WHO_2000: 'WHO。预防和管理全球肥胖流行。技术报告系列 894，2000。',
  REF_WHO_ASIA_2004:
    'WHO 专家咨询。亚洲人群适宜的身体质量指数及其对政策和干预策略的影响。The Lancet，2004。',
  REF_NHLBI: 'NHLBI 成人超重与肥胖识别、评估和治疗临床指南，1998。',

  PRIVACY_NOTE: '数据不会离开您的设备，所有计算均在本地完成。',
  DISCLAIMER: '本工具仅供教育用途，不构成医疗建议、诊断或治疗。',

  EXPORT_FILENAME: 'bmi-结果.txt',
};
