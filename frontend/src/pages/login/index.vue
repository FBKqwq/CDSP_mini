<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { appEnv } from '@/config/env'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const username = ref(appEnv.useMock ? 'doctor' : '')
const password = ref(appEnv.useMock ? 'demo123' : '')
const showPassword = ref(false)
const statusBarHeight = computed(() => `${uni.getSystemInfoSync().statusBarHeight ?? 24}px`)

onShow(async () => {
  await authStore.bootstrap()
  if (authStore.isAuthenticated) {
    uni.reLaunch({ url: '/pages/workbench/index' })
  }
})

async function submit(): Promise<void> {
  const success = await authStore.login(username.value, password.value)
  if (success) uni.reLaunch({ url: '/pages/workbench/index' })
}

function showPrivacy(): void {
  uni.showModal({
    title: '隐私与数据说明',
    content: '本地仅保存登录令牌、用户摘要和必要上下文标识，不保存完整患者资料、聊天正文、诊断报告或处方。',
    showCancel: false,
    confirmText: '我知道了',
    confirmColor: '#176B4D',
  })
}
</script>

<template>
  <view class="login-page" :style="{ paddingTop: statusBarHeight }">
    <view class="wash wash-one" />
    <view class="wash wash-two" />
    <view class="grain" />

    <view class="brand-bar">
      <view class="brand-mini-seal">岐</view>
      <text class="brand-mini-name">岐黄智诊</text>
      <text class="brand-version">医务端</text>
    </view>

    <view class="login-content">
      <view class="hero-copy">
        <text class="hero-kicker">TCM · INTELLIGENT CARE</text>
        <text class="hero-title">承岐黄之术，<br />辅临证之思</text>
        <view class="hero-rule"><text class="rule-dot" /><text /></view>
        <text class="hero-description">面向医务人员的中西医结合智能诊疗工作台</text>
      </view>

      <view class="login-card">
        <view class="card-heading">
          <view>
            <text class="welcome">欢迎回来</text>
            <text class="welcome-subtitle">使用已授权的系统账号登录</text>
          </view>
          <view class="secure-badge">安全接入</view>
        </view>

        <view class="field" :class="{ invalid: authStore.errorMessage }">
          <text class="field-label">账号</text>
          <view class="field-input-row">
            <text class="field-icon">人</text>
            <input
              v-model="username"
              class="field-input"
              placeholder="请输入账号"
              maxlength="50"
              confirm-type="next"
              :disabled="authStore.submitting"
            />
          </view>
        </view>

        <view class="field" :class="{ invalid: authStore.errorMessage }">
          <text class="field-label">密码</text>
          <view class="field-input-row">
            <text class="field-icon">钥</text>
            <input
              v-model="password"
              class="field-input"
              placeholder="请输入密码"
              :password="!showPassword"
              maxlength="100"
              confirm-type="done"
              :disabled="authStore.submitting"
              @confirm="submit"
            />
            <button class="password-toggle" @tap="showPassword = !showPassword">{{ showPassword ? '隐藏' : '显示' }}</button>
          </view>
        </view>

        <view v-if="authStore.errorMessage" class="error-banner">
          <text class="error-icon">!</text>
          <text>{{ authStore.errorMessage }}</text>
        </view>

        <button class="login-button" :loading="authStore.submitting" :disabled="authStore.submitting" @tap="submit">
          {{ authStore.submitting ? '正在验证身份' : '安全登录' }}
        </button>

        <view v-if="appEnv.useMock" class="demo-tip">
          <text class="demo-label">演示环境</text>
          <text>账号 doctor · 密码 demo123</text>
        </view>
      </view>

      <view class="security-row">
        <view class="security-item"><text class="security-mark">✓</text><text>统一身份认证</text></view>
        <view class="security-item"><text class="security-mark">✓</text><text>医疗数据最小化</text></view>
        <view class="security-item"><text class="security-mark">✓</text><text>会话安全隔离</text></view>
      </view>
    </view>

    <view class="login-footer">
      <button class="privacy-button" @tap="showPrivacy">隐私说明</button>
      <text>本系统仅供已授权医务人员使用</text>
    </view>
  </view>
</template>

