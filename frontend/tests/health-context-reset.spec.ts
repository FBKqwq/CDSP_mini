import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useHealthContextStore } from '@/stores/health-context'
import { llmChartApi } from '@/services/llm-chart-api'

vi.mock('@/services/llm-chart-api', () => ({
  llmChartApi: {
    getPatientProfile: vi.fn(),
    listMedicalHistories: vi.fn(),
    listConsultationExperts: vi.fn(),
  },
}))

describe('healthContextStore 退出清理', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('清空患者资料、历史疾病和专家内存缓存', async () => {
    vi.mocked(llmChartApi.getPatientProfile).mockResolvedValue({
      id: 'patient-1',
      code: 'P001',
      name: '测试患者',
      gender: '未知',
      birthDate: '1990-01-01',
      age: 36,
      lockVersion: 0,
    })
    vi.mocked(llmChartApi.listMedicalHistories).mockResolvedValue([
      { id: 'history-1', name: '高血压', lockVersion: 0 },
    ])
    vi.mocked(llmChartApi.listConsultationExperts).mockResolvedValue([
      {
        id: 'expert-1',
        name: '测试专家',
        title: '主任医师',
        specialty: '内科',
        enabled: true,
      },
    ])
    const store = useHealthContextStore()
    await store.loadAll()

    expect(llmChartApi.listConsultationExperts).not.toHaveBeenCalled()

    store.resetAll()

    expect(store.profile).toBeNull()
    expect(store.medicalHistories).toEqual([])
    expect(store.consultationExperts).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.mutating).toBe(false)
    expect(store.errorMessage).toBe('')
  })
})
