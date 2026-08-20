import { describe, expect, it } from 'vitest'
import { compareReportRecords } from '@/domain/report-comparison'
import type { DiagnosisReport } from '@/types/domain'

function report(id: string, syndrome: string): DiagnosisReport {
  return {
    id,
    patientId: 'patient-1',
    createdAt: '2026-08-19',
    diseaseName: '代谢综合征',
    status: 'completed',
    diagnosis: {
      primaryDiagnosis: '代谢综合征',
      syndrome,
      evidence: [],
      advice: '动态观察',
      updatedAt: '2026-08-19',
      stage: 'comprehensive',
      syndromeScores: [],
    },
  }
}

describe('mobile report comparison', () => {
  it('produces vertical dimension records with A/B values', () => {
    const result = compareReportRecords(report('a', '痰湿内阻证'), report('b', '脾虚痰湿证'))
    const syndrome = result.items.find((item) => item.key === 'syndrome')
    expect(syndrome).toMatchObject({
      reportA: '痰湿内阻证',
      reportB: '脾虚痰湿证',
    })
    expect(syndrome?.summary).toContain('存在变化')
  })
})

