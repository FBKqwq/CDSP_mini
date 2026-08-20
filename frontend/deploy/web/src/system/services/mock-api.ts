import { AppError } from '@/services/app-error'
import { compareReportRecords } from '@/domain/report-comparison'
import type {
  CreateChatInstanceResult,
  CreatePatientInput,
  LlmChartApi,
  LoginInput,
} from '@/types/api'
import type {
  AuthSession,
  ChatMessage,
  ConsultationContext,
  ConsultationSnapshot,
  DiagnosisReport,
  DiagnosisSummary,
  DiseaseGroup,
  Patient,
  ReportComparison,
  UserSummary,
} from '@/types/domain'

const wait = (milliseconds = 180) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const user: UserSummary = {
  id: 'doctor-001',
  displayName: '陈医生',
  role: '主治医师',
  organization: '中医智能诊疗中心',
}

const diseaseGroups: DiseaseGroup[] = [
  {
    id: 'metabolic',
    name: '代谢综合征',
    description: '结合中医辨证与代谢指标进行综合评估',
    doctors: [
      { id: 'doctor-fang', name: '方邦江', title: '主任医师', specialty: '代谢与脾胃', enabled: true },
      { id: 'doctor-liu', name: '刘清泉', title: '主任医师', specialty: '急症与体质', enabled: true },
    ],
  },
  {
    id: 'cardiovascular',
    name: '心脑血管',
    description: '围绕胸闷、心悸、眩晕等症状进行辨证',
    doctors: [
      { id: 'doctor-zhang', name: '张教授', title: '主任医师', specialty: '心脑血管', enabled: true },
      {
        id: 'doctor-remote',
        name: '王教授',
        title: '特邀专家',
        specialty: '脑血管康复',
        enabled: false,
        unavailableReason: '当前不在排班时间',
      },
    ],
  },
]

let patients: Patient[] = [
  { id: 'patient-001', code: 'P20260819001', name: '李女士', gender: '女', age: 46 },
  { id: 'patient-002', code: 'P20260819002', name: '周先生', gender: '男', age: 58 },
  { id: 'patient-003', code: 'P20260819003', name: '赵女士', gender: '女', age: 35 },
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

let reports: DiagnosisReport[] = [
  {
    id: 'report-20260819',
    patientId: 'patient-001',
    createdAt: '2026-08-19 10:42',
    diseaseName: '代谢综合征',
    status: 'completed',
    diagnosis: diagnosisA,
    prescription: {
      name: '健脾化湿调理方',
      items: [
        { medicine: '茯苓', dosage: '15g', usage: '水煎服' },
        { medicine: '白术', dosage: '10g', usage: '水煎服' },
        { medicine: '陈皮', dosage: '6g', usage: '水煎服' },
        { medicine: '泽泻', dosage: '10g', usage: '水煎服' },
      ],
      instructions: '每日一剂，早晚温服。',
      cautions: '处方仅展示服务端记录，实际用药须由医师复核。',
    },
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
  return [context.patientId, context.diseaseGroupId, context.doctorId].join(':')
}

export class MockLlmChartApi implements LlmChartApi {
  async login(input: LoginInput): Promise<AuthSession> {
    await wait()
    if (input.username !== 'doctor' || input.password !== 'demo123') {
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

  async listPatients(query = ''): Promise<Patient[]> {
    await wait()
    const keyword = query.trim().toLowerCase()
    return clone(
      patients.filter(
        (patient) =>
          !keyword ||
          patient.name.toLowerCase().includes(keyword) ||
          patient.code.toLowerCase().includes(keyword),
      ),
    )
  }

  async createPatient(input: CreatePatientInput): Promise<Patient> {
    await wait()
    const name = input.name.trim()
    if (!name || name.length > 30) throw new AppError('VALIDATION_ERROR', '姓名长度应为 1～30 个字符')
    const patient: Patient = {
      id: `patient-${Date.now()}`,
      code: `P${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(patients.length + 1).padStart(3, '0')}`,
      name,
      gender: input.gender,
      age: input.age,
    }
    patients = [patient, ...patients]
    return clone(patient)
  }

  async deletePatient(patientId: string): Promise<void> {
    await wait()
    if (!patients.some((patient) => patient.id === patientId)) {
      throw new AppError('CONTEXT_INVALID', '患者不存在或已被删除')
    }
    patients = patients.filter((patient) => patient.id !== patientId)
    reports = reports.filter((report) => report.patientId !== patientId)
  }

  async listDiseaseGroups(): Promise<DiseaseGroup[]> {
    await wait()
    return clone(diseaseGroups)
  }

  async getConsultation(context: ConsultationContext): Promise<ConsultationSnapshot | null> {
    await wait()
    return clone(snapshots.get(contextKey(context)) ?? null)
  }

  async createChatInstance(context: ConsultationContext): Promise<CreateChatInstanceResult> {
    await wait(260)
    if (!context.patientId || !context.diseaseGroupId || !context.doctorId) {
      throw new AppError('CONTEXT_INVALID')
    }
    const key = contextKey(context)
    if (!snapshots.has(key)) {
      const greeting: ChatMessage = {
        id: `greeting-${Date.now()}`,
        role: 'assistant',
        content: '您好，我是中医智能诊疗助手。请描述当前最困扰您的症状，以及持续时间、舌苔、睡眠和饮食情况。',
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
    role: 'patient' | 'doctor',
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

  async enterDiagnosis(context: ConsultationContext): Promise<DiagnosisSummary> {
    await wait(520)
    const diagnosis = clone(diagnosisA)
    const snapshot = snapshots.get(contextKey(context))
    if (snapshot) snapshot.diagnosis = diagnosis
    return diagnosis
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
