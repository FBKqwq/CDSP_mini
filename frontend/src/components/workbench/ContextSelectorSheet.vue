<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { usePatientStore } from '@/stores/patient'
import type { Doctor, Patient } from '@/types/domain'

const props = defineProps<{
  visible: boolean
  type: 'patient' | 'disease' | 'doctor'
  currentId: string
  doctors: Doctor[]
}>()

const emit = defineEmits<{
  close: []
  select: [id: string]
  created: [patient: Patient]
  deleted: [patientId: string]
}>()

const patientStore = usePatientStore()
const query = ref('')
const addMode = ref(false)
const submitting = ref(false)
const form = reactive({ name: '', gender: '未知' as Patient['gender'], age: '' })

const title = computed(() => ({ patient: '选择患者', disease: '选择疾病分组', doctor: '选择协作专家' })[props.type])

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    query.value = ''
    addMode.value = false
    patientStore.searchQuery = ''
  },
)

watch(query, (value) => {
  patientStore.searchQuery = value
})

async function createPatient(): Promise<void> {
  if (!form.name.trim()) {
    uni.showToast({ title: '请输入患者姓名', icon: 'none' })
    return
  }
  const age = form.age ? Number(form.age) : undefined
  if (age !== undefined && (!Number.isInteger(age) || age < 0 || age > 120)) {
    uni.showToast({ title: '年龄应为 0～120 的整数', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const patient = await patientStore.createPatient({ name: form.name, gender: form.gender, age })
    form.name = ''
    form.gender = '未知'
    form.age = ''
    addMode.value = false
    emit('created', patient)
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '新增失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

async function deletePatient(patient: Patient): Promise<void> {
  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: `删除 ${patient.name}？`,
      content: `患者编号 ${patient.code}。删除不可撤销，请确认当前会话已结束或放弃。`,
      confirmText: '确认删除',
      confirmColor: '#B64B46',
      success: (result) => resolve(result.confirm),
      fail: () => resolve(false),
    })
  })
  if (!confirmed) return
  try {
    await patientStore.deletePatient(patient.id)
    emit('deleted', patient.id)
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '删除失败', icon: 'none' })
  }
}
</script>

<template>
  <view v-if="visible" class="sheet-layer" @tap.self="$emit('close')">
    <view class="sheet">
      <view class="sheet-handle" />
      <view class="sheet-header">
        <view>
          <text class="sheet-eyebrow">诊疗上下文</text>
          <text class="sheet-title">{{ title }}</text>
        </view>
        <button class="close-button" @tap="$emit('close')">×</button>
      </view>

      <template v-if="type === 'patient'">
        <view class="patient-tools">
          <view class="search-box">
            <text class="search-icon">⌕</text>
            <input v-model="query" class="search-input" placeholder="搜索姓名或患者编号" maxlength="30" />
          </view>
          <button class="add-button" @tap="addMode = !addMode">{{ addMode ? '取消' : '+ 新增' }}</button>
        </view>

        <view v-if="addMode" class="add-card">
          <text class="add-title">新增患者</text>
          <input v-model="form.name" class="form-input" placeholder="患者姓名（必填）" maxlength="30" />
          <view class="form-row">
            <view class="gender-group">
              <button
                v-for="gender in (['男', '女', '未知'] as const)"
                :key="gender"
                class="gender-button"
                :class="{ active: form.gender === gender }"
                @tap="form.gender = gender"
              >{{ gender }}</button>
            </view>
            <input v-model="form.age" class="age-input" type="number" placeholder="年龄" maxlength="3" />
          </view>
          <button class="submit-patient" :loading="submitting" :disabled="submitting" @tap="createPatient">保存并选中</button>
        </view>

        <scroll-view class="option-list" scroll-y>
          <view
            v-for="patient in patientStore.filteredPatients"
            :key="patient.id"
            class="option-card"
            :class="{ selected: currentId === patient.id }"
            @tap="$emit('select', patient.id)"
          >
            <view class="patient-avatar">{{ patient.name.slice(0, 1) }}</view>
            <view class="option-copy">
              <view class="option-title-line">
                <text class="option-title">{{ patient.name }}</text>
                <text v-if="currentId === patient.id" class="selected-label">当前</text>
              </view>
              <text class="option-description">{{ patient.code }} · {{ patient.gender }}{{ patient.age ? ` · ${patient.age}岁` : '' }}</text>
            </view>
            <button class="delete-button" @tap.stop="deletePatient(patient)">删除</button>
          </view>
          <view v-if="!patientStore.filteredPatients.length" class="empty-list">没有匹配的患者，可点击右上角新增</view>
        </scroll-view>
      </template>

      <scroll-view v-else-if="type === 'disease'" class="option-list option-list-simple" scroll-y>
        <view
          v-for="group in patientStore.diseaseGroups"
          :key="group.id"
          class="option-card"
          :class="{ selected: currentId === group.id }"
          @tap="$emit('select', group.id)"
        >
          <view class="option-symbol">方</view>
          <view class="option-copy">
            <view class="option-title-line">
              <text class="option-title">{{ group.name }}</text>
              <text v-if="currentId === group.id" class="selected-label">当前</text>
            </view>
            <text class="option-description">{{ group.description }}</text>
          </view>
          <text class="select-mark">{{ currentId === group.id ? '✓' : '›' }}</text>
        </view>
      </scroll-view>

      <scroll-view v-else class="option-list option-list-simple" scroll-y>
        <view
          v-for="doctor in doctors"
          :key="doctor.id"
          class="option-card"
          :class="{ selected: currentId === doctor.id, disabled: !doctor.enabled }"
          @tap="doctor.enabled && $emit('select', doctor.id)"
        >
          <view class="doctor-avatar">{{ doctor.name.slice(0, 1) }}</view>
          <view class="option-copy">
            <view class="option-title-line">
              <text class="option-title">{{ doctor.name }}</text>
              <text class="doctor-title">{{ doctor.title }}</text>
              <text v-if="currentId === doctor.id" class="selected-label">当前</text>
            </view>
            <text class="option-description">{{ doctor.enabled ? doctor.specialty : doctor.unavailableReason }}</text>
          </view>
          <text class="select-mark">{{ !doctor.enabled ? '锁' : currentId === doctor.id ? '✓' : '›' }}</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<style scoped>
