<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import SafeRichText from '@/components/common/SafeRichText.vue'
import StateBlock from '@/components/common/StateBlock.vue'
import { useConsultationStore } from '@/stores/consultation'
import { useHealthContextStore } from '@/stores/health-context'

const store = useConsultationStore()
const healthContextStore = useHealthContextStore()
const input = ref('')
const detailsExpanded = ref(false)
const atBottom = ref(true)
const scrollAnchor = ref('')
const messageListHeight = ref(0)
const startCardHeight = ref(0)
const componentInstance = getCurrentInstance()?.proxy
let layoutTimer: ReturnType<typeof setTimeout> | undefined
const assistantAvatar = computed(() =>
  healthContextStore.findConsultationExpert(store.context.expertId)?.name.slice(0, 1) || '医',
)

const statusLabel = computed(() => {
  const labels = {
    IDLE: '未连接',
    CREATING_INSTANCE: '创建会话',
    CONNECTING: '连接中',
    READY: '已连接',
    SENDING: '发送中',
    STREAMING: 'AI 输出中',
    COMPLETED: '本轮完成',
    INTERRUPTED: '连接中断',
    RECONNECTING: '恢复中',
    FAILED: '需要处理',
  }
  return labels[store.sessionState]
})

const statusTone = computed(() => {
  if (['READY', 'COMPLETED'].includes(store.sessionState)) return 'ok'
  if (['FAILED', 'INTERRUPTED'].includes(store.sessionState)) return 'danger'
  if (['CONNECTING', 'RECONNECTING', 'STREAMING', 'SENDING', 'CREATING_INSTANCE'].includes(store.sessionState)) return 'busy'
  return 'neutral'
})

const messageListStyle = computed(() => (
  messageListHeight.value ? { height: `${messageListHeight.value}px` } : undefined
))

const startCardStyle = computed(() => (
  startCardHeight.value ? { height: `${startCardHeight.value}px` } : undefined
))

function measureStartArea(attempt = 0): void {
  if (store.activeTab !== 'consultation' || store.loadingContext || store.sessionState !== 'IDLE' || store.messages.length) return

  void nextTick(() => {
    const query = uni.createSelectorQuery()
    if (componentInstance) query.in(componentInstance)
    query.select('.start-card').boundingClientRect()
    query.exec((results) => {
      const cardRect = results?.[0] as { top?: number } | undefined
      const cardTop = Number(cardRect?.top ?? 0)
      const windowInfo = uni.getWindowInfo()
      const safeBottom = Number(windowInfo.safeAreaInsets?.bottom ?? 0)
      const height = Math.floor(windowInfo.windowHeight - cardTop - uni.upx2px(128) - safeBottom - 8)
      if (cardTop > 0 && height >= 200) {
        startCardHeight.value = height
        return
      }
      if (attempt < 4) layoutTimer = setTimeout(() => measureStartArea(attempt + 1), 80)
    })
  })
}

function measureMessageArea(attempt = 0): void {
  if (store.activeTab !== 'consultation' || store.loadingContext || (store.sessionState === 'IDLE' && !store.messages.length)) return

  void nextTick(() => {
    const query = uni.createSelectorQuery()
    if (componentInstance) query.in(componentInstance)
    query.select('.message-list').boundingClientRect()
    query.select('.composer-dock').boundingClientRect()
    query.exec((results) => {
      const listRect = results?.[0] as { top?: number } | undefined
      const dockRect = results?.[1] as { top?: number } | undefined
      const listTop = Number(listRect?.top ?? 0)
      const dockTop = Number(dockRect?.top ?? 0)
      const height = Math.floor(dockTop - listTop - 8)
      if (listTop > 0 && height >= 180) {
        messageListHeight.value = height
        return
      }
      if (attempt < 4) layoutTimer = setTimeout(() => measureMessageArea(attempt + 1), 80)
    })
  })
}

function scheduleLayout(): void {
  if (layoutTimer) clearTimeout(layoutTimer)
  layoutTimer = setTimeout(() => {
    if (store.sessionState === 'IDLE' && !store.messages.length) measureStartArea()
    else measureMessageArea()
  }, 60)
}

function handleWindowResize(): void {
  scheduleLayout()
}

onMounted(() => {
  uni.onWindowResize(handleWindowResize)
  scheduleLayout()
})

