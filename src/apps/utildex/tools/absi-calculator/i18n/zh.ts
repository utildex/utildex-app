export default {
  WAIST_LABEL: '腰围',
  HEIGHT_LABEL: '身高',
  WEIGHT_LABEL: '体重',
  WAIST_HINT: '在最低肋骨与髂嵴之间的中点处测量。',
  HEIGHT_HINT: '不穿鞋的站立身高。',
  WEIGHT_HINT: '轻便衣物，不穿鞋。',
  UNIT_CM: '厘米',
  UNIT_IN: '英寸',
  UNIT_KG: '千克',
  UNIT_LB: '磅',
  UNIT_TOGGLE_WAIST: '腰围单位',
  UNIT_TOGGLE_HEIGHT: '身高单位',
  UNIT_TOGGLE_WEIGHT: '体重单位',

  PRIMARY_RESULT_LABEL: 'ABSI z 分数',
  RESULT_HINT: '按性别与年龄校正的体型指数（死亡风险）',
  SECONDARY_RESULTS_LABEL: '详细信息',
  RESULT_PLACEHOLDER: '—',
  ENTER_ALL_HINT: '请输入腰围、身高、体重、性别与年龄以计算。',
  ABSI_RAW_LABEL: 'ABSI',
  BMI_LABEL: 'BMI',

  INTERPRETATION_HEADING: '解读',
  AXIS_LEFT_LABEL: '风险极低',
  AXIS_RIGHT_LABEL: '风险极高',
  PROFILE_DEFAULTS_BADGE: '使用默认资料',
  PROFILE_DEFAULTS_HINT_SHORT: '使用默认值——填写资料以提高准确度。',

  TIER_VERYLOW: '风险极低',
  TIER_LOW: '风险较低',
  TIER_AVERAGE: '平均风险',
  TIER_HIGH: '风险较高',
  TIER_VERYHIGH: '风险极高',

  SUMMARY_VERYLOW: '您的 ABSI 远低于同性别同年龄段的平均水平——按此指标对应最低死亡风险。',
  SUMMARY_LOW: '您的 ABSI 低于同性别同年龄段的平均水平——对应较低的死亡风险。',
  SUMMARY_AVERAGE: '您的 ABSI 接近同性别同年龄段的人群平均水平。',
  SUMMARY_HIGH: '您的 ABSI 高于同性别同年龄段的平均水平——独立于 BMI，对应升高的死亡风险。',
  SUMMARY_VERYHIGH:
    '您的 ABSI 远高于同性别同年龄段的平均水平——按此指标对应最高死亡风险，建议与临床医生讨论。',

  NOTE_PEDIATRIC_BLOCKED: '尚未为儿童和青少年建立 ABSI z 分数参考数据。',
  NOTE_OLDER_ADULT: '约 80 岁以上 ABSI 参考数据较少，请谨慎解读。',
  NOTE_POPULATION: 'ABSI 参考值源自美国（NHANES）成年人，在其他人群中表现可能不同。',

  PROFILE_HEADING: '您的资料',
  PROFILE_SEX: '性别',
  PROFILE_SEX_FEMALE: '女性',
  PROFILE_SEX_MALE: '男性',
  PROFILE_AGE: '年龄',

  WHY_SEX: '男女 ABSI 分布不同，z 分数使用按性别区分的均值与标准差。',
  WHY_AGE: 'ABSI 通常随年龄上升。z 分数使用按年龄分十年的参考值，以将体型与年龄影响分离。',

  METHODOLOGY_BUTTON: '方法学与参考文献',
  MODAL_CLOSE: '关闭',
  METHOD_HEADING: '方法与局限',
  METHOD_BODY:
    'Krakauer 与 Krakauer（2012）提出 ABSI，用于在不依赖整体体型的情况下刻画腹部形态。z 分数将您的 ABSI 与 NHANES 按性别与十年年龄段的参考值比较；正值表示更偏圆柱形/腹型分布，独立于 BMI 与较高的全因死亡风险相关。',
  METHOD_FORMULA: 'ABSI = 腰围(m) / (BMI^(2/3) · 身高(m)^(1/2))    其中 BMI = 体重(kg) / 身高(m)^2',
  METHOD_LIMITATIONS:
    '局限：ABSI 主要用于人群层面的死亡风险分层研究指标。不能替代临床评估，且本工具的参考数据源自 NHANES 成年人。对接近平均水平的个体分数请勿过度解读。',

  REFERENCES_HEADING: '参考文献',
  REF_KRAKAUER_2012:
    'Krakauer NY, Krakauer JC. A new body shape index predicts mortality hazard independently of body mass index。PLoS ONE，2012;7(7):e39504。',
  REF_KRAKAUER_2014:
    'Krakauer NY, Krakauer JC. Dynamic association of mortality hazard with body shape。PLoS ONE，2014;9(2):e88793。',
  REF_DHANA_2016:
    'Dhana K 等。Anthropometric measures in cardiovascular disease prediction。Heart，2016;102(13):1023–9。',

  PRIVACY_NOTE: '数据不会离开您的设备，所有计算均在本地完成。',
  DISCLAIMER: '本工具仅供教育用途，不构成医疗建议、诊断或治疗。',

  EXPORT_FILENAME: 'absi-结果.txt',
};
