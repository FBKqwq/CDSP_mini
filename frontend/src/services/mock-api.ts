import { AppError } from '@/services/app-error'
import { compareReportRecords } from '@/domain/report-comparison'
import type {
  CreateChatInstanceResult,
  LlmChartApi,
  LoginInput,
  MedicalHistoryCreateInput,
  MedicalHistoryUpdateInput,
  UpdatePatientProfileInput,
} from '@/types/api'
import type {
  AuthSession,
  ChatMessage,
  ConsultationContext,
  ConsultationSnapshot,
  DiagnosisReport,
  DiagnosisSummary,
  ConsultationExpert,
  MedicalHistory,
  PatientProfile,
  Prescription,
  ReportComparison,
  TreatmentResult,
  UserSummary,
} from '@/types/domain'

const wait = (milliseconds = 180) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const todayText = () => new Date().toISOString().slice(0, 10)

function calculateAge(birthDate?: string): number | undefined {
  if (!birthDate) return undefined
  const [year, month, day] = birthDate.split('-').map(Number)
  const today = new Date()
  return today.getFullYear() - year - (
    today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day) ? 1 : 0
  )
}

const user: UserSummary = {
  id: 'user-patient-001',
  displayName: '李女士',
  role: 'patient',
}

let patientProfile: PatientProfile = {
  id: 'patient-001',
  code: 'P20260819001',
  name: '李女士',
  gender: '女',
  birthDate: '1980-02-01',
  age: calculateAge('1980-02-01'),
  lockVersion: 0,
}

let medicalHistories: MedicalHistory[] = [
  {
    id: 'history-metabolic',
    name: '代谢综合征',
    description: '既往诊断，持续随访中',
    diagnosedAt: '2025-11-18',
    lockVersion: 0,
  },
  {
    id: 'history-hypertension',
    name: '高血压',
    description: '既往诊断，规律监测血压',
    diagnosedAt: '2024-06-03',
    lockVersion: 0,
  },
]
const deletedHistoryIds = new Set<string>()

const consultationExperts: ConsultationExpert[] = [
  { id: 'expert-fang', name: '方邦江', title: '主任医师', specialty: '代谢与脾胃', enabled: true },
  { id: 'expert-liu', name: '刘清泉', title: '主任医师', specialty: '急症与体质', enabled: true },
  { id: 'expert-zhang', name: '张教授', title: '主任医师', specialty: '心脑血管', enabled: true },
  {
    id: 'expert-remote',
    name: '王教授',
    title: '特邀专家',
    specialty: '脑血管康复',
    enabled: false,
    unavailableReason: '当前不在问诊时段',
  },
]

const diagnosisA: DiagnosisSummary = {
  primaryDiagnosis: '代谢综合征（风险期）',
  syndrome: '痰湿内阻证',
  evidence: ['形体偏胖，脘腹胀满', '口黏困倦，舌苔白腻', '饮食不节且运动不足'],
  advice: '建议调畅气机、健脾化湿，并结合血糖、血脂复查结果动态评估。',
  updatedAt: '2026-08-19 10:42',
  stage: 'comprehensive',
  syndromeScores: [
    { name: '痰湿', value: 82, max: 100 },
    { name: '脾虚', value: 68, max: 100 },
    { name: '气滞', value: 55, max: 100 },
    { name: '湿热', value: 36, max: 100 },
    { name: '阴虚', value: 24, max: 100 },
  ],
}

const diagnosisB: DiagnosisSummary = {
  ...diagnosisA,
  syndrome: '脾虚痰湿证',
  advice: '继续健脾化湿，晚餐减少精制碳水，并于四周后复查血糖和血脂。',
  updatedAt: '2026-07-22 15:16',
  syndromeScores: diagnosisA.syndromeScores.map((item, index) => ({
    ...item,
    value: Math.max(12, item.value - (index + 1) * 4),
  })),
}

const prescriptionA: Prescription = {
  name: '健脾化湿调理方',
  items: [
    { medicine: '茯苓', dosage: '15g', usage: '水煎服' },
    { medicine: '白术', dosage: '10g', usage: '水煎服' },
    { medicine: '陈皮', dosage: '6g', usage: '水煎服' },
    { medicine: '泽泻', dosage: '10g', usage: '水煎服' },
  ],
  instructions: '每日一剂，早晚温服。',
  cautions: '处方仅展示服务端记录，实际用药须由医师复核。',
}

let reports: DiagnosisReport[] = [
  {
    id: 'report-20260819',
    patientId: 'patient-001',
    createdAt: '2026-08-19 10:42',
    diseaseName: '代谢综合征',
    status: 'completed',
    diagnosis: diagnosisA,
    prescription: prescriptionA,
  },
  {
    id: 'report-20260722',
    patientId: 'patient-001',
    createdAt: '2026-07-22 15:16',
    diseaseName: '代谢综合征',
    status: 'completed',
    diagnosis: diagnosisB,
    prescription: {
      name: '参苓白术散加减',
      items: [
        { medicine: '党参', dosage: '10g', usage: '水煎服' },
        { medicine: '茯苓', dosage: '12g', usage: '水煎服' },
        { medicine: '白术', dosage: '10g', usage: '水煎服' },
      ],
      instructions: '每日一剂，饭后温服。',
    },
  },
]

const snapshots = new Map<string, ConsultationSnapshot>()

function contextKey(context: ConsultationContext): string {
  return [context.patientId, context.medicalHistoryId || 'new-question', context.expertId].join(':')
}

export class MockLlmChartApi implements LlmChartApi {
  async login(input: LoginInput): Promise<AuthSession> {
    await wait()
    if (input.username !== 'patient' || input.password !== 'demo123') {
      throw new AppError('AUTH_INVALID')
    }
    return {
      accessToken: `mock-${Date.now()}`,
      expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      user: clone(user),
    }
  }

