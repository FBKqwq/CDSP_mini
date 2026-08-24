<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ConsultationPanel from '@/components/consultation/ConsultationPanel.vue'
import DiagnosisPanel from '@/components/diagnosis/DiagnosisPanel.vue'
import ProfilePanel from '@/components/profile/ProfilePanel.vue'
import ContextHeader from '@/components/workbench/ContextHeader.vue'
import ContextSelectorSheet from '@/components/workbench/ContextSelectorSheet.vue'
import { useAuthStore } from '@/stores/auth'
import { useConsultationStore } from '@/stores/consultation'
import { useHealthContextStore } from '@/stores/health-context'
import type { ConsultationContext } from '@/types/domain'

const authStore = useAuthStore()
const healthContextStore = useHealthContextStore()
const consultationStore = useConsultationStore()
const selectorType = ref<'history' | 'expert' | null>(null)
const initialized = ref(false)
const statusBarHeight = `${uni.getSystemInfoSync().statusBarHeight ?? 24}px`

const currentPatient = computed(() => healthContextStore.profile)
const currentHistory = computed(() => healthContextStore.findMedicalHistory(consultationStore.context.medicalHistoryId))
const currentExpert = computed(() => healthContextStore.findConsultationExpert(consultationStore.context.expertId))
const pageError = computed(() => consultationStore.errorMessage || healthContextStore.errorMessage)
const stageName = computed(() => ({
  consultation: '问诊阶段',
  preliminary: '初步分析',
  collaboration: '专家会诊',
  comprehensive: '综合评估',
})[consultationStore.context.stage])

const navItems = [
  { key: 'consultation' as const, label: '问诊', icon: '问' },
  { key: 'diagnosis' as const, label: '诊疗', icon: '诊' },
  { key: 'profile' as const, label: '我的', icon: '我' },
]

onMounted(async () => {
  await authStore.bootstrap()
  if (!authStore.isAuthenticated) {
    uni.reLaunch({ url: '/pages/login/index' })
    return
  }
  await consultationStore.initialize()
  initialized.value = true
})

function shouldConfirmSwitch(): boolean {
  return consultationStore.messages.length > 0 || consultationStore.isStreaming
}

async function confirmSwitch(): Promise<boolean> {
  if (!shouldConfirmSwitch()) return true
  return new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '切换本次问诊信息？',
      content: '当前问诊连接将关闭，未完成的内容不会带入新的历史疾病或问诊专家。历史记录仍以服务端数据为准。',
      confirmText: '确认切换',
      confirmColor: '#176B4D',
      success: (result) => resolve(result.confirm),
      fail: () => resolve(false),
    })
  })
}

async function selectContext(id: string): Promise<void> {
  const type = selectorType.value
  if (!type) return
  if (!(await confirmSwitch())) return
  let patch: Partial<Pick<ConsultationContext, 'medicalHistoryId' | 'expertId'>> = {}
  if (type === 'history') patch = { medicalHistoryId: id || undefined }
  if (type === 'expert') patch = { expertId: id }
  selectorType.value = null
  await consultationStore.changeContext(patch)
}

async function logout(): Promise<void> {
  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '退出登录？',
      content: '活动连接将关闭，本地身份和问诊上下文标识会被清除。',
      confirmText: '退出',
      confirmColor: '#B64B46',
      success: (result) => resolve(result.confirm),
      fail: () => resolve(false),
    })
  })
  if (!confirmed) return
  consultationStore.resetAll()
  await authStore.logout()
  uni.reLaunch({ url: '/pages/login/index' })
}

function clearError(): void {
  consultationStore.errorMessage = ''
  healthContextStore.errorMessage = ''
}
</script>

<template>
  <view class="workbench-page" :style="{ paddingTop: statusBarHeight }">
    <view class="ambient ambient-one" />
    <view class="ambient ambient-two" />

    <view class="app-shell">
      <view class="top-bar">
        <view class="brand">
          <image class="brand-logo" src="/static/logo.png" mode="aspectFit" />
          <view>
            <text class="brand-name">中医智能诊疗</text>
            <text class="brand-subtitle">TCM HEALTH CONSULTATION</text>
          </view>
        </view>
      </view>

      <ContextHeader
        v-if="consultationStore.activeTab !== 'profile'"
        :patient-name="currentPatient?.name || ''"
        :history-name="currentHistory?.name || ''"
        :expert-name="currentExpert?.name || ''"
        :stage-name="stageName"
        @select="selectorType = $event"
      />

      <view v-if="pageError" class="global-error">
        <text class="error-mark">!</text>
        <text class="error-copy">{{ pageError }}</text>
        <button class="error-close" @tap="clearError">×</button>
      </view>

      <view v-if="!initialized || healthContextStore.loading" class="page-loading">
        <view class="loading-mark">◌</view>
        <text>正在准备健康问诊服务</text>
      </view>

      <view v-else class="main-content">
        <ConsultationPanel v-show="consultationStore.activeTab === 'consultation'" />
        <DiagnosisPanel v-show="consultationStore.activeTab === 'diagnosis'" />
        <ProfilePanel v-show="consultationStore.activeTab === 'profile'" @logout="logout" />
      </view>
    </view>

    <view class="bottom-nav-wrap">
      <view class="bottom-nav">
        <button
          v-for="item in navItems"
          :key="item.key"
          class="nav-item"
          :class="{ active: consultationStore.activeTab === item.key }"
          @tap="consultationStore.activeTab = item.key"
        >
          <view class="nav-icon">{{ item.icon }}</view>
          <text>{{ item.label }}</text>
          <text v-if="item.key === 'consultation' && consultationStore.isStreaming" class="nav-live" />
        </button>
      </view>
    </view>

    <ContextSelectorSheet
      :visible="Boolean(selectorType)"
      :type="selectorType || 'history'"
      :current-id="selectorType === 'history' ? consultationStore.context.medicalHistoryId || '' : consultationStore.context.expertId"
      :experts="healthContextStore.consultationExperts"
      @close="selectorType = null"
      @select="selectContext"
    />
  </view>
