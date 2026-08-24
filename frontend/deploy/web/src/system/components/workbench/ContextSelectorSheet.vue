<script setup lang="ts">
import { computed } from 'vue'
import { useHealthContextStore } from '@/stores/health-context'
import type { ConsultationExpert } from '@/types/domain'

const props = defineProps<{
  visible: boolean
  type: 'history' | 'expert'
  currentId: string
  experts: ConsultationExpert[]
}>()

defineEmits<{
  close: []
  select: [id: string]
}>()

const healthContextStore = useHealthContextStore()
const title = computed(() => (props.type === 'history' ? '关联历史疾病' : '选择问诊专家'))
</script>

<template>
  <view v-if="visible" class="sheet-layer" @tap.self="$emit('close')">
    <view class="sheet">
      <view class="sheet-handle" />
      <view class="sheet-header">
        <view>
          <text class="sheet-eyebrow">本次问诊</text>
          <text class="sheet-title">{{ title }}</text>
        </view>
        <button class="close-button" @tap="$emit('close')">×</button>
      </view>

      <scroll-view v-if="type === 'history'" class="option-list option-list-simple" scroll-y>
        <view
          v-if="healthContextStore.medicalHistories.length"
          class="option-card"
          :class="{ selected: !currentId }"
          @tap="$emit('select', '')"
        >
          <view class="option-symbol">新</view>
          <view class="option-copy">
            <text class="option-title">不关联历史疾病</text>
            <text class="option-description">作为本次新问题直接开始问诊</text>
          </view>
          <text class="select-mark">{{ !currentId ? '✓' : '›' }}</text>
        </view>
        <view
          v-for="history in healthContextStore.medicalHistories"
          :key="history.id"
          class="option-card"
          :class="{ selected: currentId === history.id }"
          @tap="$emit('select', history.id)"
        >
          <view class="option-symbol">方</view>
          <view class="option-copy">
            <view class="option-title-line">
              <text class="option-title">{{ history.name }}</text>
              <text v-if="currentId === history.id" class="selected-label">已关联</text>
            </view>
            <text class="option-description">{{ history.description || '暂无补充说明' }}{{ history.diagnosedAt ? ` · ${history.diagnosedAt}` : '' }}</text>
          </view>
          <text class="select-mark">{{ currentId === history.id ? '✓' : '›' }}</text>
        </view>
        <view v-if="!healthContextStore.medicalHistories.length" class="empty-list">
          <text class="empty-title">暂无历史疾病</text>
          <text class="empty-description">历史疾病不是问诊必填项，关闭后仍可选择专家并开始问诊。</text>
        </view>
      </scroll-view>

      <scroll-view v-else class="option-list option-list-simple" scroll-y>
        <view
          v-for="expert in experts"
          :key="expert.id"
          class="option-card"
          :class="{ selected: currentId === expert.id, disabled: !expert.enabled }"
          @tap="expert.enabled && $emit('select', expert.id)"
        >
          <view class="doctor-avatar">{{ expert.name.slice(0, 1) }}</view>
          <view class="option-copy">
            <view class="option-title-line">
              <text class="option-title">{{ expert.name }}</text>
              <text class="doctor-title">{{ expert.title }}</text>
              <text v-if="currentId === expert.id" class="selected-label">已选择</text>
            </view>
            <text class="option-description">{{ expert.enabled ? expert.specialty : expert.unavailableReason }}</text>
          </view>
          <text class="select-mark">{{ !expert.enabled ? '锁' : currentId === expert.id ? '✓' : '›' }}</text>
        </view>
        <view v-if="!experts.length" class="empty-list">
          <text class="empty-title">暂无可选问诊专家</text>
          <text class="empty-description">请稍后重试或联系平台客服。</text>
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

.option-list { max-height: 55vh; }
.option-list-simple { max-height: 62vh; }
.option-card { display: flex; min-height: 104rpx; align-items: center; margin-bottom: 14rpx; padding: 18rpx 18rpx; border: 1rpx solid #e2e7e1; border-radius: 24rpx; background: #fff; }
.option-card.selected { border-color: rgba(23, 107, 77, 0.42); background: #f0f8f2; box-shadow: inset 6rpx 0 #176b4d; }
.option-card.disabled { opacity: 0.52; }
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
.select-mark { padding-left: 14rpx; color: #176b4d; font-size: 30rpx; font-weight: 700; }
.empty-list { padding: 80rpx 28rpx; color: #8b978f; text-align: center; }
.empty-title,
.empty-description { display: block; }
.empty-title { color: #52665c; font-size: 27rpx; font-weight: 700; }
.empty-description { margin-top: 12rpx; font-size: 22rpx; line-height: 1.7; }
</style>
