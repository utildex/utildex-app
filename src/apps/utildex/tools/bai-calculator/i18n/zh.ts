export default {
  HIP_LABEL: '臀围',
  HEIGHT_LABEL: '身高',
  HIP_HINT: '在臀部最宽处测量。',
  HEIGHT_HINT: '不穿鞋的站立身高。',
  UNIT_CM: '厘米',
  UNIT_IN: '英寸',
  UNIT_TOGGLE_HIP: '臀围单位',
  UNIT_TOGGLE_HEIGHT: '身高单位',
  CONVERTED_PREFIX: '=',

  PRIMARY_RESULT_LABEL: 'BAI',
  RESULT_HINT: '身体肥胖指数（体脂百分比估算）',
  SECONDARY_RESULTS_LABEL: '附加信息',
  RESULT_PLACEHOLDER: '—',
  ENTER_BOTH_HINT: '请输入您的臀围与身高以计算。',

  INTERPRETATION_HEADING: '解读',
  AXIS_LEFT_LABEL: '偏瘦',
  AXIS_RIGHT_LABEL: '肥胖',
  PROFILE_DEFAULTS_BADGE: '使用默认资料',
  PROFILE_DEFAULTS_HINT_SHORT: '使用默认值——填写资料以提高准确度。',

  TIER_UNDERWEIGHT: '体重过轻',
  TIER_NORMAL: '正常',
  TIER_OVERWEIGHT: '超重',
  TIER_OBESE: '肥胖',

  SUMMARY_UNDERWEIGHT: '您的 BAI 低于您性别与年龄段的健康范围。',
  SUMMARY_NORMAL: '您的 BAI 处于您性别与年龄段的健康范围内。',
  SUMMARY_OVERWEIGHT: '您的 BAI 高于健康范围，调整生活方式通常有助。',
  SUMMARY_OBESE: '您的 BAI 处于肥胖范围——建议与临床医生讨论。',

  NOTE_PEDIATRIC_BLOCKED: '尚未为儿童和青少年建立 BAI 阈值。',
  NOTE_OLDER_ADULT: '约 80 岁以上的 BAI 阈值为外推值，请谨慎解读。',
  NOTE_POPULATION: 'BAI 阈值源自墨西哥裔美国人队列，普适性仍有争议。',

  PROFILE_HEADING: '您的资料',
  PROFILE_SEX: '性别',
  PROFILE_SEX_FEMALE: '女性',
  PROFILE_SEX_MALE: '男性',
  PROFILE_AGE: '年龄',

  WHY_SEX: 'BAI 切点在男女之间不同，因为脂肪分布与体脂总比例存在性别差异。',
  WHY_AGE: 'BAI 切点按年龄段分层（20–39、40–59、60–79）。18 岁以下未定义。',

  METHODOLOGY_BUTTON: '方法学与参考文献',
  MODAL_CLOSE: '关闭',
  METHOD_HEADING: '方法与局限',
  METHOD_BODY:
    '身体肥胖指数由 Bergman 等人于 2011 年提出，作为不需要体重的体脂百分比估计指标，仅使用臀围与身高。其主要优点是无需称重，在某些情况下称重并不方便或不可靠。',
  METHOD_FORMULA: 'BAI = 臀围 (cm) / 身高 (m)^1.5 − 18',
  METHOD_LIMITATIONS:
    '局限：BAI 源自单一族裔队列，后续验证研究显示其准确性变异较大。多项直接比较显示 BMI 加腰围在预测体脂百分比和心血管代谢风险方面优于 BAI。请始终结合临床背景解读。',

  REFERENCES_HEADING: '参考文献',
  REF_BERGMAN_2011:
    'Bergman RN 等。A better index of body adiposity。Obesity (Silver Spring)，2011。',
  REF_FREEDMAN_2012:
    'Freedman DS 等。The body adiposity index (hip circumference ÷ height^1.5) is not a more accurate measure of adiposity than BMI, waist circumference, or hip circumference。Obesity，2012。',
  REF_LOPEZ_2012:
    'López-Alvarenga JC 等。Body adiposity index: a critical reappraisal。Obesity，2012。',

  PRIVACY_NOTE: '数据不会离开您的设备，所有计算均在本地完成。',
  DISCLAIMER: '本工具仅供教育用途，不构成医疗建议、诊断或治疗。',

  EXPORT_FILENAME: 'bai-结果.txt',
};