<style scoped>
.login-page { position: relative; display: flex; min-height: 100vh; overflow: hidden; padding-right: 34rpx; padding-bottom: calc(22rpx + env(safe-area-inset-bottom)); padding-left: 34rpx; background: linear-gradient(165deg, #eef2ea 0%, #f7f6f0 49%, #e7eee7 100%); flex-direction: column; }
.wash { position: absolute; border-radius: 50%; filter: blur(1px); }
.wash-one { top: -180rpx; right: -190rpx; width: 620rpx; height: 620rpx; border: 1rpx solid rgba(30, 104, 76, 0.07); box-shadow: 0 0 0 70rpx rgba(30, 104, 76, 0.025), 0 0 0 140rpx rgba(30, 104, 76, 0.018); }
.wash-two { bottom: -260rpx; left: -280rpx; width: 700rpx; height: 700rpx; background: radial-gradient(circle, rgba(39, 117, 81, 0.09), rgba(39, 117, 81, 0)); }
.grain { position: absolute; inset: 0; opacity: .17; background-image: radial-gradient(rgba(32, 67, 51, .26) .6rpx, transparent .6rpx); background-size: 13rpx 13rpx; pointer-events: none; }
.brand-bar { position: relative; z-index: 1; display: flex; height: 92rpx; align-items: center; }
.brand-mini-seal { display: flex; width: 54rpx; height: 54rpx; align-items: center; justify-content: center; border: 1rpx solid #2a7758; border-radius: 16rpx; background: #176b4d; box-shadow: 0 7rpx 18rpx rgba(23, 107, 77, .15); color: #fff; font-family: serif; font-size: 25rpx; }
.brand-mini-name { margin-left: 13rpx; color: #274338; font-family: 'STKaiti', 'KaiTi', serif; font-size: 29rpx; font-weight: 700; }
.brand-version { margin-left: auto; padding: 6rpx 13rpx; border: 1rpx solid rgba(50, 91, 70, .15); border-radius: 15rpx; color: #7b8a82; font-size: 18rpx; }
.login-content { position: relative; z-index: 1; display: flex; width: 100%; max-width: 720rpx; flex: 1; justify-content: center; margin: 0 auto; flex-direction: column; }
.hero-copy { margin: 14rpx 12rpx 34rpx; }
.hero-kicker { display: block; color: #a27a39; font-size: 18rpx; letter-spacing: 6rpx; }
.hero-title { display: block; margin-top: 18rpx; color: #1f4032; font-family: 'STKaiti', 'KaiTi', serif; font-size: 55rpx; font-weight: 700; line-height: 1.27; letter-spacing: 3rpx; }
.hero-rule { display: flex; width: 240rpx; align-items: center; margin-top: 20rpx; }
.hero-rule > text:last-child { height: 1rpx; flex: 1; background: linear-gradient(90deg, #ad823e, transparent); }
.rule-dot { width: 9rpx; height: 9rpx; margin-right: 8rpx; border-radius: 50%; background: #ad823e; }
.hero-description { display: block; margin-top: 15rpx; color: #718078; font-size: 23rpx; }
.login-card { padding: 32rpx 30rpx 28rpx; border: 1rpx solid rgba(42, 93, 67, .12); border-radius: 34rpx; background: rgba(255, 255, 255, .88); box-shadow: 0 24rpx 70rpx rgba(45, 70, 57, .11); backdrop-filter: blur(18px); }
.card-heading { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 27rpx; }
.welcome,
.welcome-subtitle { display: block; }
.welcome { color: #263d32; font-size: 34rpx; font-weight: 750; }
.welcome-subtitle { margin-top: 7rpx; color: #87938c; font-size: 21rpx; }
.secure-badge { padding: 7rpx 13rpx; border-radius: 14rpx; background: #e7f1e9; color: #287653; font-size: 18rpx; }
.field { margin-top: 19rpx; }
.field-label { display: block; margin: 0 0 9rpx 4rpx; color: #5c6c63; font-size: 21rpx; font-weight: 650; }
.field-input-row { display: flex; height: 88rpx; align-items: center; padding: 0 19rpx; border: 1rpx solid #dde4de; border-radius: 24rpx; background: #f9faf8; transition: border .2s; }
.field.invalid .field-input-row { border-color: rgba(182, 75, 70, .35); }
.field-icon { display: flex; width: 42rpx; height: 42rpx; align-items: center; justify-content: center; margin-right: 10rpx; border-radius: 13rpx; background: #e8eee9; color: #50665a; font-size: 18rpx; }
.field-input { min-width: 0; flex: 1; color: #263b31; font-size: 26rpx; }
.password-toggle { height: 48rpx; margin: 0; padding: 0 5rpx 0 18rpx; background: transparent; color: #688076; font-size: 20rpx; line-height: 48rpx; }
.error-banner { display: flex; align-items: center; margin-top: 17rpx; padding: 14rpx 16rpx; border-radius: 18rpx; background: #f9ecea; color: #a64c48; font-size: 21rpx; }
.error-icon { display: flex; width: 30rpx; height: 30rpx; align-items: center; justify-content: center; margin-right: 10rpx; border-radius: 50%; background: #b64b46; color: #fff; font-size: 18rpx; font-weight: 700; }
.login-button { height: 88rpx; margin-top: 27rpx; border-radius: 25rpx; background: linear-gradient(135deg, #185f47, #247b58); box-shadow: 0 14rpx 30rpx rgba(23, 107, 77, .22); color: #fff; font-size: 28rpx; font-weight: 700; line-height: 88rpx; letter-spacing: 3rpx; }
.login-button[disabled] { opacity: .7; }
.demo-tip { display: flex; align-items: center; justify-content: center; margin-top: 19rpx; color: #8b968f; font-size: 19rpx; }
.demo-label { margin-right: 10rpx; padding: 4rpx 10rpx; border-radius: 10rpx; background: #f3ead9; color: #966b28; }
.security-row { display: flex; justify-content: center; margin-top: 27rpx; gap: 16rpx; }
.security-item { display: flex; align-items: center; color: #77877e; font-size: 18rpx; }
.security-mark { margin-right: 5rpx; color: #2c805b; font-size: 18rpx; font-weight: 700; }
.login-footer { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; color: #929d96; font-size: 17rpx; }
.privacy-button { height: 44rpx; margin: 0 16rpx 0 0; padding: 0; background: transparent; color: #60766a; font-size: 18rpx; line-height: 44rpx; text-decoration: underline; }

@media (max-height: 700px) {
  .hero-copy { margin-top: 0; margin-bottom: 20rpx; }
  .hero-title { font-size: 47rpx; }
  .hero-description,
  .security-row { display: none; }
  .login-card { padding-top: 25rpx; padding-bottom: 23rpx; }
  .field-input-row,
  .login-button { height: 78rpx; line-height: 78rpx; }
}
</style>

