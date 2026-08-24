<script setup lang="ts">
import { reactive, ref } from 'vue'
import ReportPanel from '@/components/report/ReportPanel.vue'
import { useHealthContextStore } from '@/stores/health-context'
import type { PatientProfile } from '@/types/domain'

defineEmits<{ logout: [] }>()

const healthStore = useHealthContextStore()
const profileEditing = ref(false)
const genders: PatientProfile['gender'][] = ['男', '女', '未知']

const profileForm = reactive({
  name: '',
  gender: '未知' as PatientProfile['gender'],
  age: '',
})

function beginProfileEdit(): void {
  const profile = healthStore.profile
  if (!profile) return
  profileForm.name = profile.name
  profileForm.gender = profile.gender
  profileForm.age = profile.age === undefined ? '' : String(profile.age)
  profileEditing.value = true
}

function cancelProfileEdit(): void {
  profileEditing.value = false
}

async function saveProfile(): Promise<void> {
  const name = profileForm.name.trim()
  const ageText = profileForm.age.trim()
  const age = ageText ? Number(ageText) : undefined
  if (!name) {
    uni.showToast({ title: '请输入姓名', icon: 'none' })
    return
  }
  if (age !== undefined && (!Number.isInteger(age) || age < 0 || age > 150)) {
    uni.showToast({ title: '年龄应为 0～150 的整数', icon: 'none' })
    return
  }
  if (!(await healthStore.updateProfile({ name, gender: profileForm.gender, age }))) {
    uni.showToast({ title: healthStore.errorMessage || '资料更新失败', icon: 'none' })
    return
  }
  profileEditing.value = false
  uni.showToast({ title: '资料已更新', icon: 'success' })
}

</script>

<template>
  <view class="profile-panel">
    <view v-if="healthStore.profile" class="profile-hero">
      <view class="profile-avatar">{{ healthStore.profile.name.slice(0, 1) || '我' }}</view>
      <view class="profile-copy">
        <text class="profile-name">{{ healthStore.profile.name }}</text>
        <text class="profile-meta">{{ healthStore.profile.gender }} · {{ healthStore.profile.age ?? '年龄未填写' }}</text>
      </view>
      <button class="edit-profile-button" :disabled="healthStore.mutating" @tap="beginProfileEdit">编辑</button>
    </view>

    <view v-if="profileEditing" class="edit-card">
      <view class="edit-heading">
        <text class="edit-title">编辑个人资料</text>
      </view>
      <view class="form-field">
        <text class="field-label">姓名</text>
        <input v-model="profileForm.name" class="field-input" maxlength="80" placeholder="请输入姓名" />
      </view>
      <view class="form-field">
        <text class="field-label">性别</text>
        <view class="gender-options">
          <button
            v-for="gender in genders"
            :key="gender"
            class="gender-option"
            :class="{ active: profileForm.gender === gender }"
            @tap="profileForm.gender = gender"
          >{{ gender }}</button>
        </view>
      </view>
      <view class="form-field">
        <text class="field-label">年龄</text>
        <input v-model="profileForm.age" class="field-input" type="number" maxlength="3" placeholder="可不填写" />
      </view>
      <view class="form-actions">
        <button class="secondary-button" :disabled="healthStore.mutating" @tap="cancelProfileEdit">取消</button>
        <button class="primary-button" :loading="healthStore.mutating" :disabled="healthStore.mutating" @tap="saveProfile">保存资料</button>
      </view>
    </view>

    <ReportPanel />

    <button class="logout-button" @tap="$emit('logout')">退出登录</button>
  </view>
</template>

<style scoped>
.profile-panel { padding: 6rpx 0 86rpx; }
.profile-hero { display: flex; align-items: center; padding: 18rpx 20rpx; border-radius: 20rpx; background: linear-gradient(145deg, #1a654b, #244f3e); box-shadow: 0 9rpx 24rpx rgba(23, 86, 63, 0.14); color: #fff; }
.profile-avatar { display: flex; width: 66rpx; height: 66rpx; align-items: center; justify-content: center; flex: 0 0 auto; border: 1rpx solid rgba(255, 255, 255, .25); border-radius: 20rpx; background: rgba(255, 255, 255, .1); font-family: serif; font-size: 28rpx; font-weight: 700; }
.profile-copy { min-width: 0; flex: 1; margin-left: 14rpx; }
.profile-name,
.profile-meta { display: block; }
.profile-name { font-size: 26rpx; font-weight: 750; }
.profile-meta { margin-top: 4rpx; color: rgba(255, 255, 255, .72); font-size: 18rpx; }
.edit-profile-button { height: 44rpx; margin: 0; padding: 0 13rpx; border: 1rpx solid rgba(255, 255, 255, .24); border-radius: 13rpx; background: rgba(255, 255, 255, .1); color: #fff; font-size: 17rpx; line-height: 42rpx; }
.edit-card { margin-top: 12rpx; padding: 17rpx; border: 1rpx solid #dce5dd; border-radius: 19rpx; background: #fff; box-shadow: 0 6rpx 20rpx rgba(40, 65, 52, .04); }
.edit-heading { margin-bottom: 12rpx; }
.edit-title { display: block; }
.edit-title { color: #2b4035; font-size: 23rpx; font-weight: 700; }
.form-field { margin-top: 12rpx; }
.field-label { display: block; margin: 0 0 5rpx 2rpx; color: #65756c; font-size: 18rpx; font-weight: 650; }
.field-input { box-sizing: border-box; width: 100%; height: 62rpx; padding: 0 14rpx; border: 1rpx solid #dde4de; border-radius: 15rpx; background: #f9faf8; color: #2c4036; font-size: 20rpx; }
.gender-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; }
.gender-option { height: 54rpx; margin: 0; padding: 0; border: 1rpx solid #dce3dd; border-radius: 14rpx; background: #f8faf8; color: #728078; font-size: 19rpx; line-height: 52rpx; }
.gender-option.active { border-color: #176b4d; background: #eaf3ec; color: #176b4d; font-weight: 700; }
.form-actions { display: grid; grid-template-columns: 1fr 1.6fr; margin-top: 22rpx; gap: 13rpx; }
.secondary-button,
.primary-button { height: 58rpx; margin: 0; border-radius: 16rpx; font-size: 19rpx; line-height: 56rpx; }
.secondary-button { border: 1rpx solid #dbe2dc; background: #f5f7f5; color: #6e7d74; }
.primary-button { background: #176b4d; color: #fff; font-weight: 700; }
.logout-button { position: fixed; z-index: 19; left: 50%; bottom: calc(128rpx + env(safe-area-inset-bottom)); width: calc(100% - 40rpx); max-width: 720rpx; height: 58rpx; margin: 0; border: 1rpx solid #e2c8c5; border-radius: 17rpx; background: #fbf2f1; box-shadow: 0 6rpx 18rpx rgba(73, 52, 49, .08); color: #a04e49; font-size: 20rpx; line-height: 56rpx; transform: translateX(-50%); }
</style>
