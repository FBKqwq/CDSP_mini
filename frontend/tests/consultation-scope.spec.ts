import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { llmChartApi } from '@/services/llm-chart-api'
import { useConsultationStore } from '@/stores/consultation'

vi.mock('@/services/llm-chart-api', () => ({
  llmChartApi: {
    getConsultation: vi.fn(),
    listReports: vi.fn(),
  },
}))

describe('consultationStore 当前交付范围', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('恢复问诊上下文时不请求未接入的诊断报告接口', async () => {
    vi.mocked(llmChartApi.getConsultation).mockResolvedValue(null)
    const store = useConsultationStore()
    store.context.patientId = 'patient-1'
    store.context.expertId = 'expert-1'

    await store.restoreContext()

    expect(llmChartApi.getConsultation).toHaveBeenCalledOnce()
    expect(llmChartApi.listReports).not.toHaveBeenCalled()
    expect(store.reports).toEqual([])
  })
})
