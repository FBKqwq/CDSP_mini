<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useHealthContextStore } from '@/stores/health-context'
import type { MedicalHistory, PatientProfile } from '@/types/domain'

const props = withDefaults(defineProps<{ loggingOut?: boolean }>(), { loggingOut: false })
defineEmits<{ logout: [] }>()

const healthStore = useHealthContextStore()
const profileEditing = ref(false)
const historyEditingId = ref<string | null>(null)
const historyFormVisible = ref(false)
const genders: PatientProfile['gender'][] = ['男', '女', '未知']

function localDateText(value = new Date()): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const today = localDateText()
const profileMeta = computed(() => {
  const profile = healthStore.profile
  if (!profile) return ''
  const age = profile.age == null ? '年龄未知' : `${profile.age} 岁`
  return `${profile.gender} · ${age}`
})

const profileForm = reactive({
  name: '',
  gender: '未知' as PatientProfile['gender'],
  birthDate: '',
})
const historyForm = reactive({ name: '', description: '', diagnosedAt: '' })

function beginProfileEdit(): void {
  const profile = healthStore.profile
  if (!profile) return
  profileForm.name = profile.name
  profileForm.gender = profile.gender
  profileForm.birthDate = profile.birthDate || ''
  profileEditing.value = true
}

function onProfileDateChange(event: { detail: { value: string } }): void {
  profileForm.birthDate = event.detail.value
}

async function saveProfile(): Promise<void> {
  const name = profileForm.name.trim()
  if (!name) {
    uni.showToast({ title: '请输入姓名', icon: 'none' })
    return
  }
  if (profileForm.birthDate && profileForm.birthDate > today) {
    uni.showToast({ title: '出生日期不能晚于今天', icon: 'none' })
    return
  }
  const success = await healthStore.updateProfile({
    name,
    gender: profileForm.gender,
    birthDate: profileForm.birthDate || undefined,
  })
  if (!success) {
    uni.showToast({ title: healthStore.errorMessage || '资料更新失败', icon: 'none' })
    return
  }
  profileEditing.value = false
  uni.showToast({ title: '资料已更新', icon: 'success' })
}

function resetHistoryForm(): void {
  historyForm.name = ''
  historyForm.description = ''
  historyForm.diagnosedAt = ''
}

function beginCreateHistory(): void {
  historyEditingId.value = null
  resetHistoryForm()
  historyFormVisible.value = true
}

function beginEditHistory(history: MedicalHistory): void {
  historyEditingId.value = history.id
  historyForm.name = history.name
  historyForm.description = history.description || ''
  historyForm.diagnosedAt = history.diagnosedAt || ''
  historyFormVisible.value = true
}

function cancelHistoryEdit(): void {
  historyFormVisible.value = false
  historyEditingId.value = null
  resetHistoryForm()
}

function onHistoryDateChange(event: { detail: { value: string } }): void {
  historyForm.diagnosedAt = event.detail.value
}

async function saveHistory(): Promise<void> {
  const name = historyForm.name.trim()
  const description = historyForm.description.trim()
  if (!name) {
    uni.showToast({ title: '请输入疾病名称', icon: 'none' })
    return
  }
  if (description.length > 500) {
    uni.showToast({ title: '疾病说明不能超过 500 字', icon: 'none' })
    return
  }
  if (historyForm.diagnosedAt && historyForm.diagnosedAt > today) {
    uni.showToast({ title: '诊断日期不能晚于今天', icon: 'none' })
    return
  }
  const input = {
    name,
    description: description || undefined,
    diagnosedAt: historyForm.diagnosedAt || undefined,
  }
  const success = historyEditingId.value
    ? await healthStore.updateMedicalHistory(historyEditingId.value, input)
    : await healthStore.createMedicalHistory(input)
  if (!success) {
    uni.showToast({ title: healthStore.errorMessage || '历史疾病保存失败', icon: 'none' })
    return
  }
  cancelHistoryEdit()
  uni.showToast({ title: '历史疾病已保存', icon: 'success' })
}

