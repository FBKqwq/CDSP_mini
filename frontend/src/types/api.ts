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

export interface LoginInput {
  username: string
  password: string
}

export interface CreatePatientInput {
  name: string
  gender: Patient['gender']
  age?: number
}

export interface CreateChatInstanceResult {
  instanceId: string
}

export interface LlmChartApi {
  login(input: LoginInput): Promise<AuthSession>
  logout(): Promise<void>
  me(): Promise<UserSummary>
  listPatients(query?: string): Promise<Patient[]>
  createPatient(input: CreatePatientInput): Promise<Patient>
  deletePatient(patientId: string): Promise<void>
  listDiseaseGroups(): Promise<DiseaseGroup[]>
  getConsultation(context: ConsultationContext): Promise<ConsultationSnapshot | null>
  createChatInstance(context: ConsultationContext): Promise<CreateChatInstanceResult>
  saveRecord(context: ConsultationContext, role: 'patient' | 'doctor', content: string): Promise<void>
  enterDiagnosis(context: ConsultationContext): Promise<DiagnosisSummary>
  listReports(patientId: string): Promise<DiagnosisReport[]>
  compareReports(reportAId: string, reportBId: string): Promise<ReportComparison>
}

export interface ApiEnvelope<T> {
  success: boolean
  code: string
  message: string
  data: T
}