  async logout(): Promise<void> {
    await wait(80)
  }

  async me(): Promise<UserSummary> {
    await wait(100)
    return clone(user)
  }

  async getPatientProfile(): Promise<PatientProfile> {
    await wait()
    return clone(patientProfile)
  }

  async updatePatientProfile(input: UpdatePatientProfileInput): Promise<PatientProfile> {
    await wait()
    const name = input.name.trim()
    if (!name || (input.birthDate !== undefined && input.birthDate > todayText())) {
      throw new AppError('VALIDATION_ERROR')
    }
    if (input.lockVersion !== patientProfile.lockVersion) {
      throw new AppError('VERSION_CONFLICT')
    }
    patientProfile = {
      ...patientProfile,
      name,
      gender: input.gender,
      birthDate: input.birthDate || undefined,
      age: calculateAge(input.birthDate),
      lockVersion: patientProfile.lockVersion + 1,
    }
    return clone(patientProfile)
  }

  async listMedicalHistories(): Promise<MedicalHistory[]> {
    await wait()
    return clone(medicalHistories)
  }

  async createMedicalHistory(input: MedicalHistoryCreateInput): Promise<MedicalHistory> {
    await wait()
    const name = input.name.trim()
    if (!name || (input.diagnosedAt !== undefined && input.diagnosedAt > todayText())) {
      throw new AppError('VALIDATION_ERROR')
    }
    const history: MedicalHistory = {
      id: `history-${Date.now()}-${medicalHistories.length}`,
      name,
      description: input.description?.trim() || undefined,
      diagnosedAt: input.diagnosedAt || undefined,
      lockVersion: 0,
    }
    medicalHistories = [...medicalHistories, history]
    return clone(history)
  }

  async updateMedicalHistory(
    historyId: string,
    input: MedicalHistoryUpdateInput,
  ): Promise<MedicalHistory> {
    await wait()
    const index = medicalHistories.findIndex((history) => history.id === historyId)
    if (index < 0) throw new AppError('HISTORY_NOT_FOUND')
    const name = input.name.trim()
    if (!name || (input.diagnosedAt !== undefined && input.diagnosedAt > todayText())) {
      throw new AppError('VALIDATION_ERROR')
    }
    if (input.lockVersion !== medicalHistories[index].lockVersion) {
      throw new AppError('VERSION_CONFLICT')
    }
    const history: MedicalHistory = {
      id: historyId,
      name,
      description: input.description?.trim() || undefined,
      diagnosedAt: input.diagnosedAt || undefined,
      lockVersion: medicalHistories[index].lockVersion + 1,
    }
    medicalHistories = medicalHistories.map((item) => (item.id === historyId ? history : item))
    return clone(history)
  }

  async deleteMedicalHistory(historyId: string): Promise<void> {
    await wait()
    if (!medicalHistories.some((history) => history.id === historyId)) {
      if (deletedHistoryIds.has(historyId)) return
      throw new AppError('HISTORY_NOT_FOUND')
    }
    medicalHistories = medicalHistories.filter((history) => history.id !== historyId)
    deletedHistoryIds.add(historyId)
  }

  async listConsultationExperts(): Promise<ConsultationExpert[]> {
    await wait()
    return clone(consultationExperts)
  }

  async getConsultation(context: ConsultationContext): Promise<ConsultationSnapshot | null> {
    await wait()
    return clone(snapshots.get(contextKey(context)) ?? null)
  }

  async createChatInstance(context: ConsultationContext): Promise<CreateChatInstanceResult> {
    await wait(260)
    if (!context.patientId || !context.expertId) {
      throw new AppError('CONTEXT_INVALID')
    }
    const key = contextKey(context)
    if (!snapshots.has(key)) {
      const greeting: ChatMessage = {
        id: `greeting-${Date.now()}`,
        role: 'assistant',
        content: '您好，我会协助问诊专家了解您的情况。请描述当前最困扰您的症状、持续时间，以及睡眠和饮食情况。',
        status: 'sent',
        createdAt: Date.now(),
      }
      snapshots.set(key, {
        id: `consultation-${Date.now()}`,
        context: clone(context),
        messages: [greeting],
      })
    }
    return { instanceId: `instance-${Date.now()}` }
  }

  async saveRecord(
    context: ConsultationContext,
    role: 'patient' | 'assistant',
    content: string,
  ): Promise<void> {
    await wait(80)
    const snapshot = snapshots.get(contextKey(context))
    if (!snapshot) return
    snapshot.messages.push({
      id: `record-${Date.now()}-${snapshot.messages.length}`,
      role: role === 'patient' ? 'user' : 'assistant',
      content,
      status: 'sent',
      createdAt: Date.now(),
    })
  }

  async enterDiagnosis(context: ConsultationContext): Promise<TreatmentResult> {
    await wait(520)
    const diagnosis = clone(diagnosisA)
    const prescription = clone(prescriptionA)
    const snapshot = snapshots.get(contextKey(context))
    if (snapshot) {
      snapshot.diagnosis = diagnosis
      snapshot.prescription = prescription
    }
    return { diagnosis, prescription }
  }

  async listReports(patientId: string): Promise<DiagnosisReport[]> {
    await wait()
    return clone(reports.filter((report) => report.patientId === patientId))
  }

  async compareReports(reportAId: string, reportBId: string): Promise<ReportComparison> {
    await wait(300)
    const a = reports.find((report) => report.id === reportAId)
    const b = reports.find((report) => report.id === reportBId)
    if (!a || !b) throw new AppError('CONTEXT_INVALID', '所选报告不存在或无权访问')
    return compareReportRecords(a, b)
  }
}
