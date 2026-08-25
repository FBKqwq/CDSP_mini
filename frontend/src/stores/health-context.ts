import { defineStore } from 'pinia'
import { ref } from 'vue'

import { toAppError } from '@/services/app-error'
import { llmChartApi } from '@/services/llm-chart-api'

import type {
  MedicalHistoryInput,
  UpdatePatientProfileInput,
} from '@/types/api'

import type {
  ConsultationExpert,
  MedicalHistory,
  PatientProfile,
} from '@/types/domain'


export const useHealthContextStore = defineStore(
    'health-context',
    () => {
      const profile = ref<PatientProfile | null>(null)

      const medicalHistories = ref<MedicalHistory[]>([])

      const consultationExperts = ref<ConsultationExpert[]>([])

      const loading = ref(false)

      const mutating = ref(false)

      const errorMessage = ref('')


      async function loadPatientProfile(): Promise<void> {
        profile.value = await llmChartApi.getPatientProfile()
      }


      async function loadMedicalHistories(): Promise<void> {
        medicalHistories.value =
            await llmChartApi.listMedicalHistories()
      }


      async function loadConsultationExperts(): Promise<void> {
        consultationExperts.value =
            await llmChartApi.listConsultationExperts()
      }


      async function loadAll(): Promise<void> {
        loading.value = true
        errorMessage.value = ''

        try {
          const [
            patientProfile,
            histories,
            experts,
          ] = await Promise.all([
            llmChartApi.getPatientProfile(),
            llmChartApi.listMedicalHistories(),
            llmChartApi.listConsultationExperts(),
          ])

          profile.value = patientProfile
          medicalHistories.value = histories
          consultationExperts.value = experts
        } catch (error) {
          errorMessage.value = toAppError(
              error,
              'SERVICE_UNAVAILABLE',
          ).message
        } finally {
          loading.value = false
        }
      }


      function findMedicalHistory(
          historyId: string | undefined,
      ): MedicalHistory | undefined {
        if (!historyId) {
          return undefined
        }

        return medicalHistories.value.find(
            (history) => history.id === historyId,
        )
      }


      function findConsultationExpert(
          expertId: string,
      ): ConsultationExpert | undefined {
        return consultationExperts.value.find(
            (expert) => expert.id === expertId,
        )
      }


      async function updateProfile(
          input: UpdatePatientProfileInput,
      ): Promise<boolean> {
        mutating.value = true
        errorMessage.value = ''

        try {
          profile.value =
              await llmChartApi.updatePatientProfile(input)

          return true
        } catch (error) {
          const appError = toAppError(error)

          /*
           * 乐观锁冲突时，立即重新读取服务端最新资料。
           *
           * 页面下一次点击“编辑”时，就会使用新的 lockVersion，
           * 避免用户一直拿旧版本重复提交。
           */
          if (appError.code === 'VERSION_CONFLICT') {
            try {
              await loadPatientProfile()
            } catch {
              // 保留原始 VERSION_CONFLICT 错误提示
            }
          }

          errorMessage.value = appError.message

          return false
        } finally {
          mutating.value = false
        }
      }


      async function createMedicalHistory(
          input: MedicalHistoryInput,
      ): Promise<boolean> {
        mutating.value = true
        errorMessage.value = ''

        try {
          await llmChartApi.createMedicalHistory(input)

          /*
           * 不直接 append。
           *
           * 后端列表有固定排序：
           * diagnosedAt DESC、updatedAt DESC。
           * 创建后重新查询，确保前端顺序始终以后端为准。
           */
          await loadMedicalHistories()

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
          await llmChartApi.updateMedicalHistory(
              historyId,
              input,
          )

          await loadMedicalHistories()

          return true
        } catch (error) {
          const appError = toAppError(error)

          /*
           * 病史乐观锁冲突：
           * 重新获取服务端最新病史列表，
           * 从而同步新的 lockVersion。
           */
          if (appError.code === 'VERSION_CONFLICT') {
            try {
              await loadMedicalHistories()
            } catch {
              // 保留原始 VERSION_CONFLICT 错误提示
            }
          }

          errorMessage.value = appError.message

          return false
        } finally {
          mutating.value = false
        }
      }


      async function deleteMedicalHistory(
          historyId: string,
      ): Promise<boolean> {
        mutating.value = true
        errorMessage.value = ''

        try {
          await llmChartApi.deleteMedicalHistory(historyId)

          /*
           * 删除是逻辑删除。
           * 删除完成后重新查询数据库中的有效病史列表。
           */
          await loadMedicalHistories()

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
        loadPatientProfile,
        loadMedicalHistories,
        loadConsultationExperts,

        findMedicalHistory,
        findConsultationExpert,

        updateProfile,
        createMedicalHistory,
        updateMedicalHistory,
        deleteMedicalHistory,
      }
    },
)