onUnmounted(() => {
  if (layoutTimer) clearTimeout(layoutTimer)
  uni.offWindowResize(handleWindowResize)
})

watch(
  () => store.messages.map((message) => `${message.id}:${message.content.length}`).join('|'),
  async () => {
    if (!atBottom.value) return
    await nextTick()
    const last = store.messages[store.messages.length - 1]
    scrollAnchor.value = last ? `message-${last.id}` : ''
  },
)

watch(
  () => [store.activeTab, store.loadingContext, store.sessionState, store.messages.length],
  scheduleLayout,
)

function handleScroll(event: { detail?: { deltaY?: number } }): void {
  if ((event.detail?.deltaY ?? 0) < -2) atBottom.value = false
}

function jumpToLatest(): void {
  atBottom.value = true
  const last = store.messages[store.messages.length - 1]
  scrollAnchor.value = last ? `message-${last.id}` : ''
}

async function send(): Promise<void> {
  const content = input.value
  if (!content.trim() || !store.canSend) return
  input.value = ''
  atBottom.value = true
  await store.sendMessage(content)
}

function copyMessage(content: string): void {
  uni.setClipboardData({ data: content })
}

async function confirmDiagnosis(): Promise<void> {
  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '生成健康评估？',
      content: '将提交本次问诊信息并生成分析结果。结果仅供健康参考，不能替代医师面诊。',
      confirmText: '确认生成',
      confirmColor: '#176B4D',
      success: (result) => resolve(result.confirm),
      fail: () => resolve(false),
    })
  })
  if (confirmed) await store.enterDiagnosis()
}
</script>

