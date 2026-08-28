import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AppError } from '@/services/app-error'
import { llmChartApi } from '@/services/llm-chart-api'
import { useHealthContextStore } from '@/stores/health-context'

vi.mock('@/services/llm-chart-api', () => ({
  llmChartApi: {
    getPatientProfile: vi.fn(),
    updatePatientProfile: vi.fn(),
    listMedicalHistories: vi.fn(),
    createMedicalHistory: vi.fn(),
    updateMedicalHistory: vi.fn(),
    deleteMedicalHistory: vi.fn(),
    listConsultationExperts: vi.fn(),
  },
}))

const profile = {
  id: 'patient-1',
  code: 'P001',
  name: '测试患者',
  gender: '未知' as const,
  birthDate: '1990-01-01',
  age: 36,
  lockVersion: 3,
}

const history = {
  id: 'history-1',
  name: '高血压',
  description: '规律监测',
  diagnosedAt: '2024-06-03',
  lockVersion: 2,
}

describe('healthContextStore 真实资料合同', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(llmChartApi.getPatientProfile).mockResolvedValue({ ...profile })
    vi.mocked(llmChartApi.listMedicalHistories).mockResolvedValue([{ ...history }])
  })

  it('只加载本人资料和病史，不请求本期排除的专家接口', async () => {
    const store = useHealthContextStore()
    await store.loadAll()

    expect(store.profile).toEqual(profile)
    expect(store.medicalHistories).toEqual([history])
    expect(llmChartApi.listConsultationExperts).not.toHaveBeenCalled()
  })

  it('资料和病史更新自动携带当前 lockVersion', async () => {
    vi.mocked(llmChartApi.updatePatientProfile).mockResolvedValue({
      ...profile,
      name: '新姓名',
      lockVersion: 4,
    })
    vi.mocked(llmChartApi.updateMedicalHistory).mockResolvedValue({
      ...history,
      description: '症状稳定',
      lockVersion: 3,
    })
    const store = useHealthContextStore()
    await store.loadAll()

    await store.updateProfile({ name: '新姓名', gender: '未知', birthDate: '1990-01-01' })
    await store.updateMedicalHistory('history-1', {
      name: '高血压',
      description: '症状稳定',
      diagnosedAt: '2024-06-03',
    })

    expect(llmChartApi.updatePatientProfile).toHaveBeenCalledWith({
      name: '新姓名',
      gender: '未知',
      birthDate: '1990-01-01',
      lockVersion: 3,
    })
    expect(llmChartApi.updateMedicalHistory).toHaveBeenCalledWith('history-1', {
      name: '高血压',
      description: '症状稳定',
      diagnosedAt: '2024-06-03',
      lockVersion: 2,
    })
  })

  it('版本冲突时重新加载服务端资料并保留稳定提示', async () => {
    const latest = { ...profile, name: '其他终端已修改', lockVersion: 4 }
    vi.mocked(llmChartApi.getPatientProfile)
      .mockResolvedValueOnce({ ...profile })
      .mockResolvedValueOnce(latest)
    vi.mocked(llmChartApi.updatePatientProfile).mockRejectedValue(
      new AppError('VERSION_CONFLICT'),
    )
    const store = useHealthContextStore()
    await store.loadAll()

    const success = await store.updateProfile({
      name: '本地草稿',
      gender: '未知',
      birthDate: '1990-01-01',
    })

    expect(success).toBe(false)
    expect(store.profile).toEqual(latest)
    expect(store.errorMessage).toContain('重新加载')
  })
})