async function confirmDeleteHistory(history: MedicalHistory): Promise<void> {
  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '删除历史疾病？',
      content: `确认移除“${history.name}”吗？`,
      confirmText: '删除',
      confirmColor: '#B64B46',
      success: (result) => resolve(result.confirm),
      fail: () => resolve(false),
    })
  })
  if (!confirmed) return
  if (!(await healthStore.deleteMedicalHistory(history.id))) {
    uni.showToast({ title: healthStore.errorMessage || '删除失败', icon: 'none' })
    return
  }
  if (historyEditingId.value === history.id) cancelHistoryEdit()
  uni.showToast({ title: '已删除', icon: 'success' })
}
</script>

<template>
  <view class="profile-panel">
    <view v-if="healthStore.profile" class="profile-hero">
      <view class="profile-avatar">{{ healthStore.profile.name.slice(0, 1) || '我' }}</view>
      <view class="profile-copy">
        <text class="profile-name">{{ healthStore.profile.name }}</text>
        <text class="profile-meta">{{ profileMeta }}</text>
        <text class="profile-code">档案号 {{ healthStore.profile.code }}</text>
      </view>
      <button class="edit-profile-button" :disabled="healthStore.mutating" @tap="beginProfileEdit">编辑</button>
    </view>

    <view v-else class="empty-card">
      <text class="empty-title">未能加载本人资料</text>
      <text class="empty-copy">{{ healthStore.errorMessage || '当前账号尚未绑定有效患者档案' }}</text>
      <button class="retry-button" :loading="healthStore.loading" @tap="healthStore.loadAll">重新加载</button>
    </view>

    <view v-if="profileEditing" class="edit-card">
      <text class="edit-title">编辑个人资料</text>
      <view class="form-field">
        <text class="field-label">姓名</text>
        <input v-model="profileForm.name" class="field-input" maxlength="80" placeholder="请输入姓名" />
      </view>
      <view class="form-field">
        <text class="field-label">性别</text>
        <view class="gender-options">
          <button v-for="gender in genders" :key="gender" class="gender-option" :class="{ active: profileForm.gender === gender }" @tap="profileForm.gender = gender">{{ gender }}</button>
        </view>
      </view>
      <view class="form-field">
        <text class="field-label">出生日期</text>
        <view class="date-row">
          <picker class="date-picker" mode="date" :value="profileForm.birthDate || today" :end="today" @change="onProfileDateChange">
            <view class="date-value" :class="{ placeholder: !profileForm.birthDate }">{{ profileForm.birthDate || '请选择出生日期' }}</view>
          </picker>
          <button v-if="profileForm.birthDate" class="clear-date" @tap="profileForm.birthDate = ''">清空</button>
        </view>
      </view>
      <view class="form-actions">
        <button class="secondary-button" :disabled="healthStore.mutating" @tap="profileEditing = false">取消</button>
        <button class="primary-button" :loading="healthStore.mutating" :disabled="healthStore.mutating" @tap="saveProfile">保存资料</button>
      </view>
    </view>

    <view class="history-section">
      <view class="section-heading">
        <view>
          <text class="section-title">历史疾病</text>
          <text class="section-subtitle">共 {{ healthStore.medicalHistories.length }} 条</text>
        </view>
        <button class="add-button" :disabled="healthStore.mutating" @tap="beginCreateHistory">新增</button>
      </view>

      <view v-if="historyFormVisible" class="edit-card history-editor">
        <text class="edit-title">{{ historyEditingId ? '修改历史疾病' : '新增历史疾病' }}</text>
        <view class="form-field">
          <text class="field-label">疾病名称</text>
          <input v-model="historyForm.name" class="field-input" maxlength="80" placeholder="请输入疾病名称" />
        </view>
        <view class="form-field">
          <text class="field-label">补充说明</text>
          <textarea v-model="historyForm.description" class="field-textarea" maxlength="500" placeholder="可不填写，最多 500 字" />
          <text class="character-count">{{ historyForm.description.length }}/500</text>
        </view>
        <view class="form-field">
          <text class="field-label">诊断日期</text>
          <view class="date-row">
            <picker class="date-picker" mode="date" :value="historyForm.diagnosedAt || today" :end="today" @change="onHistoryDateChange">
              <view class="date-value" :class="{ placeholder: !historyForm.diagnosedAt }">{{ historyForm.diagnosedAt || '请选择诊断日期' }}</view>
            </picker>
            <button v-if="historyForm.diagnosedAt" class="clear-date" @tap="historyForm.diagnosedAt = ''">清空</button>
          </view>
        </view>
        <view class="form-actions">
          <button class="secondary-button" :disabled="healthStore.mutating" @tap="cancelHistoryEdit">取消</button>
          <button class="primary-button" :loading="healthStore.mutating" :disabled="healthStore.mutating" @tap="saveHistory">保存</button>
        </view>
      </view>

      <view v-if="healthStore.medicalHistories.length" class="history-list">
        <view v-for="history in healthStore.medicalHistories" :key="history.id" class="history-card">
          <view class="history-mark">病</view>
          <view class="history-copy">
            <text class="history-name">{{ history.name }}</text>
            <text class="history-description">{{ history.description || '暂无补充说明' }}</text>
            <text class="history-date">{{ history.diagnosedAt ? `诊断于 ${history.diagnosedAt}` : '诊断日期未填写' }}</text>
          </view>
          <view class="history-actions">
            <button class="text-button" :disabled="healthStore.mutating" @tap="beginEditHistory(history)">修改</button>
            <button class="text-button danger" :disabled="healthStore.mutating" @tap="confirmDeleteHistory(history)">删除</button>
          </view>
        </view>
      </view>
      <view v-else class="empty-history">
        <text class="empty-title">暂无历史疾病</text>
        <text class="empty-copy">可点击“新增”补充既往疾病记录。</text>
      </view>
    </view>

    <button class="logout-button" :loading="props.loggingOut" :disabled="props.loggingOut" @tap="$emit('logout')">{{ props.loggingOut ? '正在退出' : '退出登录' }}</button>
  </view>