<template>
  <view class="consultation-panel">
    <view class="connection-bar">
      <view class="connection-left">
        <text class="status-dot" :class="statusTone" />
        <text class="status-label">{{ statusLabel }}</text>
        <text class="status-detail">{{ store.connectionDetail }}</text>
      </view>
      <button v-if="store.sessionState === 'FAILED'" class="mini-retry" @tap="store.startChat">重新连接</button>
    </view>

    <view v-if="store.sessionState === 'IDLE' && !store.messages.length" class="start-card" :style="startCardStyle">
      <view class="start-orbit"><text class="start-mark">AI</text></view>
      <text class="start-eyebrow">智能辨证问诊</text>
      <text class="start-title">从说清您的不适开始</text>
      <text class="start-description">AI 将协助问诊专家了解您的症状和病程。历史疾病可以不关联，但开始前需要选择本次问诊专家。</text>
      <button class="start-button" :disabled="!store.hasCompleteContext" @tap="store.startChat">
        {{ store.hasCompleteContext ? '开始安全问诊' : '请先选择问诊专家' }}
      </button>
      <view class="trust-row">
        <text>会话隔离</text><text>·</text><text>不缓存病历正文</text><text>·</text><text>可中断恢复</text>
      </view>
    </view>

    <StateBlock
      v-else-if="store.loadingContext"
      title="正在恢复问诊记录"
      description="以服务端记录为准，避免使用过期的本地医疗内容。"
      loading
    />

    <template v-else>
      <scroll-view
        class="message-list"
        :style="messageListStyle"
        scroll-y
        :scroll-into-view="scrollAnchor"
        scroll-with-animation
        @scroll="handleScroll"
        @scrolltolower="atBottom = true"
      >
        <view class="message-list-inner">
          <view class="date-separator"><text>本次问诊</text></view>
          <view
            v-for="message in store.messages"
            :id="`message-${message.id}`"
            :key="message.id"
            class="message-row"
            :class="message.role"
          >
            <view v-if="message.role !== 'user'" class="message-avatar assistant-avatar">{{ assistantAvatar }}</view>
            <view class="message-stack">
              <view class="message-bubble" :class="{ failed: message.status === 'failed' }" @longpress="copyMessage(message.content)">
                <SafeRichText :content="message.content" />
                <view v-if="message.status === 'streaming'" class="typing-cursor" />
              </view>
              <view class="message-meta">
                <text>{{ message.role === 'user' ? '我的陈述' : '智能问诊助手' }}</text>
                <text v-if="message.status === 'pending'">发送中</text>
                <text v-else-if="message.status === 'failed'" class="failed-text" @tap="store.sendMessage(message.content)">发送失败 · 重试</text>
              </view>
            </view>
            <view v-if="message.role === 'user'" class="message-avatar patient-avatar">患</view>
          </view>

          <view v-if="store.thinkingSummary || store.executionSteps.length" class="thinking-card">
            <view class="thinking-head" @tap="detailsExpanded = !detailsExpanded">
              <view class="thinking-symbol">✦</view>
              <view class="thinking-copy">
                <text class="thinking-title">{{ store.thinkingSummary || '分析完成' }}</text>
                <text class="thinking-subtitle">{{ store.executionSteps.length }} 个安全执行步骤</text>
              </view>
              <text class="expand-icon">{{ detailsExpanded ? '⌃' : '⌄' }}</text>
            </view>
            <view v-if="detailsExpanded" class="step-list">
              <view v-for="step in store.executionSteps" :key="step.id" class="step-row">
                <text class="step-status" :class="step.status">{{ step.status === 'success' ? '✓' : step.status === 'failed' ? '!' : '·' }}</text>
                <view class="step-copy">
                  <text class="step-label">{{ step.label }}</text>
                  <text class="step-detail">{{ step.detail }}</text>
                </view>
              </view>
            </view>
          </view>

          <button
            v-if="store.canEnterDiagnosis"
            class="diagnosis-action"
            :loading="store.enteringDiagnosis"
            :disabled="store.enteringDiagnosis"
            @tap="confirmDiagnosis"
          >
            <view class="diagnosis-action-copy">
              <text class="diagnosis-action-title">信息已初步收集</text>
              <text class="diagnosis-action-subtitle">确认后生成本次健康评估结果</text>
            </view>
            <text class="diagnosis-action-cta">查看分析 ›</text>
          </button>
          <view class="message-bottom-space" />
        </view>
      </scroll-view>

      <view class="composer-dock">
        <button v-if="!atBottom" class="latest-button" @tap="jumpToLatest">↓ 回到最新</button>
        <view class="composer">
          <textarea
            v-model="input"
            class="composer-input"
            :disabled="!store.canSend"
            :placeholder="store.canSend ? '请输入您的症状、持续时间或补充信息…' : store.isStreaming ? 'AI 正在输出，请稍候' : '连接就绪后可输入'"
            maxlength="1000"
            :auto-height="false"
            confirm-type="send"
            @confirm="send"
          />
          <button class="send-button" :class="{ enabled: input.trim() && store.canSend }" :disabled="!input.trim() || !store.canSend" @tap="send">↑</button>
        </view>
        <text class="composer-tip">AI 内容仅供健康参考，不能替代医师面诊；急症请及时线下就医</text>
      </view>
    </template>
  </view>
</template>

