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
      birthDate: '1979-01-01',
      lockVersion: original.lockVersion,
    })

    expect(updatedProfile).toMatchObject({
      id: original.id,
      code: original.code,
      name: '李女士（更新）',
      gender: '女',
      birthDate: '1979-01-01',
      lockVersion: original.lockVersion + 1,
    })

    const created = await api.createMedicalHistory({
      name: '慢性胃炎',
      description: '偶有胃胀',
      diagnosedAt: '2026-01-08',
    })

    expect(created.lockVersion).toBe(0)

    expect(
        (await api.listMedicalHistories()).some(
            (history) => history.id === created.id,
        ),
    ).toBe(true)

    const updated = await api.updateMedicalHistory(
        created.id,
        {
          name: '慢性胃炎',
          description: '症状稳定',
          diagnosedAt: '2026-01-08',
          lockVersion: created.lockVersion,
        },
    )

    expect(updated.description).toBe('症状稳定')
    expect(updated.lockVersion).toBe(
        created.lockVersion + 1,
    )

    await api.deleteMedicalHistory(created.id)

    expect(
        (await api.listMedicalHistories()).some(
            (history) => history.id === created.id,
        ),
    ).toBe(false)
  })


  it('rejects invalid profile data and stale profile versions', async () => {
    const api = new MockLlmChartApi()

    const profile = await api.getPatientProfile()

    await expect(
        api.updatePatientProfile({
          name: '',
          gender: '未知',
          birthDate: '2000-01-01',
          lockVersion: profile.lockVersion,
        }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    } satisfies Partial<AppError>)

    const updated = await api.updatePatientProfile({
      name: '李女士',
      gender: '女',
      birthDate: profile.birthDate,
      lockVersion: profile.lockVersion,
    })

    expect(updated.lockVersion).toBe(
        profile.lockVersion + 1,
    )

    await expect(
        api.updatePatientProfile({
          name: '李女士',
          gender: '女',
          birthDate: profile.birthDate,
          lockVersion: profile.lockVersion,
        }),
    ).rejects.toMatchObject({
      code: 'VERSION_CONFLICT',
    } satisfies Partial<AppError>)
  })


  it('rejects stale medical history versions and missing history records', async () => {
    const api = new MockLlmChartApi()

    const created = await api.createMedicalHistory({
      name: '慢性胃炎',
      description: '偶有胃胀',
      diagnosedAt: '2026-01-08',
    })

    const updated = await api.updateMedicalHistory(
        created.id,
        {
          name: '慢性胃炎',
          description: '第一次修改',
          diagnosedAt: created.diagnosedAt,
          lockVersion: created.lockVersion,
        },
    )

    expect(updated.lockVersion).toBe(
        created.lockVersion + 1,
    )

    await expect(
        api.updateMedicalHistory(
            created.id,
            {
              name: '慢性胃炎',
              description: '旧版本再次修改',
              diagnosedAt: created.diagnosedAt,
              lockVersion: created.lockVersion,
            },
        ),
    ).rejects.toMatchObject({
      code: 'VERSION_CONFLICT',
    } satisfies Partial<AppError>)

    await expect(
        api.deleteMedicalHistory('history-missing'),
    ).rejects.toMatchObject({
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

    expect(
        treatment.diagnosis.primaryDiagnosis,
    ).toBeTruthy()

    expect(
        treatment.prescription?.items.length,
    ).toBeGreaterThan(0)

    expect(
        restored?.diagnosis,
    ).toEqual(treatment.diagnosis)

    expect(
        restored?.prescription,
    ).toEqual(treatment.prescription)
  })
})