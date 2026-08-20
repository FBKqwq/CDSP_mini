<script setup lang="ts">
withDefaults(
  defineProps<{
    icon?: string
    title: string
    description: string
    actionText?: string
    loading?: boolean
  }>(),
  { icon: '·', actionText: '', loading: false },
)

defineEmits<{ action: [] }>()
</script>

<template>
  <view class="state-block">
    <view class="state-icon" :class="{ spinning: loading }">{{ loading ? '◌' : icon }}</view>
    <text class="state-title">{{ title }}</text>
    <text class="state-description">{{ description }}</text>
    <button v-if="actionText" class="state-action" @tap="$emit('action')">{{ actionText }}</button>
  </view>
</template>

<style scoped>
.state-block {
  display: flex;
  min-height: 360rpx;
  align-items: center;
  justify-content: center;
  padding: 48rpx 36rpx;
  text-align: center;
  flex-direction: column;
}

.state-icon {
  display: flex;
  width: 88rpx;
  height: 88rpx;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
  border-radius: 28rpx;
  background: #e7eee7;
  color: #176b4d;
  font-size: 42rpx;
  font-weight: 700;
}

.state-title {
  color: #20332b;
  font-size: 30rpx;
  font-weight: 700;
}

.state-description {
  max-width: 500rpx;
  margin-top: 12rpx;
  color: #718078;
  font-size: 25rpx;
  line-height: 1.65;
}

.state-action {
  height: 72rpx;
  margin-top: 28rpx;
  padding: 0 36rpx;
  border-radius: 36rpx;
  background: #176b4d;
  color: #fff;
  font-size: 26rpx;
  line-height: 72rpx;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinning {
  animation: spin 1s linear infinite;
}
</style>