<style scoped>
.consultation-panel { position: relative; min-height: 600rpx; }
.connection-bar { display: flex; min-height: 44rpx; align-items: center; justify-content: space-between; padding: 0 4rpx; }
.connection-left { display: flex; min-width: 0; align-items: center; gap: 9rpx; }
.status-dot { width: 13rpx; height: 13rpx; flex: 0 0 auto; border-radius: 50%; background: #aab2ad; }
.status-dot.ok { background: #2f9b68; box-shadow: 0 0 0 7rpx rgba(47, 155, 104, 0.1); }
.status-dot.busy { background: #c58a2a; box-shadow: 0 0 0 7rpx rgba(197, 138, 42, 0.1); animation: pulse 1.4s infinite; }
.status-dot.danger { background: #b64b46; }
.status-label { color: #405249; font-size: 19rpx; font-weight: 700; }
.status-detail { overflow: hidden; max-width: 390rpx; color: #909b94; font-size: 17rpx; text-overflow: ellipsis; white-space: nowrap; }
.mini-retry { height: 48rpx; margin: 0; padding: 0 17rpx; border-radius: 16rpx; background: #f8e9e7; color: #a5423e; font-size: 20rpx; line-height: 48rpx; }

.start-card { display: flex; min-height: 470rpx; align-items: center; justify-content: center; padding: 32rpx 32rpx 28rpx; border: 1rpx solid rgba(23, 107, 77, 0.08); border-radius: 21rpx; background: radial-gradient(circle at 50% 12%, #edf6ed 0, #fff 44%); text-align: center; flex-direction: column; box-shadow: 0 7rpx 24rpx rgba(40, 70, 55, 0.045); }
.start-orbit { display: flex; width: 94rpx; height: 94rpx; align-items: center; justify-content: center; margin-bottom: 17rpx; border: 1rpx solid rgba(23, 107, 77, 0.16); border-radius: 50%; background: rgba(255, 255, 255, 0.8); box-shadow: 0 0 0 11rpx rgba(23, 107, 77, 0.05), 0 0 0 23rpx rgba(23, 107, 77, 0.025); }
.start-mark { display: flex; width: 62rpx; height: 62rpx; align-items: center; justify-content: center; border-radius: 20rpx; background: linear-gradient(145deg, #176b4d, #2e8b63); color: #fff; font-size: 22rpx; font-weight: 800; letter-spacing: 1rpx; }
.start-eyebrow { color: #a27831; font-size: 17rpx; letter-spacing: 4rpx; }
.start-title { margin-top: 8rpx; color: #20332b; font-family: 'STKaiti', 'KaiTi', serif; font-size: 32rpx; font-weight: 700; }
.start-description { max-width: 540rpx; margin-top: 11rpx; color: #738078; font-size: 20rpx; line-height: 1.55; }
.start-button { width: 390rpx; max-width: 100%; height: 66rpx; margin-top: 22rpx; border-radius: 20rpx; background: linear-gradient(135deg, #185f47, #247b58); box-shadow: 0 8rpx 20rpx rgba(23, 107, 77, 0.17); color: #fff; font-size: 23rpx; font-weight: 700; line-height: 66rpx; }
.start-button[disabled] { box-shadow: none; opacity: 0.5; }
.trust-row { display: flex; margin-top: 14rpx; color: #8c9891; font-size: 16rpx; gap: 6rpx; }

.message-list { height: 600rpx; min-height: 360rpx; border-radius: 20rpx; background: rgba(255, 255, 255, 0.56); }
.message-list-inner { padding: 14rpx 10rpx 0; }
.date-separator { display: flex; align-items: center; justify-content: center; margin: 3rpx 0 16rpx; }
.date-separator text { padding: 4rpx 13rpx; border-radius: 14rpx; background: #e9ede8; color: #8b978f; font-size: 16rpx; }
.message-row { display: flex; align-items: flex-start; margin-bottom: 18rpx; }
.message-row.user { justify-content: flex-end; }
.message-avatar { display: flex; width: 46rpx; height: 46rpx; align-items: center; justify-content: center; flex: 0 0 auto; border-radius: 14rpx; color: #fff; font-family: serif; font-size: 20rpx; font-weight: 700; }
.assistant-avatar { margin-right: 9rpx; background: #1c6b4e; }
.patient-avatar { margin-left: 9rpx; background: #a67a35; }
.message-stack { max-width: 84%; }
.message-bubble { padding: 13rpx 16rpx; border-radius: 7rpx 18rpx 18rpx 18rpx; background: #fff; box-shadow: 0 5rpx 16rpx rgba(44, 68, 56, 0.06); color: #30443a; font-size: 22rpx; line-height: 1.55; }
.user .message-bubble { border-radius: 25rpx 8rpx 25rpx 25rpx; background: linear-gradient(145deg, #176b4d, #247c59); box-shadow: 0 8rpx 24rpx rgba(23, 107, 77, 0.17); color: #fff; }
.message-bubble.failed { border: 1rpx solid #d99b97; }
.message-meta { display: flex; justify-content: space-between; margin-top: 4rpx; padding: 0 4rpx; color: #9aa49e; font-size: 16rpx; gap: 14rpx; }
.user .message-meta { flex-direction: row-reverse; }
.failed-text { color: #b64b46; }
.typing-cursor { display: inline-block; width: 4rpx; height: 24rpx; margin-left: 6rpx; background: #176b4d; animation: blink 0.85s infinite; vertical-align: -3rpx; }

.thinking-card { overflow: hidden; margin: 2rpx 0 18rpx 55rpx; border: 1rpx solid #dce7de; border-radius: 18rpx; background: #f3f8f3; }
.thinking-head { display: flex; align-items: center; padding: 13rpx; }
.thinking-symbol { display: flex; width: 50rpx; height: 50rpx; align-items: center; justify-content: center; border-radius: 17rpx; background: #deede2; color: #176b4d; font-size: 24rpx; }
.thinking-copy { min-width: 0; flex: 1; margin-left: 14rpx; }
.thinking-title,
.thinking-subtitle { display: block; }
.thinking-title { overflow: hidden; color: #345044; font-size: 23rpx; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.thinking-subtitle { margin-top: 3rpx; color: #8a988f; font-size: 19rpx; }
.expand-icon { color: #708078; font-size: 23rpx; }
.step-list { padding: 0 20rpx 16rpx 82rpx; }
.step-row { position: relative; display: flex; padding: 12rpx 0; border-top: 1rpx dashed #dce4dd; }
.step-status { display: flex; width: 30rpx; height: 30rpx; align-items: center; justify-content: center; flex: 0 0 auto; margin: 2rpx 12rpx 0 0; border-radius: 50%; background: #e4e9e5; color: #69776f; font-size: 18rpx; }
.step-status.success { background: #dceee2; color: #176b4d; }
.step-copy { min-width: 0; }
.step-label,
.step-detail { display: block; }
.step-label { color: #41554a; font-size: 21rpx; font-weight: 650; }
.step-detail { margin-top: 4rpx; color: #839087; font-size: 19rpx; line-height: 1.5; }

.diagnosis-action { display: flex; width: calc(100% - 55rpx); min-height: 72rpx; align-items: center; justify-content: space-between; margin: 7rpx 0 16rpx 55rpx; padding: 10rpx 14rpx; border: 1rpx solid rgba(174, 127, 48, 0.26); border-radius: 18rpx; background: linear-gradient(135deg, #fffaf0, #f5f0e3); color: #405046; line-height: normal; text-align: left; }
.diagnosis-action-copy { flex: 1; }
.diagnosis-action-title,
.diagnosis-action-subtitle { display: block; }
.diagnosis-action-title { color: #604c2d; font-size: 23rpx; font-weight: 700; }
.diagnosis-action-subtitle { margin-top: 5rpx; color: #9a876a; font-size: 18rpx; }
.diagnosis-action-cta { margin-left: 16rpx; color: #8e631f; font-size: 22rpx; font-weight: 700; }
.message-bottom-space { height: 20rpx; }
.latest-button { position: absolute; right: 12rpx; top: -60rpx; z-index: 2; height: 50rpx; margin: 0; padding: 0 18rpx; border: 1rpx solid #dbe3dc; border-radius: 25rpx; background: rgba(255, 255, 255, 0.96); box-shadow: 0 8rpx 22rpx rgba(30, 60, 44, 0.12); color: #176b4d; font-size: 18rpx; line-height: 48rpx; }

.composer-dock { position: fixed; z-index: 19; left: 50%; bottom: calc(128rpx + env(safe-area-inset-bottom)); width: calc(100% - 40rpx); max-width: 720rpx; transform: translateX(-50%); }
.composer { display: flex; min-height: 84rpx; align-items: flex-end; padding: 10rpx 10rpx 10rpx 16rpx; border: 1rpx solid #dfe5df; border-radius: 20rpx; background: #fff; box-shadow: 0 6rpx 20rpx rgba(38, 60, 49, 0.1); }
.composer-input { width: auto; min-height: 54rpx; max-height: 130rpx; flex: 1; padding: 8rpx 8rpx 3rpx 0; color: #263b31; font-size: 21rpx; line-height: 1.45; }
.send-button { display: flex; width: 54rpx; height: 54rpx; align-items: center; justify-content: center; margin: 0 0 1rpx 9rpx; padding: 0; border-radius: 17rpx; background: #dce3de; color: #8e9992; font-size: 30rpx; font-weight: 500; line-height: 54rpx; }
.send-button.enabled { background: #176b4d; box-shadow: 0 7rpx 18rpx rgba(23, 107, 77, 0.2); color: #fff; }
.composer-tip { display: block; padding: 9rpx 0 2rpx; color: #a0a9a3; font-size: 18rpx; text-align: center; }

@keyframes pulse { 50% { opacity: 0.4; } }
@keyframes blink { 50% { opacity: 0; } }

@media (max-height: 700px) {
  .start-card { min-height: 430rpx; }
}
</style>
