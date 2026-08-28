import { defineStore } from 'pinia'
import { ref } from 'vue'
import { AppError, toAppError } from '@/services/app-error'
import { llmChartApi } from '@/services/llm-chart-api'
import type {
  MedicalHistoryCreateInput,
  UpdatePatientProfileInput,
} from '@/types/api'
import type { ConsultationExpert, MedicalHistory, PatientProfile } from '@/types/domain'

export const useHealthContextStore = defineStore('health-context', () => {
  const profile = ref<PatientProfile | null>(null)
  const medicalHistories = ref<MedicalHistory[]>([])
  const consultationExperts = ref<ConsultationExpert[]>([])
  const loading = ref(false)
  const mutating = ref(false)
  const errorMessage = ref('')
  let generation = 0

  async function loadAll(): Promise<void> {
    const requestGeneration = ++generation
    loading.value = true
    errorMessage.value = ''
    try {
      const [patientProfile, histories] = await Promise.all([
        llmChartApi.getPatientProfile(),
        llmChartApi.listMedicalHistories(),
      ])
      if (requestGeneration !== generation) return
      profile.value = patientProfile
      medicalHistories.value = histories
      // 问诊专家不属于“用户登录与个人信息”本期范围，避免请求未实现接口。
      consultationExperts.value = []
    } catch (error) {
      if (requestGeneration !== generation) return
      profile.value = null
      medicalHistories.value = []
      errorMessage.value = toAppError(error, 'SERVICE_UNAVAILABLE').message
    } finally {
      if (requestGeneration === generation) loading.value = false
    }
  }

  function findMedicalHistory(historyId: string | undefined): MedicalHistory | undefined {
    return medicalHistories.value.find((history) => history.id === historyId)
  }

  function findConsultationExpert(expertId: string): ConsultationExpert | undefined {
    return consultationExperts.value.find((expert) => expert.id === expertId)
  }

  async function refreshProfile(requestGeneration: number): Promise<void> {
    const latest = await llmChartApi.getPatientProfile()
    if (requestGeneration === generation) profile.value = latest
  }

  async function refreshHistories(requestGeneration: number): Promise<void> {
    const latest = await llmChartApi.listMedicalHistories()
    if (requestGeneration === generation) medicalHistories.value = latest
  }

  async function updateProfile(
    input: Omit<UpdatePatientProfileInput, 'lockVersion'>,
  ): Promise<boolean> {
    const current = profile.value
    if (!current) {
      errorMessage.value = new AppError('PROFILE_NOT_FOUND').message
      return false
    }
    const requestGeneration = generation
    mutating.value = true
    errorMessage.value = ''
    try {
      const updated = await llmChartApi.updatePatientProfile({
        ...input,
        lockVersion: current.lockVersion,
      })
      if (requestGeneration !== generation) return false
      profile.value = updated
      return true
    } catch (error) {
      if (requestGeneration !== generation) return false
      const appError = toAppError(error)
      if (appError.code === 'VERSION_CONFLICT') {
        try {
          await refreshProfile(requestGeneration)
        } catch {
          // 保留原始冲突提示和用户正在编辑的草稿。
        }
      }
      errorMessage.value = appError.message
      return false
    } finally {
      if (requestGeneration === generation) mutating.value = false
    }
  }

  async function createMedicalHistory(input: MedicalHistoryCreateInput): Promise<boolean> {
    const requestGeneration = generation
    mutating.value = true
    errorMessage.value = ''
    try {
      const created = await llmChartApi.createMedicalHistory(input)
      if (requestGeneration !== generation) return false
      medicalHistories.value = [...medicalHistories.value, created]
      try {
        await refreshHistories(requestGeneration)
      } catch {
        // 新增响应已包含完整记录；列表刷新失败时仍保留本次成功结果。
      }
      return true
    } catch (error) {
      if (requestGeneration !== generation) return false
      errorMessage.value = toAppError(error).message
      return false
    } finally {
      if (requestGeneration === generation) mutating.value = false
    }
  }

  async function updateMedicalHistory(
    historyId: string,
    input: MedicalHistoryCreateInput,
  ): Promise<boolean> {
    const current = findMedicalHistory(historyId)
    if (!current) {
      errorMessage.value = new AppError('HISTORY_NOT_FOUND').message
      return false
    }
    const requestGeneration = generation
    mutating.value = true
    errorMessage.value = ''
    try {
      const updated = await llmChartApi.updateMedicalHistory(historyId, {
        ...input,
        lockVersion: current.lockVersion,
      })
      if (requestGeneration !== generation) return false
      medicalHistories.value = medicalHistories.value.map((history) =>
        history.id === historyId ? updated : history,
      )
      try {
        await refreshHistories(requestGeneration)
      } catch {
        // 更新响应已包含完整记录；列表刷新失败时仍保留本次成功结果。
      }
      return true
    } catch (error) {
      if (requestGeneration !== generation) return false
      const appError = toAppError(error)
      if (appError.code === 'VERSION_CONFLICT') {
        try {
          await refreshHistories(requestGeneration)
        } catch {
          // 保留原始冲突提示和用户正在编辑的草稿。
        }
      }
      errorMessage.value = appError.message
      return false
    } finally {
      if (requestGeneration === generation) mutating.value = false
    }
  }

  async function deleteMedicalHistory(historyId: string): Promise<boolean> {
    const requestGeneration = generation
    mutating.value = true
    errorMessage.value = ''
    try {
      await llmChartApi.deleteMedicalHistory(historyId)
      if (requestGeneration !== generation) return false
      medicalHistories.value = medicalHistories.value.filter(
        (history) => history.id !== historyId,
      )
      return true
    } catch (error) {
      if (requestGeneration !== generation) return false
      errorMessage.value = toAppError(error).message
      return false
    } finally {
      if (requestGeneration === generation) mutating.value = false
    }
  }

  function resetAll(): void {
    generation += 1
    profile.value = null
    medicalHistories.value = []
    consultationExperts.value = []
    loading.value = false
    mutating.value = false
    errorMessage.value = ''
  }

  return {
    profile,
    medicalHistories,
    consultationExperts,
    loading,
    mutating,
    errorMessage,
    loadAll,
    findMedicalHistory,
    findConsultationExpert,
    updateProfile,
    createMedicalHistory,
    updateMedicalHistory,
    deleteMedicalHistory,
    resetAll,
  }
})
