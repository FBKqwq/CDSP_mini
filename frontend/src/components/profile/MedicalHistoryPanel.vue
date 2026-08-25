<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useHealthContextStore } from '@/stores/health-context'
import type { MedicalHistory } from '@/types/domain'


const healthStore = useHealthContextStore()

const editingId = ref<string | null>(null)
const showForm = ref(false)


const form = reactive({
  name: '',
  description: '',
  diagnosedAt: '',
  lockVersion: 0,
})


function resetForm(): void {
  form.name = ''
  form.description = ''
  form.diagnosedAt = ''
  form.lockVersion = 0

  editingId.value = null
  showForm.value = false
}


function startCreate(): void {
  resetForm()
  showForm.value = true
}


function startEdit(
  history: MedicalHistory,
): void {
  editingId.value = history.id

  form.name = history.name
  form.description = history.description ?? ''
  form.diagnosedAt = history.diagnosedAt ?? ''
  form.lockVersion = history.lockVersion

  showForm.value = true
}


async function save(): Promise<void> {
  const name = form.name.trim()

  if (!name) {
    uni.showToast({
      title: '请输入疾病名称',
      icon: 'none',
    })
    return
  }


  const payload = {
    name,
    description: form.description.trim() || undefined,
    diagnosedAt: form.diagnosedAt || undefined,
    lockVersion: form.lockVersion,
  }


  let success = false


  if (editingId.value) {
    success =
      await healthStore.updateMedicalHistory(
        editingId.value,
        payload,
      )
  } else {
    success =
      await healthStore.createMedicalHistory(
        {
          name,
          description: payload.description,
          diagnosedAt: payload.diagnosedAt,
        },
      )
  }


  if (!success) {
    uni.showToast({
      title: healthStore.errorMessage || '保存失败',
      icon: 'none',
    })

    return
  }


  resetForm()

  uni.showToast({
    title: '保存成功',
    icon: 'success',
  })
}


function removeHistory(
  history: MedicalHistory,
): void {
  uni.showModal({
    title: '删除历史疾病',
    content: `确认删除「${history.name}」吗？`,
    confirmColor: '#B64B46',
    success: async (result) => {
      if (!result.confirm) {
        return
      }

      const success =
        await healthStore.deleteMedicalHistory(
          history.id,
        )

      if (!success) {
        uni.showToast({
          title: healthStore.errorMessage || '删除失败',
          icon: 'none',
        })

        return
      }

      uni.showToast({
        title: '已删除',
        icon: 'success',
      })
    },
  })
}
</script>


<template>
  <view class="history-panel">

    <view class="history-header">
      <text class="history-title">
        历史疾病
      </text>

      <button
        class="add-button"
        @tap="startCreate"
      >
        新增
      </button>
    </view>


    <view
      v-if="!healthStore.medicalHistories.length"
      class="empty"
    >
      <text>
        暂无历史疾病
      </text>
    </view>


    <view
      v-for="history in healthStore.medicalHistories"
      :key="history.id"
      class="history-card"
    >

      <view class="history-main">
        <text class="history-name">
          {{ history.name }}
        </text>

        <text class="history-meta">
          {{
            history.diagnosedAt
              ? `确诊日期：${history.diagnosedAt}`
              : '未填写确诊日期'
          }}
        </text>

        <text
          v-if="history.description"
          class="history-description"
        >
          {{ history.description }}
        </text>
      </view>


      <view class="actions">
        <button
          class="edit-button"
          @tap="startEdit(history)"
        >
          编辑
        </button>

        <button
          class="delete-button"
          @tap="removeHistory(history)"
        >
          删除
        </button>
      </view>

    </view>


    <view
      v-if="showForm"
      class="form-card"
    >

      <text class="form-title">
        {{ editingId ? '编辑疾病' : '新增疾病' }}
      </text>


      <input
        v-model="form.name"
        class="input"
        placeholder="疾病名称"
      />


      <input
        v-model="form.description"
        class="input"
        placeholder="病史说明"
      />


      <input
        v-model="form.diagnosedAt"
        class="input"
        placeholder="确诊日期 YYYY-MM-DD"
      />


      <view class="form-actions">

        <button
          class="cancel"
          @tap="resetForm"
        >
          取消
        </button>


        <button
          class="save"
          :loading="healthStore.mutating"
          @tap="save"
        >
          保存
        </button>

      </view>

    </view>

  </view>
</template>


<style scoped>
.history-panel {
  margin-top: 20rpx;
}


.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}


.history-title {
  color: #2b4035;
  font-size: 28rpx;
  font-weight: 700;
}


.add-button {
  height: 54rpx;
  margin: 0;
  padding: 0 22rpx;
  border-radius: 16rpx;
  background: #176b4d;
  color: #fff;
  font-size: 20rpx;
  line-height: 54rpx;
}


.empty {
  margin-top: 20rpx;
  padding: 40rpx;
  border-radius: 20rpx;
  background: #f6f8f5;
  color: #89968e;
  text-align: center;
}


.history-card,
.form-card {
  margin-top: 16rpx;
  padding: 20rpx;
  border-radius: 22rpx;
  background: #fff;
  border: 1rpx solid #dde5dd;
}


.history-name {
  display: block;
  color: #263d32;
  font-size: 26rpx;
  font-weight: 700;
}


.history-meta,
.history-description {
  display: block;
  margin-top: 8rpx;
  color: #78877f;
  font-size: 21rpx;
}


.actions {
  display: flex;
  margin-top: 14rpx;
  gap: 12rpx;
}


.edit-button,
.delete-button {
  height: 48rpx;
  margin: 0;
  padding: 0 18rpx;
  border-radius: 14rpx;
  font-size: 18rpx;
  line-height: 48rpx;
}


.edit-button {
  background: #eaf3ec;
  color: #176b4d;
}


.delete-button {
  background: #faeeee;
  color: #a04e49;
}


.form-title {
  display: block;
  margin-bottom: 16rpx;
  color: #2b4035;
  font-size: 24rpx;
  font-weight: 700;
}


.input {
  height: 64rpx;
  margin-top: 12rpx;
  padding: 0 14rpx;
  border-radius: 14rpx;
  background: #f8faf8;
  border: 1rpx solid #dde4de;
  font-size: 20rpx;
}


.form-actions {
  display: flex;
  margin-top: 18rpx;
  gap: 14rpx;
}


.cancel,
.save {
  flex: 1;
  height: 56rpx;
  border-radius: 16rpx;
  font-size: 20rpx;
  line-height: 56rpx;
}


.cancel {
  background: #f3f5f3;
  color: #68766e;
}


.save {
  background: #176b4d;
  color: #fff;
}
</style>