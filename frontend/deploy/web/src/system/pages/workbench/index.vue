<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ConsultationPanel from '@/components/consultation/ConsultationPanel.vue'
import DiagnosisPanel from '@/components/diagnosis/DiagnosisPanel.vue'
import ReportPanel from '@/components/report/ReportPanel.vue'
import ContextHeader from '@/components/workbench/ContextHeader.vue'
import ContextSelectorSheet from '@/components/workbench/ContextSelectorSheet.vue'
import { useAuthStore } from '@/stores/auth'
import { useConsultationStore } from '@/stores/consultation'
import { usePatientStore } from '@/stores/patient'
import type { ConsultationContext, Patient } from '@/types/domain'

const authStore = useAuthStore()
const patientStore = usePatientStore()
const consultationStore = useConsultationStore()
const selectorType = ref<'patient' | 'disease' | 'doctor' | null>(null)
const initialized = ref(false)
const statusBarHeight = `${uni.getSystemInfoSync().statusBarHeight ?? 24}px`

const currentPatient = computed(() => patientStore.findPatient(consultationStore.context.patientId))
const currentDisease = computed(() => patientStore.findDisease(consultationStore.context.diseaseGroupId))
const currentDoctor = computed(() => currentDisease.value?.doctors.find((doctor) => doctor.id === consultationStore.context.doctorId))
const availableDoctors = computed(() => currentDisease.value?.doctors ?? [])
const stageName = computed(() => ({
  consultation: '问诊阶段',
  preliminary: '初步诊断',
  collaboration: '专家协作',
  comprehensive: '综合诊断',
})[consultationStore.context.stage])

const navItems = [
  { key: 'consultation' as const, label: '问诊', icon: '问' },
  { key: 'diagnosis' as const, label: '诊疗', icon: '诊' },
  { key: 'reports' as const, label: '报告', icon: '卷' },
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
      title: '切换诊疗上下文？',
      content: '当前问诊连接将关闭，未完成的流式输出不会带入新上下文。历史记录仍以服务端数据为准。',
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
  let patch: Partial<Pick<ConsultationContext, 'patientId' | 'diseaseGroupId' | 'doctorId'>> = {}
  if (type === 'patient') patch = { patientId: id }
  if (type === 'doctor') patch = { doctorId: id }
  if (type === 'disease') {
    const disease = patientStore.findDisease(id)
    patch = {
      diseaseGroupId: id,
      doctorId: disease?.doctors.find((doctor) => doctor.enabled)?.id ?? '',
    }
  }
  selectorType.value = null
  await consultationStore.changeContext(patch)
}

async function handlePatientCreated(patient: Patient): Promise<void> {
  selectorType.value = null
  if (await confirmSwitch()) await consultationStore.changeContext({ patientId: patient.id })
}

async function handlePatientDeleted(patientId: string): Promise<void> {
  if (consultationStore.context.patientId !== patientId) return
  const next = patientStore.patients[0]
  selectorType.value = null
  if (next) await consultationStore.changeContext({ patientId: next.id })
  else consultationStore.resetAll()
}

