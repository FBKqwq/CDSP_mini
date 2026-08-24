<script setup lang="ts">
defineProps<{
  patientName: string
  historyName: string
  expertName: string
  stageName: string
}>()

defineEmits<{
  select: [type: 'history' | 'expert']
}>()
</script>

<template>
  <view class="context-header">
    <view class="context-left-column">
      <view class="patient-card">
        <view class="avatar">{{ patientName ? patientName.slice(0, 1) : '患' }}</view>
        <view class="patient-copy">
          <view class="patient-line">
            <text class="patient-name">{{ patientName || '我的健康档案' }}</text>
            <text class="stage-pill">{{ stageName }}</text>
          </view>
        </view>
      </view>

      <view class="context-selector-card">
        <view class="context-grid">
          <view class="context-item" @tap="$emit('select', 'history')">
            <text class="item-label">历史疾病（可选）</text>
            <view class="item-value-line">
              <text class="item-dot disease-dot" />
              <text class="item-value">{{ historyName || '未关联' }}</text>
              <text class="mini-chevron">⌄</text>
            </view>
          </view>
          <view class="context-item context-item-last" @tap="$emit('select', 'expert')">
            <text class="item-label">问诊专家</text>
            <view class="item-value-line">
              <text class="item-dot doctor-dot" />
              <text class="item-value">{{ expertName || '请选择' }}</text>
              <text class="mini-chevron">⌄</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="model-placeholder">
      <text class="model-name">三维人体</text>
      <text class="model-state">规划中</text>
    </view>
  </view>
</template>

<style scoped>
.context-header {
  display: grid;
  min-height: 360rpx;
  grid-template-columns: minmax(0, 4fr) minmax(0, 6fr);
  gap: 10rpx;
}

.context-left-column {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 10rpx;
}

.patient-card,
.model-placeholder,
.context-selector-card {
  overflow: hidden;
  border: 1rpx solid rgba(25, 93, 69, 0.1);
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 7rpx 22rpx rgba(40, 70, 55, 0.055);
}

.patient-card {
  display: flex;
  min-height: 90rpx;
  align-items: center;
  padding: 13rpx 14rpx;
}

.avatar {
  display: flex;
  width: 52rpx;
  height: 52rpx;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 16rpx;
  background: linear-gradient(145deg, #176b4d, #2d8b62);
  box-shadow: 0 5rpx 13rpx rgba(23, 107, 77, 0.17);
  color: #fff;
  font-size: 23rpx;
  font-weight: 700;
}

.patient-copy {
  min-width: 0;
  flex: 1;
  margin-left: 11rpx;
}

.patient-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7rpx 10rpx;
}

.patient-name {
  overflow: hidden;
  color: #20332b;
  font-size: 24rpx;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stage-pill {
  padding: 3rpx 9rpx;
  border-radius: 20rpx;
  background: #eaf5ed;
  color: #287452;
  font-size: 17rpx;
}

.model-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  border-style: dashed;
  background: rgba(243, 246, 242, 0.94);
  flex-direction: column;
}

.model-name,
.model-state { display: block; }
.model-name { color: #64776d; font-size: 21rpx; font-weight: 700; }
.model-state { margin-top: 3rpx; color: #a0aaa4; font-size: 16rpx; }

.context-grid {
  display: grid;
  height: 100%;
  grid-template-columns: 1fr;
  grid-template-rows: repeat(2, minmax(0, 1fr));
}

.context-item {
  display: flex;
  min-width: 0;
  justify-content: center;
  padding: 10rpx 14rpx;
  border-bottom: 1rpx solid #edf0eb;
  flex-direction: column;
}

.context-selector-card { flex: 1; }

.context-item-last {
  border-bottom: 0;
}

.item-label {
  display: block;
  margin-bottom: 4rpx;
  color: #929e96;
  font-size: 17rpx;
}

.item-value-line {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.item-dot {
  width: 9rpx;
  height: 9rpx;
  flex: 0 0 auto;
  border-radius: 50%;
}

.disease-dot { background: #c69235; }
.doctor-dot { background: #3b7fa2; }

.item-value {
  overflow: hidden;
  flex: 1;
  color: #33483e;
  font-size: 21rpx;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-chevron {
  color: #a1aca5;
  font-size: 19rpx;
}
</style>
