import { request } from '@/services/http'
import type {
  CreateChatInstanceResult,
  CreatePatientInput,
  LlmChartApi,
  LoginInput,
} from '@/types/api'
import type {
  AuthSession,
  ConsultationContext,
  ConsultationSnapshot,
  DiagnosisReport,
  DiagnosisSummary,
  DiseaseGroup,
  Patient,
  ReportComparison,
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

  listPatients(query?: string): Promise<Patient[]> {
    return request({ path: '/api/v1/llm-chart/patients', query: { query } })
  }

  createPatient(input: CreatePatientInput): Promise<Patient> {
    return request({ path: '/api/v1/llm-chart/patients', method: 'POST', data: input })
  }

  deletePatient(patientId: string): Promise<void> {
    return request({ path: `/api/v1/llm-chart/patients/${encodeURIComponent(patientId)}`, method: 'DELETE' })
  }

  listDiseaseGroups(): Promise<DiseaseGroup[]> {
    return request({ path: '/api/v1/llm-chart/disease-groups' })
  }

  getConsultation(context: ConsultationContext): Promise<ConsultationSnapshot | null> {
    return request({
      path: '/api/v1/llm-chart/consultations',
      query: {
        patientId: context.patientId,
        diseaseGroupId: context.diseaseGroupId,
        doctorId: context.doctorId,
      },
    })
  }

  createChatInstance(context: ConsultationContext): Promise<CreateChatInstanceResult> {
    return request({ path: '/api/v1/llm-chart/chat/instances', method: 'POST', data: context })
  }

  saveRecord(
    context: ConsultationContext,
    role: 'patient' | 'doctor',
    content: string,
  ): Promise<void> {
    return request({
      path: '/api/v1/llm-chart/records',
      method: 'POST',
      data: { consultationId: context.consultationId, role, content },
    })
  }

  enterDiagnosis(context: ConsultationContext): Promise<DiagnosisSummary> {
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

