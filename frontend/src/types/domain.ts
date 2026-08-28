export interface UserSummary {
  id: string
  displayName: string
  role: string
}

export interface AuthSession {
  accessToken: string
  expiresAt: number
  user: UserSummary
}

export interface PatientProfile {
  id: string
  code: string
  name: string
  gender: '男' | '女' | '未知'
  birthDate?: string | null
  age?: number | null
  lockVersion: number
}

export interface ConsultationExpert {
  id: string
  name: string
  title: string
  specialty: string
  enabled: boolean
  unavailableReason?: string
}

export interface MedicalHistory {
  id: string
  name: string
  description?: string | null
  diagnosedAt?: string | null
  lockVersion: number
}

export type DiagnosisStage =
  | 'consultation'
  | 'preliminary'
  | 'collaboration'
  | 'comprehensive'

export interface ConsultationContext {
  sessionVersion: number
  patientId: string
  medicalHistoryId?: string
  expertId: string
  consultationId?: string
  instanceId?: string
  stage: DiagnosisStage
}

export type ChatRole = 'user' | 'assistant' | 'system'
export type MessageStatus = 'pending' | 'streaming' | 'sent' | 'failed'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  status: MessageStatus
  createdAt: number
}

export type SessionState =
  | 'IDLE'
  | 'CREATING_INSTANCE'
  | 'CONNECTING'
  | 'READY'
  | 'SENDING'
  | 'STREAMING'
  | 'COMPLETED'
  | 'INTERRUPTED'
  | 'RECONNECTING'
  | 'FAILED'

export type StreamEventType =
  | 'thinking'
  | 'output_step'
  | 'tool_call'
  | 'tool_result'
  | 'output'
  | 'output_end'
  | 'chat_message'
  | 'stats'
  | 'error'
  | 'system'

export interface StreamEvent {
  id: string
  type: StreamEventType
  content?: string
  stepNumber?: string
  stepName?: string
  timestamp?: number
}

export interface ExecutionStep {
  id: string
  label: string
  detail: string
  status: 'running' | 'success' | 'failed'
}

export interface SyndromeScore {
  name: string
  value: number
  max: number
}

export interface DiagnosisSummary {
  primaryDiagnosis: string
  syndrome: string
  evidence: string[]
  advice: string
  updatedAt: string
  stage: DiagnosisStage
  syndromeScores: SyndromeScore[]
}

export interface PrescriptionItem {
  medicine: string
  dosage: string
  usage: string
}

export interface Prescription {
  name: string
  items: PrescriptionItem[]
  instructions: string
  cautions?: string
}

export interface TreatmentResult {
  diagnosis: DiagnosisSummary
  prescription?: Prescription
}

export interface DiagnosisReport {
  id: string
  patientId: string
  createdAt: string
  diseaseName: string
  status: 'draft' | 'completed'
  diagnosis: DiagnosisSummary
  prescription?: Prescription
}

export interface ReportComparisonItem {
  key: string
  label: string
  reportA: string
  reportB: string
  summary: string
}

export interface ReportComparison {
  reportAId: string
  reportBId: string
  items: ReportComparisonItem[]
}

export interface ConsultationSnapshot {
  id: string
  context: ConsultationContext
  messages: ChatMessage[]
  diagnosis?: DiagnosisSummary
  prescription?: Prescription
}
