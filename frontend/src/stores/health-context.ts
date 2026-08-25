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

        /*
         * 本次需求不做问诊专家。
         * 保留字段是为了兼容项目现有代码，
         * 但不会主动请求 consultation-experts。
         */
        const consultationExperts = ref<ConsultationExpert[]>([])

        const loading = ref(false)
        const mutating = ref(false)
        const errorMessage = ref('')


        async function loadPatientProfile(): Promise<void> {
            profile.value =
                await llmChartApi.getPatientProfile()
        }


        async function loadMedicalHistories(): Promise<void> {
            medicalHistories.value =
                await llmChartApi.listMedicalHistories()
        }


        /*
         * 保留方法供原项目后续功能恢复使用。
         * 当前登录 + 个人信息需求不要调用。
         */
        async function loadConsultationExperts(): Promise<void> {
            consultationExperts.value =
                await llmChartApi.listConsultationExperts()
        }


        async function loadAll(): Promise<void> {
            loading.value = true
            errorMessage.value = ''

            try {
                /*
                 * 当前需求只加载：
                 *
                 * 1. 患者资料
                 * 2. 历史疾病
                 *
                 * 不请求 consultation-experts，
                 * 避免未实现接口影响个人信息页面。
                 */
                const [
                    patientProfile,
                    histories,
                ] = await Promise.all([
                    llmChartApi.getPatientProfile(),
                    llmChartApi.listMedicalHistories(),
                ])

                profile.value = patientProfile
                medicalHistories.value = histories
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

                if (appError.code === 'VERSION_CONFLICT') {
                    try {
                        await loadPatientProfile()
                    } catch {
                        // 保留原始版本冲突错误
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

                await loadMedicalHistories()

                return true
            } catch (error) {
                errorMessage.value =
                    toAppError(error).message

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

                if (appError.code === 'VERSION_CONFLICT') {
                    try {
                        await loadMedicalHistories()
                    } catch {
                        // 保留原始版本冲突错误
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
                await llmChartApi.deleteMedicalHistory(
                    historyId,
                )

                await loadMedicalHistories()

                return true
            } catch (error) {
                errorMessage.value =
                    toAppError(error).message

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