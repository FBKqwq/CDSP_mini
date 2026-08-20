<script setup lang="ts">
defineProps<{
  patientName: string
  patientCode: string
  diseaseName: string
  doctorName: string
  stageName: string
}>()

defineEmits<{
  select: [type: 'patient' | 'disease' | 'doctor']
}>()
</script>

<template>
  <view class="context-card">
    <view class="context-primary" @tap="$emit('select', 'patient')">
      <view class="avatar">{{ patientName ? patientName.slice(0, 1) : '患' }}</view>
      <view class="patient-copy">
        <view class="patient-line">
          <text class="patient-name">{{ patientName || '选择患者' }}</text>
          <text class="stage-pill">{{ stageName }}</text>
        </view>
        <text class="patient-code">{{ patientCode || '患者信息尚未选择' }}</text>
      </view>
      <text class="chevron">›</text>
    </view>

    <view class="context-divider" />

    <view class="context-grid">
      <view class="context-item" @tap="$emit('select', 'disease')">
        <text class="item-label">疾病分组</text>
        <view class="item-value-line">
          <text class="item-dot disease-dot" />
          <text class="item-value">{{ diseaseName || '请选择' }}</text>
          <text class="mini-chevron">⌄</text>
        </view>
      </view>
      <view class="context-item context-item-last" @tap="$emit('select', 'doctor')">
        <text class="item-label">协作专家</text>
        <view class="item-value-line">
          <text class="item-dot doctor-dot" />
          <text class="item-value">{{ doctorName || '请选择' }}</text>
          <text class="mini-chevron">⌄</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.context-card {
  overflow: hidden;
  border: 1rpx solid rgba(25, 93, 69, 0.1);
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 14rpx 40rpx rgba(40, 70, 55, 0.07);
}

.context-primary {
  display: flex;
  min-height: 112rpx;
  align-items: center;
  padding: 22rpx 24rpx;
}

.avatar {
  display: flex;
  width: 70rpx;
  height: 70rpx;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 24rpx;
  background: linear-gradient(145deg, #176b4d, #2d8b62);
  box-shadow: 0 8rpx 20rpx rgba(23, 107, 77, 0.2);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
}

.patient-copy {
  min-width: 0;
  flex: 1;
  margin-left: 18rpx;
}

.patient-line {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.patient-name {
  overflow: hidden;
  color: #20332b;
  font-size: 31rpx;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stage-pill {
  padding: 5rpx 14rpx;
  border-radius: 20rpx;
  background: #eaf5ed;
  color: #287452;
  font-size: 20rpx;
}

.patient-code {
  display: block;
  margin-top: 6rpx;
  color: #8b978f;
  font-size: 22rpx;
}

.chevron {
  color: #a1aca5;
  font-size: 46rpx;
  font-weight: 300;
}

.context-divider {
  height: 1rpx;
  margin: 0 24rpx;
  background: #edf0eb;
}

.context-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 18rpx 0;
}

.context-item {
  min-width: 0;
  padding: 0 24rpx;
  border-right: 1rpx solid #edf0eb;
}

.context-item-last {
  border-right: 0;
}

.item-label {
  display: block;
  margin-bottom: 7rpx;
  color: #929e96;
  font-size: 20rpx;
}

.item-value-line {
  display: flex;
  align-items: center;
  gap: 9rpx;
}

.item-dot {
  width: 12rpx;
  height: 12rpx;
  flex: 0 0 auto;
  border-radius: 50%;
}

.disease-dot { background: #c69235; }
.doctor-dot { background: #3b7fa2; }

.item-value {
  overflow: hidden;
  flex: 1;
  color: #33483e;
  font-size: 25rpx;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-chevron {
  color: #a1aca5;
  font-size: 22rpx;
}
</style>

