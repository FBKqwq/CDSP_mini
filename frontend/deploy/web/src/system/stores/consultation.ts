import { defineStore } from 'pinia'
import { computed, reactive, ref, shallowRef } from 'vue'
import { canSendMessage, transitionSession, type SessionAction } from '@/domain/session-machine'
import { createChatTransport } from '@/services/chat-transport-factory'
import type { ChatTransport, ConnectionPhase } from '@/services/chat-transport'
import { toAppError } from '@/services/app-error'
import { llmChartApi } from '@/services/llm-chart-api'
import { loadContextIds, saveContextIds } from '@/services/storage'
import { useAuthStore } from '@/stores/auth'
import { usePatientStore } from '@/stores/patient'
import type {
  ChatMessage,
  ConsultationContext,
  DiagnosisReport,
  DiagnosisStage,
  DiagnosisSummary,
  ExecutionStep,
  ReportComparison,
  SessionState,
  StreamEvent,
} from '@/types/domain'

type WorkbenchTab = 'consultation' | 'diagnosis' | 'reports'

export const useConsultationStore = defineStore('consultation', () => {
  const context = reactive<ConsultationContext>({
    sessionVersion: 0,
    patientId: '',
    diseaseGroupId: '',
    doctorId: '',
    stage: 'consultation',
  })
  const sessionState = ref<SessionState>('IDLE')
  const messages = ref<ChatMessage[]>([])
  const executionSteps = ref<ExecutionStep[]>([])
  const thinkingSummary = ref('')
  const connectionDetail = ref('尚未开始问诊')
  const activeTab = ref<WorkbenchTab>('consultation')
  const loadingContext = ref(false)
  const enteringDiagnosis = ref(false)
  const diagnosis = ref<DiagnosisSummary | null>(null)
  const reports = ref<DiagnosisReport[]>([])
  const comparison = ref<ReportComparison | null>(null)
  const comparing = ref(false)
  const errorMessage = ref('')
  const transport = shallowRef<ChatTransport | null>(null)
  const activeAssistantMessageId = ref<string | null>(null)
  const backgroundInterrupted = ref(false)

  const patientStore = usePatientStore()
  const authStore = useAuthStore()

  const hasCompleteContext = computed(
    () => Boolean(context.patientId && context.diseaseGroupId && context.doctorId),
  )
  const canSend = computed(() => hasCompleteContext.value && canSendMessage(sessionState.value))
  const isStreaming = computed(
    () => sessionState.value === 'SENDING' || sessionState.value === 'STREAMING',
  )
  const canEnterDiagnosis = computed(
    () => messages.value.some((message) => message.role === 'user' && message.status === 'sent') && !isStreaming.value,
  )

  function currentVersion(version: number): boolean {
    return version === context.sessionVersion
  }

  function move(action: SessionAction): void {
    sessionState.value = transitionSession(sessionState.value, action)
  }

  function resetSessionView(): void {
    messages.value = []
    executionSteps.value = []
    thinkingSummary.value = ''
    diagnosis.value = null
    reports.value = []
    comparison.value = null
    activeAssistantMessageId.value = null
    errorMessage.value = ''
    connectionDetail.value = '尚未开始问诊'
    context.instanceId = undefined
    context.consultationId = undefined
    context.stage = 'consultation'
    sessionState.value = 'IDLE'
  }

  async function initialize(): Promise<void> {
    await patientStore.loadAll()
    if (!patientStore.patients.length || !patientStore.diseaseGroups.length) return
    const cached = loadContextIds()
    const patientId = patientStore.findPatient(cached?.patientId ?? '')?.id ?? patientStore.patients[0].id
    const disease = patientStore.findDisease(cached?.diseaseGroupId ?? '') ?? patientStore.diseaseGroups[0]
    const doctor = disease.doctors.find((item) => item.id === cached?.doctorId && item.enabled)
      ?? disease.doctors.find((item) => item.enabled)
    if (!doctor) return
    context.patientId = patientId
    context.diseaseGroupId = disease.id
    context.doctorId = doctor.id
    context.sessionVersion += 1
    saveContext()
    await restoreContext()
  }

  async function changeContext(patch: Partial<Pick<ConsultationContext, 'patientId' | 'diseaseGroupId' | 'doctorId'>>): Promise<void> {
    const next = { ...context, ...patch }
    if (
      next.patientId === context.patientId &&
      next.diseaseGroupId === context.diseaseGroupId &&
      next.doctorId === context.doctorId
    ) {
      return
    }
    transport.value?.close()
    transport.value = null
    context.sessionVersion += 1
    context.patientId = next.patientId
    context.diseaseGroupId = next.diseaseGroupId
    context.doctorId = next.doctorId
    resetSessionView()
    saveContext()
    await restoreContext()
  }

  function saveContext(): void {
    if (!hasCompleteContext.value) return
    saveContextIds({
      patientId: context.patientId,
      diseaseGroupId: context.diseaseGroupId,
      doctorId: context.doctorId,
    })
  }

  async function restoreContext(): Promise<void> {
    if (!hasCompleteContext.value) return
    const version = context.sessionVersion
    const snapshot = { ...context }
    loadingContext.value = true
    errorMessage.value = ''
    try {
      const [consultation, reportRows] = await Promise.all([
        llmChartApi.getConsultation(snapshot),
        llmChartApi.listReports(snapshot.patientId),
      ])
      if (!currentVersion(version)) return
      if (consultation) {
        context.consultationId = consultation.id
        messages.value = consultation.messages
        diagnosis.value = consultation.diagnosis ?? null
        if (consultation.diagnosis) context.stage = consultation.diagnosis.stage
      }
      reports.value = reportRows
    } catch (error) {
      if (currentVersion(version)) errorMessage.value = toAppError(error).message
    } finally {
      if (currentVersion(version)) loadingContext.value = false
    }
  }

  async function startChat(): Promise<void> {
    if (!hasCompleteContext.value || sessionState.value === 'CREATING_INSTANCE') return
    const version = context.sessionVersion
    errorMessage.value = ''
    if (sessionState.value !== 'IDLE') move('RESET')
    move('START')
    connectionDetail.value = '正在创建安全问诊会话'
    try {
      const created = await llmChartApi.createChatInstance({ ...context })
      if (!currentVersion(version)) return
      context.instanceId = created.instanceId
      move('INSTANCE_CREATED')
      bindTransport(version, created.instanceId)
      await transport.value?.connect()
      if (!currentVersion(version)) return
      if (sessionState.value === 'CONNECTING') move('SOCKET_OPEN')
      connectionDetail.value = '连接安全，可开始问诊'
      if (!messages.value.length) {
        messages.value.push({
          id: `greeting-${Date.now()}`,
          role: 'assistant',
          content: '您好，我是中医智能诊疗助手。请描述当前最困扰您的症状，以及持续时间、舌苔、睡眠和饮食情况。',
          status: 'sent',
          createdAt: Date.now(),
        })
      }
    } catch (error) {
      if (!currentVersion(version)) return
      failSession(toAppError(error).message)
    }
  }

  function bindTransport(version: number, instanceId: string): void {
    transport.value?.close()
    const token = authStore.session?.accessToken ?? ''
    transport.value = createChatTransport({
      instanceId,
      accessToken: token,
      sessionVersion: version,
      isCurrentVersion: currentVersion,
      onEvent: (event) => handleStreamEvent(version, event),
      onPhase: (phase, detail) => handleConnectionPhase(version, phase, detail),
    })
  }

  async function sendMessage(content: string): Promise<void> {
    const normalized = content.trim()
    if (!normalized || !canSend.value || !transport.value) return
    const version = context.sessionVersion
    const message: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: normalized,
      status: 'pending',
      createdAt: Date.now(),
    }
    messages.value.push(message)
    thinkingSummary.value = '正在接收问题'
    executionSteps.value = []
    move('SEND')
    try {
      await transport.value.send(normalized)
      if (!currentVersion(version)) return
      message.status = 'sent'
      if (sessionState.value === 'SENDING') move('STREAM_START')
      void llmChartApi.saveRecord({ ...context }, 'patient', normalized)
    } catch (error) {
      if (!currentVersion(version)) return
      message.status = 'failed'
      failSession(toAppError(error, 'STREAM_INTERRUPTED').message)
    }
  }

  function handleStreamEvent(version: number, event: StreamEvent): void {
    if (!currentVersion(version)) return
    if (event.type === 'thinking') {
      thinkingSummary.value = event.content || '正在分析病情'
      return
    }
    if (event.type === 'output_step' || event.type === 'tool_call' || event.type === 'tool_result') {
      const id = `${event.type}-${event.stepNumber ?? event.id}`
      const existing = executionSteps.value.find((step) => step.id === id)
      const status = event.type === 'tool_result' ? 'success' : 'running'
      if (existing) {
        existing.detail = event.content ?? existing.detail
        existing.status = status
      } else {
        executionSteps.value.push({
          id,
          label: event.stepName || (event.type === 'tool_call' ? '业务工具' : event.type === 'tool_result' ? '工具结果' : '执行步骤'),
          detail: event.content ?? '',
          status,
        })
      }
      return
    }
    if (event.type === 'output') {
      appendAssistantOutput(event.content ?? '')
      return
    }
    if (event.type === 'chat_message' && event.content) {
      messages.value.push({
        id: event.id,
        role: 'assistant',
        content: event.content,
        status: 'sent',
        createdAt: event.timestamp ?? Date.now(),
      })
      return
    }
    if (event.type === 'output_end') {
      const message = messages.value.find((item) => item.id === activeAssistantMessageId.value)
      if (message) {
        message.status = 'sent'
        void llmChartApi.saveRecord({ ...context }, 'doctor', message.content)
      }
      activeAssistantMessageId.value = null
      thinkingSummary.value = ''
      executionSteps.value.forEach((step) => {
        if (step.status === 'running') step.status = 'success'
      })
      if (sessionState.value === 'STREAMING') move('STREAM_END')
      connectionDetail.value = '本轮问诊已完成'
      return
    }
    if (event.type === 'error') {
      failSession(event.content || 'AI 输出中断')
    }
  }

  function appendAssistantOutput(content: string): void {
    if (!activeAssistantMessageId.value) {
      const id = `assistant-${Date.now()}`
      activeAssistantMessageId.value = id
      messages.value.push({
        id,
        role: 'assistant',
        content,
        status: 'streaming',
        createdAt: Date.now(),
      })
      return
    }
    const message = messages.value.find((item) => item.id === activeAssistantMessageId.value)
    if (message) message.content += content
  }

  function handleConnectionPhase(
    version: number,
    phase: ConnectionPhase,
    detail?: string,
  ): void {
    if (!currentVersion(version)) return
    if (phase === 'connecting') connectionDetail.value = '正在建立安全连接'
    if (phase === 'streaming' && sessionState.value === 'SENDING') move('STREAM_START')
    if (phase === 'reconnecting') {
      if (['CONNECTING', 'READY', 'SENDING', 'STREAMING', 'COMPLETED'].includes(sessionState.value)) {
        move('INTERRUPT')
      }
      if (sessionState.value === 'INTERRUPTED') move('RECONNECT')
      connectionDetail.value = detail || '正在恢复连接'
    }
    if (phase === 'ready' && sessionState.value === 'RECONNECTING') {
      move('SOCKET_OPEN')
      connectionDetail.value = '连接已恢复'
    }
    if (phase === 'failed') failSession(detail || '连接恢复失败')
  }

  function failSession(message: string): void {
    errorMessage.value = message
    connectionDetail.value = message
    if (sessionState.value !== 'FAILED') {
      try {
        move('FAIL')
      } catch {
        sessionState.value = 'FAILED'
      }
    }
  }

  async function enterDiagnosis(): Promise<void> {
    if (!canEnterDiagnosis.value || enteringDiagnosis.value) return
    const version = context.sessionVersion
    enteringDiagnosis.value = true
    errorMessage.value = ''
    try {
      const result = await llmChartApi.enterDiagnosis({ ...context })
      if (!currentVersion(version)) return
      diagnosis.value = result
      context.stage = result.stage
      activeTab.value = 'diagnosis'
      reports.value = await llmChartApi.listReports(context.patientId)
    } catch (error) {
      if (currentVersion(version)) errorMessage.value = toAppError(error).message
    } finally {
      if (currentVersion(version)) enteringDiagnosis.value = false
    }
  }

  async function compareReports(reportAId: string, reportBId: string): Promise<void> {
    if (reportAId === reportBId || comparing.value) return
    const version = context.sessionVersion
    comparing.value = true
    comparison.value = null
    try {
      const result = await llmChartApi.compareReports(reportAId, reportBId)
      if (currentVersion(version)) comparison.value = result
    } catch (error) {
      if (currentVersion(version)) errorMessage.value = toAppError(error).message
    } finally {
      if (currentVersion(version)) comparing.value = false
    }
  }

  function setStage(stage: DiagnosisStage): void {
    context.stage = stage
  }

  function handleBackground(): void {
    if (!transport.value) return
    backgroundInterrupted.value = true
    transport.value.close()
    transport.value = null
    if (['CONNECTING', 'READY', 'SENDING', 'STREAMING', 'COMPLETED'].includes(sessionState.value)) {
      move('INTERRUPT')
      connectionDetail.value = '小程序进入后台，连接已安全暂停'
    }
  }

  async function handleForeground(): Promise<void> {
    if (!backgroundInterrupted.value || !context.instanceId || !hasCompleteContext.value) return
    backgroundInterrupted.value = false
    const version = context.sessionVersion
    if (sessionState.value === 'INTERRUPTED') move('RECONNECT')
    bindTransport(version, context.instanceId)
    try {
      await transport.value?.connect()
      if (!currentVersion(version)) return
      if (sessionState.value === 'RECONNECTING') move('SOCKET_OPEN')
      await restoreContext()
    } catch (error) {
      if (currentVersion(version)) failSession(toAppError(error, 'STREAM_INTERRUPTED').message)
    }
  }

  function resetAll(): void {
    transport.value?.close()
    transport.value = null
    context.sessionVersion += 1
    context.patientId = ''
    context.diseaseGroupId = ''
    context.doctorId = ''
    resetSessionView()
    activeTab.value = 'consultation'
  }

  return {
    context,
    sessionState,
    messages,
    executionSteps,
    thinkingSummary,
    connectionDetail,
    activeTab,
    loadingContext,
    enteringDiagnosis,
    diagnosis,
    reports,
    comparison,
    comparing,
    errorMessage,
    hasCompleteContext,
    canSend,
    isStreaming,
    canEnterDiagnosis,
    initialize,
    changeContext,
    restoreContext,
    startChat,
    sendMessage,
    enterDiagnosis,
    compareReports,
    setStage,
    handleBackground,
    handleForeground,
    resetAll,
  }
})
