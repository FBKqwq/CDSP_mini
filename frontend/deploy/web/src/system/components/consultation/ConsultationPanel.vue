<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import SafeRichText from '@/components/common/SafeRichText.vue'
import StateBlock from '@/components/common/StateBlock.vue'
import { useConsultationStore } from '@/stores/consultation'

const store = useConsultationStore()
const input = ref('')
const detailsExpanded = ref(false)
const atBottom = ref(true)
const scrollAnchor = ref('')

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

watch(
  () => store.messages.map((message) => `${message.id}:${message.content.length}`).join('|'),
  async () => {
    if (!atBottom.value) return
    await nextTick()
    const last = store.messages[store.messages.length - 1]
    scrollAnchor.value = last ? `message-${last.id}` : ''
  },
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
      title: '进入诊断阶段？',
      content: '将提交当前问诊资料并启动诊断流程。提交期间请勿重复操作。',
      confirmText: '进入诊断',
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

    <view v-if="store.sessionState === 'IDLE' && !store.messages.length" class="start-card">
      <view class="start-orbit"><text class="start-mark">AI</text></view>
      <text class="start-eyebrow">智能辨证问诊</text>
      <text class="start-title">让每次问诊都有迹可循</text>
      <text class="start-description">AI 将协助梳理主诉、病程和四诊信息。所有诊断结论仍以服务端记录和医师判断为准。</text>
      <button class="start-button" :disabled="!store.hasCompleteContext" @tap="store.startChat">
        {{ store.hasCompleteContext ? '开始安全问诊' : '请先补全诊疗上下文' }}
      </button>
      <view class="trust-row">
        <text>会话隔离</text><text>·</text><text>不缓存病历正文</text><text>·</text><text>可中断恢复</text>
      </view>
    </view>

    <StateBlock
      v-else-if="store.loadingContext"
      title="正在恢复诊疗记录"
      description="以服务端记录为准，避免使用过期的本地医疗内容。"
      loading
    />

    <template v-else>
      <scroll-view
        class="message-list"
        scroll-y
        :scroll-into-view="scrollAnchor"
        scroll-with-animation
        @scroll="handleScroll"
        @scrolltolower="atBottom = true"
      >
        <view class="message-list-inner">
          <view class="date-separator"><text>本次诊疗</text></view>
          <view
            v-for="message in store.messages"
            :id="`message-${message.id}`"
            :key="message.id"
            class="message-row"
            :class="message.role"
          >
            <view v-if="message.role !== 'user'" class="assistant-avatar">岐</view>
            <view class="message-stack">
              <view class="message-bubble" :class="{ failed: message.status === 'failed' }" @longpress="copyMessage(message.content)">
                <SafeRichText :content="message.content" />
                <view v-if="message.status === 'streaming'" class="typing-cursor" />
              </view>
              <view class="message-meta">
                <text>{{ message.role === 'user' ? '患者陈述' : '中医智能诊疗' }}</text>
                <text v-if="message.status === 'pending'">发送中</text>
                <text v-else-if="message.status === 'failed'" class="failed-text" @tap="store.sendMessage(message.content)">发送失败 · 重试</text>
              </view>
            </view>
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
              <text class="diagnosis-action-subtitle">确认后进入四阶段诊疗流程</text>
            </view>
            <text class="diagnosis-action-cta">进入诊断 ›</text>
          </button>
          <view class="message-bottom-space" />
        </view>
      </scroll-view>

      <button v-if="!atBottom" class="latest-button" @tap="jumpToLatest">↓ 回到最新</button>

      <view class="composer">
        <textarea
          v-model="input"
          class="composer-input"
          :disabled="!store.canSend"
          :placeholder="store.canSend ? '输入患者症状、病程或补充信息…' : store.isStreaming ? 'AI 正在输出，请稍候' : '连接就绪后可输入'"
          maxlength="1000"
          :auto-height="false"
          confirm-type="send"
          @confirm="send"
        />
        <button class="send-button" :class="{ enabled: input.trim() && store.canSend }" :disabled="!input.trim() || !store.canSend" @tap="send">↑</button>
      </view>
      <text class="composer-tip">AI 内容仅辅助医务判断，请结合临床信息复核</text>
    </template>
  </view>
</template>

<style scoped>
.consultation-panel { position: relative; min-height: 600rpx; }
.connection-bar { display: flex; min-height: 62rpx; align-items: center; justify-content: space-between; padding: 0 4rpx; }
.connection-left { display: flex; min-width: 0; align-items: center; gap: 9rpx; }
.status-dot { width: 13rpx; height: 13rpx; flex: 0 0 auto; border-radius: 50%; background: #aab2ad; }
.status-dot.ok { background: #2f9b68; box-shadow: 0 0 0 7rpx rgba(47, 155, 104, 0.1); }
.status-dot.busy { background: #c58a2a; box-shadow: 0 0 0 7rpx rgba(197, 138, 42, 0.1); animation: pulse 1.4s infinite; }
.status-dot.danger { background: #b64b46; }
.status-label { color: #405249; font-size: 22rpx; font-weight: 700; }
.status-detail { overflow: hidden; max-width: 390rpx; color: #909b94; font-size: 20rpx; text-overflow: ellipsis; white-space: nowrap; }
.mini-retry { height: 48rpx; margin: 0; padding: 0 17rpx; border-radius: 16rpx; background: #f8e9e7; color: #a5423e; font-size: 20rpx; line-height: 48rpx; }

.start-card { display: flex; min-height: 720rpx; align-items: center; justify-content: center; padding: 58rpx 38rpx 42rpx; border: 1rpx solid rgba(23, 107, 77, 0.08); border-radius: 30rpx; background: radial-gradient(circle at 50% 15%, #edf6ed 0, #fff 46%); text-align: center; flex-direction: column; box-shadow: 0 14rpx 44rpx rgba(40, 70, 55, 0.05); }
.start-orbit { display: flex; width: 142rpx; height: 142rpx; align-items: center; justify-content: center; margin-bottom: 26rpx; border: 1rpx solid rgba(23, 107, 77, 0.16); border-radius: 50%; background: rgba(255, 255, 255, 0.8); box-shadow: 0 0 0 18rpx rgba(23, 107, 77, 0.05), 0 0 0 38rpx rgba(23, 107, 77, 0.025); }
.start-mark { display: flex; width: 92rpx; height: 92rpx; align-items: center; justify-content: center; border-radius: 31rpx; background: linear-gradient(145deg, #176b4d, #2e8b63); color: #fff; font-size: 29rpx; font-weight: 800; letter-spacing: 1rpx; }
.start-eyebrow { color: #a27831; font-size: 21rpx; letter-spacing: 6rpx; }
.start-title { margin-top: 13rpx; color: #20332b; font-family: 'STKaiti', 'KaiTi', serif; font-size: 42rpx; font-weight: 700; }
.start-description { max-width: 540rpx; margin-top: 18rpx; color: #738078; font-size: 24rpx; line-height: 1.75; }
.start-button { width: 430rpx; max-width: 100%; height: 86rpx; margin-top: 38rpx; border-radius: 27rpx; background: linear-gradient(135deg, #185f47, #247b58); box-shadow: 0 14rpx 30rpx rgba(23, 107, 77, 0.2); color: #fff; font-size: 28rpx; font-weight: 700; line-height: 86rpx; }
.start-button[disabled] { box-shadow: none; opacity: 0.5; }
.trust-row { display: flex; margin-top: 24rpx; color: #8c9891; font-size: 19rpx; gap: 9rpx; }

.message-list { height: 780rpx; border-radius: 28rpx; background: rgba(255, 255, 255, 0.56); }
.message-list-inner { padding: 20rpx 14rpx 0; }
.date-separator { display: flex; align-items: center; justify-content: center; margin: 6rpx 0 26rpx; }
.date-separator text { padding: 6rpx 18rpx; border-radius: 20rpx; background: #e9ede8; color: #8b978f; font-size: 19rpx; }
.message-row { display: flex; align-items: flex-start; margin-bottom: 28rpx; }
.message-row.user { justify-content: flex-end; }
.assistant-avatar { display: flex; width: 58rpx; height: 58rpx; align-items: center; justify-content: center; flex: 0 0 auto; margin-right: 13rpx; border-radius: 20rpx; background: #1c6b4e; color: #fff; font-family: serif; font-size: 24rpx; font-weight: 700; }
.message-stack { max-width: 82%; }
.message-bubble { padding: 20rpx 23rpx; border-radius: 8rpx 25rpx 25rpx 25rpx; background: #fff; box-shadow: 0 8rpx 24rpx rgba(44, 68, 56, 0.07); color: #30443a; font-size: 26rpx; line-height: 1.7; }
.user .message-bubble { border-radius: 25rpx 8rpx 25rpx 25rpx; background: linear-gradient(145deg, #176b4d, #247c59); box-shadow: 0 8rpx 24rpx rgba(23, 107, 77, 0.17); color: #fff; }
.message-bubble.failed { border: 1rpx solid #d99b97; }
.message-meta { display: flex; justify-content: space-between; margin-top: 7rpx; padding: 0 5rpx; color: #9aa49e; font-size: 18rpx; gap: 20rpx; }
.user .message-meta { flex-direction: row-reverse; }
.failed-text { color: #b64b46; }
.typing-cursor { display: inline-block; width: 4rpx; height: 24rpx; margin-left: 6rpx; background: #176b4d; animation: blink 0.85s infinite; vertical-align: -3rpx; }

.thinking-card { overflow: hidden; margin: 2rpx 0 28rpx 70rpx; border: 1rpx solid #dce7de; border-radius: 24rpx; background: #f3f8f3; }
.thinking-head { display: flex; align-items: center; padding: 20rpx; }
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

.diagnosis-action { display: flex; width: calc(100% - 70rpx); min-height: 94rpx; align-items: center; justify-content: space-between; margin: 10rpx 0 24rpx 70rpx; padding: 15rpx 20rpx; border: 1rpx solid rgba(174, 127, 48, 0.26); border-radius: 24rpx; background: linear-gradient(135deg, #fffaf0, #f5f0e3); color: #405046; line-height: normal; text-align: left; }
.diagnosis-action-copy { flex: 1; }
.diagnosis-action-title,
.diagnosis-action-subtitle { display: block; }
.diagnosis-action-title { color: #604c2d; font-size: 23rpx; font-weight: 700; }
.diagnosis-action-subtitle { margin-top: 5rpx; color: #9a876a; font-size: 18rpx; }
.diagnosis-action-cta { margin-left: 16rpx; color: #8e631f; font-size: 22rpx; font-weight: 700; }
.message-bottom-space { height: 20rpx; }
.latest-button { position: absolute; right: 22rpx; bottom: 150rpx; z-index: 4; height: 54rpx; margin: 0; padding: 0 20rpx; border: 1rpx solid #dbe3dc; border-radius: 27rpx; background: rgba(255, 255, 255, 0.96); box-shadow: 0 8rpx 22rpx rgba(30, 60, 44, 0.12); color: #176b4d; font-size: 20rpx; line-height: 52rpx; }

.composer { display: flex; min-height: 104rpx; align-items: flex-end; margin-top: 12rpx; padding: 14rpx 14rpx 14rpx 22rpx; border: 1rpx solid #dfe5df; border-radius: 28rpx; background: #fff; box-shadow: 0 10rpx 30rpx rgba(38, 60, 49, 0.08); }
.composer-input { width: auto; min-height: 68rpx; max-height: 156rpx; flex: 1; padding: 11rpx 10rpx 4rpx 0; color: #263b31; font-size: 25rpx; line-height: 1.5; }
.send-button { display: flex; width: 68rpx; height: 68rpx; align-items: center; justify-content: center; margin: 0 0 1rpx 12rpx; padding: 0; border-radius: 22rpx; background: #dce3de; color: #8e9992; font-size: 38rpx; font-weight: 500; line-height: 68rpx; }
.send-button.enabled { background: #176b4d; box-shadow: 0 7rpx 18rpx rgba(23, 107, 77, 0.2); color: #fff; }
.composer-tip { display: block; padding: 9rpx 0 2rpx; color: #a0a9a3; font-size: 18rpx; text-align: center; }

@keyframes pulse { 50% { opacity: 0.4; } }
@keyframes blink { 50% { opacity: 0; } }

@media (max-height: 700px) {
  .message-list { height: 600rpx; }
  .start-card { min-height: 570rpx; }
}
</style>
