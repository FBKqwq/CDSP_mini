import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { toAppError } from '@/services/app-error'
import { llmChartApi } from '@/services/llm-chart-api'
import type { CreatePatientInput } from '@/types/api'
import type { DiseaseGroup, Patient } from '@/types/domain'

export const usePatientStore = defineStore('patient', () => {
  const patients = ref<Patient[]>([])
  const diseaseGroups = ref<DiseaseGroup[]>([])
  const loading = ref(false)
  const errorMessage = ref('')
  const searchQuery = ref('')

  const filteredPatients = computed(() => {
    const keyword = searchQuery.value.trim().toLowerCase()
    if (!keyword) return patients.value
    return patients.value.filter(
      (patient) =>
        patient.name.toLowerCase().includes(keyword) ||
        patient.code.toLowerCase().includes(keyword),
    )
  })

  async function loadAll(): Promise<void> {
    loading.value = true
    errorMessage.value = ''
    try {
      const [patientRows, groups] = await Promise.all([
        llmChartApi.listPatients(),
        llmChartApi.listDiseaseGroups(),
      ])
      patients.value = patientRows
      diseaseGroups.value = groups
    } catch (error) {
      errorMessage.value = toAppError(error, 'SERVICE_UNAVAILABLE').message
    } finally {
      loading.value = false
    }
  }

  async function createPatient(input: CreatePatientInput): Promise<Patient> {
    const patient = await llmChartApi.createPatient(input)
    patients.value = [patient, ...patients.value]
    return patient
  }

  async function deletePatient(patientId: string): Promise<void> {
    await llmChartApi.deletePatient(patientId)
    patients.value = patients.value.filter((patient) => patient.id !== patientId)
  }

  function findPatient(patientId: string): Patient | undefined {
    return patients.value.find((patient) => patient.id === patientId)
  }

  function findDisease(diseaseGroupId: string): DiseaseGroup | undefined {
    return diseaseGroups.value.find((group) => group.id === diseaseGroupId)
  }

  return {
    patients,
    diseaseGroups,
    loading,
    errorMessage,
    searchQuery,
    filteredPatients,
    loadAll,
    createPatient,
    deletePatient,
    findPatient,
    findDisease,
  }
})