.sheet-layer {
  position: fixed;
  z-index: 50;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(17, 34, 27, 0.44);
  backdrop-filter: blur(5px);
}

.sheet {
  width: 100%;
  max-width: 760rpx;
  max-height: 86vh;
  padding: 12rpx 26rpx calc(30rpx + env(safe-area-inset-bottom));
  border-radius: 36rpx 36rpx 0 0;
  background: #f8faf6;
  box-shadow: 0 -16rpx 50rpx rgba(10, 30, 20, 0.16);
}

.sheet-handle {
  width: 70rpx;
  height: 8rpx;
  margin: 0 auto 18rpx;
  border-radius: 6rpx;
  background: #cad2cb;
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.sheet-eyebrow,
.sheet-title { display: block; }
.sheet-eyebrow { color: #7b8d83; font-size: 20rpx; letter-spacing: 4rpx; }
.sheet-title { margin-top: 4rpx; color: #1f352b; font-size: 36rpx; font-weight: 750; }

.close-button {
  width: 64rpx;
  height: 64rpx;
  margin: 0;
  padding: 0;
  border-radius: 50%;
  background: #e9eee9;
  color: #65736b;
  font-size: 42rpx;
  font-weight: 300;
  line-height: 60rpx;
}

.patient-tools { display: flex; gap: 14rpx; margin-bottom: 18rpx; }
.search-box { display: flex; height: 72rpx; align-items: center; flex: 1; padding: 0 22rpx; border: 1rpx solid #dce3dc; border-radius: 22rpx; background: #fff; }
.search-icon { margin-right: 10rpx; color: #718078; font-size: 30rpx; }
.search-input { min-width: 0; flex: 1; color: #253a31; font-size: 25rpx; }
.add-button { height: 72rpx; margin: 0; padding: 0 24rpx; border-radius: 22rpx; background: #176b4d; color: #fff; font-size: 24rpx; line-height: 72rpx; }

.add-card { margin-bottom: 18rpx; padding: 22rpx; border: 1rpx solid #dce7df; border-radius: 24rpx; background: #eef5ef; }
.add-title { display: block; margin-bottom: 14rpx; font-size: 26rpx; font-weight: 700; }
.form-input,
.age-input { height: 70rpx; padding: 0 20rpx; border: 1rpx solid #d8e0d8; border-radius: 18rpx; background: #fff; font-size: 24rpx; }
.form-row { display: flex; margin-top: 14rpx; gap: 14rpx; }
.gender-group { display: flex; flex: 1; gap: 8rpx; }
.gender-button { height: 66rpx; flex: 1; margin: 0; padding: 0; border: 1rpx solid #d8e0d8; border-radius: 17rpx; background: #fff; color: #708078; font-size: 23rpx; line-height: 64rpx; }
.gender-button.active { border-color: #176b4d; background: #176b4d; color: #fff; }
.age-input { width: 150rpx; }
.submit-patient { height: 70rpx; margin-top: 16rpx; border-radius: 20rpx; background: #244c3c; color: #fff; font-size: 24rpx; line-height: 70rpx; }

.option-list { max-height: 55vh; }
.option-list-simple { max-height: 62vh; }
.option-card { display: flex; min-height: 104rpx; align-items: center; margin-bottom: 14rpx; padding: 18rpx 18rpx; border: 1rpx solid #e2e7e1; border-radius: 24rpx; background: #fff; }
.option-card.selected { border-color: rgba(23, 107, 77, 0.42); background: #f0f8f2; box-shadow: inset 6rpx 0 #176b4d; }
.option-card.disabled { opacity: 0.52; }
.patient-avatar,
.doctor-avatar,
.option-symbol { display: flex; width: 64rpx; height: 64rpx; align-items: center; justify-content: center; flex: 0 0 auto; border-radius: 21rpx; background: #e5efe7; color: #176b4d; font-size: 26rpx; font-weight: 700; }
.doctor-avatar { background: #e5edf1; color: #2f6a86; }
.option-symbol { background: #f3ead9; color: #9a6920; font-family: serif; }
.option-copy { min-width: 0; flex: 1; margin-left: 16rpx; }
.option-title-line { display: flex; align-items: center; gap: 10rpx; }
.option-title { color: #24392f; font-size: 27rpx; font-weight: 700; }
.doctor-title { color: #819087; font-size: 20rpx; }
.selected-label { padding: 3rpx 11rpx; border-radius: 12rpx; background: #dceee2; color: #176b4d; font-size: 18rpx; }
.option-description { display: block; overflow: hidden; margin-top: 6rpx; color: #849088; font-size: 21rpx; line-height: 1.5; text-overflow: ellipsis; white-space: nowrap; }
.delete-button { height: 54rpx; margin: 0; padding: 0 15rpx; border-radius: 16rpx; background: #f8ecea; color: #a64d48; font-size: 20rpx; line-height: 54rpx; }
.select-mark { padding-left: 14rpx; color: #176b4d; font-size: 30rpx; font-weight: 700; }
.empty-list { padding: 80rpx 20rpx; color: #8b978f; text-align: center; font-size: 24rpx; }
</style>