</template>

<style scoped>
.workbench-page { position: relative; min-height: 100vh; overflow-x: hidden; padding-bottom: calc(150rpx + env(safe-area-inset-bottom)); background: linear-gradient(165deg, #eef2ea 0%, #f5f6f1 38%, #eef1ec 100%); }
.ambient { position: fixed; border-radius: 50%; pointer-events: none; }
.ambient-one { top: -260rpx; right: -300rpx; width: 720rpx; height: 720rpx; border: 1rpx solid rgba(23, 107, 77, .04); box-shadow: 0 0 0 70rpx rgba(23, 107, 77, .018), 0 0 0 140rpx rgba(23, 107, 77, .012); }
.ambient-two { bottom: 70rpx; left: -300rpx; width: 600rpx; height: 600rpx; background: radial-gradient(circle, rgba(176, 132, 59, .06), transparent 67%); }
.app-shell { position: relative; z-index: 1; width: 100%; max-width: 760rpx; margin: 0 auto; padding: 0 20rpx; }
.top-bar { display: flex; height: 76rpx; align-items: center; justify-content: space-between; }
.brand { display: flex; align-items: center; }
.brand-logo { display: block; width: 54rpx; height: 54rpx; flex: 0 0 auto; margin-right: 10rpx; border-radius: 13rpx; background: rgba(255, 255, 255, .72); box-shadow: 0 5rpx 14rpx rgba(23, 107, 77, .12); }
.brand-name,
.brand-subtitle { display: block; }
.brand-name { color: #284238; font-family: 'STKaiti', 'KaiTi', serif; font-size: 25rpx; font-weight: 700; }
.brand-subtitle { color: #a1947e; font-size: 11rpx; letter-spacing: 2rpx; }
.global-error { display: flex; min-height: 72rpx; align-items: center; margin-top: 16rpx; padding: 12rpx 14rpx; border: 1rpx solid #eed2ce; border-radius: 20rpx; background: #faeeec; color: #a14a46; }
.error-mark { display: flex; width: 32rpx; height: 32rpx; align-items: center; justify-content: center; flex: 0 0 auto; border-radius: 50%; background: #b64b46; color: #fff; font-size: 18rpx; font-weight: 700; }
.error-copy { flex: 1; margin-left: 10rpx; font-size: 21rpx; }
.error-close { width: 42rpx; height: 42rpx; margin: 0; padding: 0; background: transparent; color: #a86c68; font-size: 31rpx; line-height: 40rpx; }
.page-loading { display: flex; min-height: 600rpx; align-items: center; justify-content: center; color: #74837a; font-size: 24rpx; flex-direction: column; }
.loading-mark { margin-bottom: 17rpx; color: #176b4d; font-size: 54rpx; animation: spin 1s linear infinite; }
.main-content { margin-top: 9rpx; }
.bottom-nav-wrap { position: fixed; z-index: 20; right: 0; bottom: 0; left: 0; padding: 12rpx 24rpx calc(12rpx + env(safe-area-inset-bottom)); background: linear-gradient(180deg, rgba(243, 245, 239, 0), rgba(243, 245, 239, .96) 24%); }
.bottom-nav { display: flex; width: 100%; max-width: 710rpx; height: 104rpx; align-items: center; justify-content: space-around; margin: 0 auto; padding: 8rpx 12rpx; border: 1rpx solid rgba(32, 83, 59, .1); border-radius: 32rpx; background: rgba(255, 255, 255, .96); box-shadow: 0 16rpx 45rpx rgba(30, 60, 44, .14); }
.nav-item { position: relative; display: flex; height: 86rpx; align-items: center; justify-content: center; flex: 1; margin: 0 4rpx; padding: 0; border-radius: 25rpx; background: transparent; color: #8b978f; font-size: 20rpx; line-height: normal; flex-direction: column; }
.nav-item.active { background: #eaf3ec; color: #176b4d; font-weight: 700; }
.nav-icon { display: flex; width: 40rpx; height: 40rpx; align-items: center; justify-content: center; margin-bottom: 3rpx; border: 1rpx solid currentColor; border-radius: 13rpx; font-family: serif; font-size: 20rpx; }
.nav-item.active .nav-icon { background: #176b4d; color: #fff; }
.nav-live { position: absolute; top: 12rpx; right: 30%; width: 11rpx; height: 11rpx; border: 3rpx solid #fff; border-radius: 50%; background: #c3872b; animation: pulse 1.3s infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse { 50% { opacity: .3; } }
</style>
