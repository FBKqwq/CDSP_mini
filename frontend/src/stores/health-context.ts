import { defineStore } from 'pinia'
import { ref } from 'vue'
import { toAppError } from '@/services/app-error'
import { llmChartApi } from '@/services/llm-chart-api'
import type { MedicalHistoryInput, UpdatePatientProfileInput } from '@/types/api'
import type { ConsultationExpert, MedicalHistory, PatientProfile } from '@/types/domain'

export const useHealthContextStore = defineStore('health-context', () => {
  const profile = ref<PatientProfile | null>(null)
  const medicalHistories = ref<MedicalHistory[]>([])
  const consultationExperts = ref<ConsultationExpert[]>([])
  const loading = ref(false)
  const mutating = ref(false)
  const errorMessage = ref('')

  async function loadAll(): Promise<void> {
    loading.value = true
    errorMessage.value = ''
    try {
      const [patientProfile, histories, experts] = await Promise.all([
        llmChartApi.getPatientProfile(),
        llmChartApi.listMedicalHistories(),
        llmChartApi.listConsultationExperts(),
      ])
      profile.value = patientProfile
      medicalHistories.value = histories
      consultationExperts.value = experts
    } catch (error) {
      errorMessage.value = toAppError(error, 'SERVICE_UNAVAILABLE').message
    } finally {
      loading.value = false
    }
  }

  function findMedicalHistory(historyId: string | undefined): MedicalHistory | undefined {
    return medicalHistories.value.find((history) => history.id === historyId)
  }

  function findConsultationExpert(expertId: string): ConsultationExpert | undefined {
    return consultationExperts.value.find((expert) => expert.id === expertId)
  }

  async function updateProfile(input: UpdatePatientProfileInput): Promise<boolean> {
    mutating.value = true
    errorMessage.value = ''
    try {
      profile.value = await llmChartApi.updatePatientProfile(input)
      return true
    } catch (error) {
      errorMessage.value = toAppError(error).message
      return false
    } finally {
      mutating.value = false
    }
  }

  async function createMedicalHistory(input: MedicalHistoryInput): Promise<boolean> {
    mutating.value = true
    errorMessage.value = ''
    try {
      const created = await llmChartApi.createMedicalHistory(input)
      medicalHistories.value = [...medicalHistories.value, created]
      return true
    } catch (error) {
      errorMessage.value = toAppError(error).message
      return false
    } finally {
      mutating.value = false
    }
  }

  async function updateMedicalHistory(
    historyId: string,
    input: MedicalHistoryInput,
  ): Promise<boolean> {
    mutating.value = true
    errorMessage.value = ''
    try {
      const updated = await llmChartApi.updateMedicalHistory(historyId, input)
      medicalHistories.value = medicalHistories.value.map((history) =>
        history.id === historyId ? updated : history,
      )
      return true
    } catch (error) {
      errorMessage.value = toAppError(error).message
      return false
    } finally {
      mutating.value = false
    }
  }

  async function deleteMedicalHistory(historyId: string): Promise<boolean> {
    mutating.value = true
    errorMessage.value = ''
    try {
      await llmChartApi.deleteMedicalHistory(historyId)
      medicalHistories.value = medicalHistories.value.filter(
        (history) => history.id !== historyId,
      )
      return true
    } catch (error) {
      errorMessage.value = toAppError(error).message
      return false
    } finally {
      mutating.value = false
    }
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
  }
})
