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

export interface LoginInput {
  username: string
  password: string
}

export interface CreateChatInstanceResult {
  instanceId: string
}

export interface UpdatePatientProfileInput {
  name: string
  gender: PatientProfile['gender']
  birthDate?: string
  lockVersion: number
}

export interface MedicalHistoryCreateInput {
  name: string
  description?: string
  diagnosedAt?: string
}

export interface MedicalHistoryUpdateInput extends MedicalHistoryCreateInput {
  lockVersion: number
}

export interface LlmChartApi {
  login(input: LoginInput): Promise<AuthSession>
  logout(): Promise<void>
  me(): Promise<UserSummary>
  getPatientProfile(): Promise<PatientProfile>
  updatePatientProfile(input: UpdatePatientProfileInput): Promise<PatientProfile>
  listMedicalHistories(): Promise<MedicalHistory[]>
  createMedicalHistory(input: MedicalHistoryCreateInput): Promise<MedicalHistory>
  updateMedicalHistory(historyId: string, input: MedicalHistoryUpdateInput): Promise<MedicalHistory>
  deleteMedicalHistory(historyId: string): Promise<void>
  listConsultationExperts(): Promise<ConsultationExpert[]>
  getConsultation(context: ConsultationContext): Promise<ConsultationSnapshot | null>
  createChatInstance(context: ConsultationContext): Promise<CreateChatInstanceResult>
  saveRecord(context: ConsultationContext, role: 'patient' | 'assistant', content: string): Promise<void>
  enterDiagnosis(context: ConsultationContext): Promise<TreatmentResult>
  listReports(patientId: string): Promise<DiagnosisReport[]>
  compareReports(reportAId: string, reportBId: string): Promise<ReportComparison>
}

export interface ApiEnvelope<T> {
  success: boolean
  code: string
  message: string
  data: T
}