async function logout(): Promise<void> {
  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '退出登录？',
      content: '活动连接将关闭，本地身份和诊疗上下文标识会被清除。',
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
</script>

<template>
  <view class="workbench-page" :style="{ paddingTop: statusBarHeight }">
    <view class="ambient ambient-one" />
    <view class="ambient ambient-two" />

    <view class="app-shell">
      <view class="top-bar">
        <view class="brand">
          <view class="brand-seal">岐</view>
          <view>
            <text class="brand-name">中医智能诊疗</text>
            <text class="brand-subtitle">TCM CLINICAL COPILOT</text>
          </view>
        </view>
        <button class="user-button" @tap="logout">
          <view class="user-avatar">{{ authStore.session?.user.displayName?.slice(0, 1) || '医' }}</view>
          <view class="user-copy">
            <text class="user-name">{{ authStore.session?.user.displayName || '医务用户' }}</text>
            <text class="user-action">退出登录</text>
          </view>
        </button>
      </view>

      <ContextHeader
        :patient-name="currentPatient?.name || ''"
        :patient-code="currentPatient?.code || ''"
        :disease-name="currentDisease?.name || ''"
        :doctor-name="currentDoctor?.name || ''"
        :stage-name="stageName"
        @select="selectorType = $event"
      />

      <view v-if="consultationStore.errorMessage" class="global-error">
        <text class="error-mark">!</text>
        <text class="error-copy">{{ consultationStore.errorMessage }}</text>
        <button class="error-close" @tap="consultationStore.errorMessage = ''">×</button>
      </view>

      <view v-if="!initialized || patientStore.loading" class="page-loading">
        <view class="loading-mark">◌</view>
        <text>正在准备诊疗工作台</text>
      </view>

      <view v-else class="main-content">
        <ConsultationPanel v-show="consultationStore.activeTab === 'consultation'" />
        <DiagnosisPanel v-show="consultationStore.activeTab === 'diagnosis'" />
        <ReportPanel v-show="consultationStore.activeTab === 'reports'" />
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
      :type="selectorType || 'patient'"
      :current-id="selectorType === 'patient' ? consultationStore.context.patientId : selectorType === 'disease' ? consultationStore.context.diseaseGroupId : consultationStore.context.doctorId"
      :doctors="availableDoctors"
      @close="selectorType = null"
      @select="selectContext"
      @created="handlePatientCreated"
      @deleted="handlePatientDeleted"
    />
  </view>
</template>

<style scoped>
.workbench-page { position: relative; min-height: 100vh; overflow-x: hidden; padding-bottom: calc(150rpx + env(safe-area-inset-bottom)); background: linear-gradient(165deg, #eef2ea 0%, #f5f6f1 38%, #eef1ec 100%); }
.ambient { position: fixed; border-radius: 50%; pointer-events: none; }
.ambient-one { top: -260rpx; right: -300rpx; width: 720rpx; height: 720rpx; border: 1rpx solid rgba(23, 107, 77, .04); box-shadow: 0 0 0 70rpx rgba(23, 107, 77, .018), 0 0 0 140rpx rgba(23, 107, 77, .012); }
.ambient-two { bottom: 70rpx; left: -300rpx; width: 600rpx; height: 600rpx; background: radial-gradient(circle, rgba(176, 132, 59, .06), transparent 67%); }
.app-shell { position: relative; z-index: 1; width: 100%; max-width: 760rpx; margin: 0 auto; padding: 0 24rpx; }
.top-bar { display: flex; height: 100rpx; align-items: center; justify-content: space-between; }
.brand { display: flex; align-items: center; }
.brand-seal { display: flex; width: 58rpx; height: 58rpx; align-items: center; justify-content: center; margin-right: 13rpx; border-radius: 18rpx; background: #176b4d; box-shadow: 0 8rpx 20rpx rgba(23, 107, 77, .16); color: #fff; font-family: serif; font-size: 27rpx; }
.brand-name,
.brand-subtitle { display: block; }
.brand-name { color: #284238; font-family: 'STKaiti', 'KaiTi', serif; font-size: 28rpx; font-weight: 700; }
.brand-subtitle { margin-top: 1rpx; color: #a1947e; font-size: 13rpx; letter-spacing: 2rpx; }
.user-button { display: flex; height: 66rpx; align-items: center; margin: 0; padding: 0 8rpx 0 10rpx; border-radius: 22rpx; background: rgba(255, 255, 255, .62); color: #45584e; line-height: normal; }
.user-avatar { display: flex; width: 44rpx; height: 44rpx; align-items: center; justify-content: center; border-radius: 14rpx; background: #e3ebe5; color: #176b4d; font-size: 20rpx; font-weight: 700; }
.user-copy { margin-left: 9rpx; text-align: left; }
.user-name,
.user-action { display: block; }
.user-name { font-size: 20rpx; font-weight: 650; }
.user-action { margin-top: 2rpx; color: #929d96; font-size: 16rpx; }
.global-error { display: flex; min-height: 72rpx; align-items: center; margin-top: 16rpx; padding: 12rpx 14rpx; border: 1rpx solid #eed2ce; border-radius: 20rpx; background: #faeeec; color: #a14a46; }
.error-mark { display: flex; width: 32rpx; height: 32rpx; align-items: center; justify-content: center; flex: 0 0 auto; border-radius: 50%; background: #b64b46; color: #fff; font-size: 18rpx; font-weight: 700; }
.error-copy { flex: 1; margin-left: 10rpx; font-size: 21rpx; }
.error-close { width: 42rpx; height: 42rpx; margin: 0; padding: 0; background: transparent; color: #a86c68; font-size: 31rpx; line-height: 40rpx; }
.page-loading { display: flex; min-height: 600rpx; align-items: center; justify-content: center; color: #74837a; font-size: 24rpx; flex-direction: column; }
.loading-mark { margin-bottom: 17rpx; color: #176b4d; font-size: 54rpx; animation: spin 1s linear infinite; }
.main-content { margin-top: 13rpx; }
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
