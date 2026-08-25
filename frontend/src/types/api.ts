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

  // 新需求：编辑出生日期，不编辑年龄
  birthDate?: string

  // 乐观锁
  lockVersion: number
}


export interface MedicalHistoryInput {
  name: string
  description?: string
  diagnosedAt?: string

  // 新增时可以没有
  // 修改时必须传
  lockVersion?: number
}


export interface LlmChartApi {
  login(input: LoginInput): Promise<AuthSession>

  logout(): Promise<void>

  me(): Promise<UserSummary>


  getPatientProfile(): Promise<PatientProfile>

  updatePatientProfile(
      input: UpdatePatientProfileInput,
  ): Promise<PatientProfile>


  listMedicalHistories(): Promise<MedicalHistory[]>

  createMedicalHistory(
      input: MedicalHistoryInput,
  ): Promise<MedicalHistory>


  updateMedicalHistory(
      historyId: string,
      input: MedicalHistoryInput,
  ): Promise<MedicalHistory>


  deleteMedicalHistory(
      historyId: string,
  ): Promise<void>


  listConsultationExperts(): Promise<ConsultationExpert[]>


  getConsultation(
      context: ConsultationContext,
  ): Promise<ConsultationSnapshot | null>


  createChatInstance(
      context: ConsultationContext,
  ): Promise<CreateChatInstanceResult>


  saveRecord(
      context: ConsultationContext,
      role: 'patient' | 'assistant',
      content: string,
  ): Promise<void>


  enterDiagnosis(
      context: ConsultationContext,
  ): Promise<TreatmentResult>


  listReports(
      patientId: string,
  ): Promise<DiagnosisReport[]>


  compareReports(
      reportAId: string,
      reportBId: string,
  ): Promise<ReportComparison>
}


export interface ApiEnvelope<T> {
  success: boolean
  code: string
  message: string
  data: T
}