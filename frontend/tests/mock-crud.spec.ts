import { describe, expect, it } from 'vitest'
import { AppError } from '@/services/app-error'
import { MockLlmChartApi } from '@/services/mock-api'
import type { ConsultationContext } from '@/types/domain'

describe('patient profile and medical history mock contract', () => {
  it('updates the bound profile and completes medical history CRUD', async () => {
    const api = new MockLlmChartApi()
    const original = await api.getPatientProfile()
    const updatedProfile = await api.updatePatientProfile({
      name: '李女士（更新）',
      gender: '女',
      age: 47,
    })

    expect(updatedProfile).toMatchObject({ id: original.id, code: original.code, age: 47 })

    const created = await api.createMedicalHistory({
      name: '慢性胃炎',
      description: '偶有胃胀',
      diagnosedAt: '2026-01-08',
    })
    expect((await api.listMedicalHistories()).some((history) => history.id === created.id)).toBe(true)

    const updated = await api.updateMedicalHistory(created.id, {
      name: '慢性胃炎',
      description: '症状稳定',
    })
    expect(updated.description).toBe('症状稳定')

    await api.deleteMedicalHistory(created.id)
    expect((await api.listMedicalHistories()).some((history) => history.id === created.id)).toBe(false)
  })

  it('rejects invalid profile data and missing history records', async () => {
    const api = new MockLlmChartApi()

    await expect(api.updatePatientProfile({ name: '', gender: '未知', age: 151 })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    } satisfies Partial<AppError>)
    await expect(api.deleteMedicalHistory('history-missing')).rejects.toMatchObject({
      code: 'CONTEXT_INVALID',
    } satisfies Partial<AppError>)
  })
})

describe('treatment result contract', () => {
  it('returns diagnosis and prescription together and restores both from the session', async () => {
    const api = new MockLlmChartApi()
    const context: ConsultationContext = {
      sessionVersion: 1,
      patientId: 'patient-001',
      expertId: 'expert-fang',
      stage: 'consultation',
    }

    await api.createChatInstance(context)
    const treatment = await api.enterDiagnosis(context)
    const restored = await api.getConsultation(context)

    expect(treatment.diagnosis.primaryDiagnosis).toBeTruthy()
    expect(treatment.prescription?.items.length).toBeGreaterThan(0)
    expect(restored?.diagnosis).toEqual(treatment.diagnosis)
    expect(restored?.prescription).toEqual(treatment.prescription)
  })
})
