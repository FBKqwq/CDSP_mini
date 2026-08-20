import type { DiagnosisReport, ReportComparison } from '@/types/domain'

export function compareReportRecords(a: DiagnosisReport, b: DiagnosisReport): ReportComparison {
  const rows = [
    ['diagnosis', '主要诊断', a.diagnosis.primaryDiagnosis, b.diagnosis.primaryDiagnosis],
    ['syndrome', '中医证候', a.diagnosis.syndrome, b.diagnosis.syndrome],
    ['advice', '诊疗建议', a.diagnosis.advice, b.diagnosis.advice],
    ['prescription', '处方', a.prescription?.name ?? '未提供', b.prescription?.name ?? '未提供'],
  ] as const

  return {
    reportAId: a.id,
    reportBId: b.id,
    items: rows.map(([key, label, reportA, reportB]) => ({
      key,
      label,
      reportA,
      reportB,
      summary: reportA === reportB ? '两次记录一致' : '两次记录存在变化，请结合报告时间阅读',
    })),
  }
}