</template>

<style scoped>
.profile-panel { padding: 6rpx 0 100rpx; }
.profile-hero { display: flex; align-items: center; padding: 20rpx; border-radius: 22rpx; background: linear-gradient(145deg, #1a654b, #244f3e); box-shadow: 0 9rpx 24rpx rgba(23, 86, 63, .14); color: #fff; }
.profile-avatar { display: flex; width: 70rpx; height: 70rpx; align-items: center; justify-content: center; flex: 0 0 auto; border: 1rpx solid rgba(255, 255, 255, .25); border-radius: 21rpx; background: rgba(255, 255, 255, .1); font-size: 29rpx; font-weight: 700; }
.profile-copy { min-width: 0; flex: 1; margin-left: 15rpx; }
.profile-name, .profile-meta, .profile-code, .section-title, .section-subtitle, .edit-title, .field-label, .history-name, .history-description, .history-date, .empty-title, .empty-copy, .character-count { display: block; }
.profile-name { font-size: 27rpx; font-weight: 750; }
.profile-meta { margin-top: 4rpx; color: rgba(255, 255, 255, .78); font-size: 19rpx; }
.profile-code { margin-top: 3rpx; color: rgba(255, 255, 255, .58); font-size: 17rpx; }
.edit-profile-button { height: 46rpx; margin: 0; padding: 0 14rpx; border: 1rpx solid rgba(255, 255, 255, .24); border-radius: 13rpx; background: rgba(255, 255, 255, .1); color: #fff; font-size: 18rpx; line-height: 44rpx; }
.edit-card, .empty-card { margin-top: 14rpx; padding: 18rpx; border: 1rpx solid #dce5dd; border-radius: 20rpx; background: #fff; box-shadow: 0 6rpx 20rpx rgba(40, 65, 52, .04); }
.edit-title { color: #2b4035; font-size: 24rpx; font-weight: 700; }
.form-field { margin-top: 14rpx; }
.field-label { margin: 0 0 6rpx 2rpx; color: #65756c; font-size: 19rpx; font-weight: 650; }
.field-input, .date-value, .field-textarea { box-sizing: border-box; width: 100%; border: 1rpx solid #dde4de; border-radius: 15rpx; background: #f9faf8; color: #2c4036; font-size: 21rpx; }
.field-input, .date-value { height: 64rpx; padding: 0 14rpx; line-height: 62rpx; }
.field-textarea { height: 150rpx; padding: 13rpx 14rpx; line-height: 1.55; }
.character-count { margin-top: 5rpx; color: #98a29c; font-size: 17rpx; text-align: right; }
.gender-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; }
.gender-option { height: 56rpx; margin: 0; padding: 0; border: 1rpx solid #dce3dd; border-radius: 14rpx; background: #f8faf8; color: #728078; font-size: 20rpx; line-height: 54rpx; }
.gender-option.active { border-color: #176b4d; background: #eaf3ec; color: #176b4d; font-weight: 700; }
.date-row { display: flex; align-items: center; gap: 10rpx; }
.date-picker { min-width: 0; flex: 1; }
.date-value.placeholder { color: #a0aaa4; }
.clear-date { width: 82rpx; height: 62rpx; margin: 0; padding: 0; border-radius: 14rpx; background: #eef1ed; color: #748078; font-size: 18rpx; line-height: 62rpx; }
.form-actions { display: grid; grid-template-columns: 1fr 1.6fr; margin-top: 23rpx; gap: 13rpx; }
.secondary-button, .primary-button { height: 60rpx; margin: 0; border-radius: 16rpx; font-size: 20rpx; line-height: 58rpx; }
.secondary-button { border: 1rpx solid #dbe2dc; background: #f5f7f5; color: #6e7d74; }
.primary-button { background: #176b4d; color: #fff; font-weight: 700; }
.history-section { margin-top: 18rpx; }
.section-heading { display: flex; align-items: center; justify-content: space-between; padding: 0 3rpx 9rpx; }
.section-title { color: #263c31; font-size: 26rpx; font-weight: 750; }
.section-subtitle { margin-top: 2rpx; color: #87948c; font-size: 18rpx; }
.add-button, .retry-button { height: 48rpx; margin: 0; padding: 0 18rpx; border-radius: 14rpx; background: #e5f0e7; color: #176b4d; font-size: 19rpx; font-weight: 700; line-height: 48rpx; }
.history-editor { margin-top: 0; margin-bottom: 13rpx; }
.history-card { display: flex; align-items: flex-start; margin-bottom: 11rpx; padding: 16rpx; border: 1rpx solid #e0e6e0; border-radius: 19rpx; background: #fff; }
.history-mark { display: flex; width: 52rpx; height: 52rpx; align-items: center; justify-content: center; flex: 0 0 auto; border-radius: 16rpx; background: #f3ead9; color: #936720; font-size: 21rpx; font-weight: 700; }
.history-copy { min-width: 0; flex: 1; margin-left: 13rpx; }
.history-name { color: #2a4035; font-size: 22rpx; font-weight: 700; }
.history-description { overflow: hidden; margin-top: 4rpx; color: #718078; font-size: 18rpx; line-height: 1.5; text-overflow: ellipsis; white-space: nowrap; }
.history-date { margin-top: 4rpx; color: #9a8d78; font-size: 17rpx; }
.history-actions { display: flex; flex: 0 0 auto; margin-left: 8rpx; flex-direction: column; }
.text-button { height: 38rpx; margin: 0 0 4rpx; padding: 0 9rpx; background: transparent; color: #176b4d; font-size: 17rpx; line-height: 38rpx; }
.text-button.danger { color: #a45852; }
.empty-card, .empty-history { padding: 45rpx 24rpx; color: #89958e; text-align: center; }
.empty-history { border: 1rpx dashed #d5ddd6; border-radius: 19rpx; background: rgba(255, 255, 255, .58); }
.empty-title { color: #52665c; font-size: 23rpx; font-weight: 700; }
.empty-copy { margin-top: 8rpx; font-size: 19rpx; line-height: 1.6; }
.retry-button { margin: 18rpx auto 0; }
.logout-button { position: fixed; z-index: 19; left: 50%; bottom: calc(128rpx + env(safe-area-inset-bottom)); width: calc(100% - 40rpx); max-width: 720rpx; height: 58rpx; margin: 0; border: 1rpx solid #e2c8c5; border-radius: 17rpx; background: #fbf2f1; box-shadow: 0 6rpx 18rpx rgba(73, 52, 49, .08); color: #a04e49; font-size: 20rpx; line-height: 56rpx; transform: translateX(-50%); }
.logout-button[disabled] { opacity: .65; }
</style>
