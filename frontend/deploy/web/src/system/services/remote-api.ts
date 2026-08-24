import { request } from '@/services/http'
import type {
  CreateChatInstanceResult,
  LlmChartApi,
  LoginInput,
  MedicalHistoryInput,
  UpdatePatientProfileInput,
} from '@/types/api'
import type {
  AuthSession,
  ConsultationContext,
  ConsultationSnapshot,
  DiagnosisReport,
  ConsultationExpert,
  MedicalHistory,
  PatientProfile,
  ReportComparison,
  TreatmentResult,
  UserSummary,
} from '@/types/domain'

export class RemoteLlmChartApi implements LlmChartApi {
  login(input: LoginInput): Promise<AuthSession> {
    return request({ path: '/api/v1/auth/login', method: 'POST', data: input, authenticated: false })
  }

  logout(): Promise<void> {
    return request({ path: '/api/v1/auth/logout', method: 'POST' })
  }

  me(): Promise<UserSummary> {
    return request({ path: '/api/v1/auth/me' })
  }

  getPatientProfile(): Promise<PatientProfile> {
    return request({ path: '/api/v1/llm-chart/patient-profile' })
  }

  updatePatientProfile(input: UpdatePatientProfileInput): Promise<PatientProfile> {
    return request({ path: '/api/v1/llm-chart/patient-profile', method: 'PUT', data: input })
  }

  listMedicalHistories(): Promise<MedicalHistory[]> {
    return request({ path: '/api/v1/llm-chart/medical-histories' })
  }

  createMedicalHistory(input: MedicalHistoryInput): Promise<MedicalHistory> {
    return request({ path: '/api/v1/llm-chart/medical-histories', method: 'POST', data: input })
  }

  updateMedicalHistory(historyId: string, input: MedicalHistoryInput): Promise<MedicalHistory> {
    return request({ path: `/api/v1/llm-chart/medical-histories/${historyId}`, method: 'PUT', data: input })
  }

  deleteMedicalHistory(historyId: string): Promise<void> {
    return request({ path: `/api/v1/llm-chart/medical-histories/${historyId}`, method: 'DELETE' })
  }

  listConsultationExperts(): Promise<ConsultationExpert[]> {
    return request({ path: '/api/v1/llm-chart/consultation-experts' })
  }

  getConsultation(context: ConsultationContext): Promise<ConsultationSnapshot | null> {
    return request({
      path: '/api/v1/llm-chart/consultations',
      query: {
        patientId: context.patientId,
        medicalHistoryId: context.medicalHistoryId,
        expertId: context.expertId,
      },
    })
  }

  createChatInstance(context: ConsultationContext): Promise<CreateChatInstanceResult> {
    return request({ path: '/api/v1/llm-chart/chat/instances', method: 'POST', data: context })
  }

  saveRecord(
    context: ConsultationContext,
    role: 'patient' | 'assistant',
    content: string,
  ): Promise<void> {
    return request({
      path: '/api/v1/llm-chart/records',
      method: 'POST',
      data: { consultationId: context.consultationId, role, content },
    })
  }

  enterDiagnosis(context: ConsultationContext): Promise<TreatmentResult> {
    return request({ path: '/api/v1/llm-chart/diagnoses', method: 'POST', data: context })
  }

  listReports(patientId: string): Promise<DiagnosisReport[]> {
    return request({ path: '/api/v1/llm-chart/reports', query: { patientId } })
  }

  compareReports(reportAId: string, reportBId: string): Promise<ReportComparison> {
    return request({
      path: '/api/v1/llm-chart/reports/compare',
      method: 'POST',
      data: { reportAId, reportBId },
    })
  }
}
