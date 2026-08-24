<script setup lang="ts">
import StateBlock from '@/components/common/StateBlock.vue'
import { useConsultationStore } from '@/stores/consultation'

const store = useConsultationStore()
</script>

<template>
  <view class="report-panel">
    <view class="section-head">
      <view>
        <text class="section-title">历史诊疗报告</text>
      </view>
      <button class="refresh-button" @tap="store.restoreContext">↻ 刷新</button>
    </view>

    <StateBlock
      v-if="!store.reports.length"
      icon="卷"
      title="暂无诊疗报告"
      description="完成问诊和诊疗后，历史报告摘要会显示在这里。"
      action-text="刷新报告"
      @action="store.restoreContext"
    />

    <view v-else class="report-list">
      <view v-for="report in store.reports" :key="report.id" class="report-card">
        <view class="report-date-block">
          <text class="report-month">{{ report.createdAt.slice(5, 7) }}月</text>
          <text class="report-day">{{ report.createdAt.slice(8, 10) }}</text>
        </view>
        <view class="report-copy">
          <view class="report-title-line">
            <text class="report-disease">{{ report.diseaseName }}</text>
            <text class="report-status">{{ report.status === 'completed' ? '已完成' : '草稿' }}</text>
          </view>
          <text class="report-diagnosis">{{ report.diagnosis.primaryDiagnosis }}</text>
          <text class="report-syndrome">{{ report.diagnosis.syndrome }}</text>
          <view class="report-prescription">
            <text class="prescription-label">处方</text>
            <text>{{ report.prescription?.name || '本次无处方记录' }}</text>
          </view>
        </view>
      </view>
    </view>

    <text class="report-note">当前仅展示只读摘要，详情浮窗与报告对比暂未开放。</text>
  </view>
</template>

<style scoped>
.report-panel { margin-top: 16rpx; }
.section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 11rpx; }
.section-eyebrow,
.section-title { display: block; }
.section-eyebrow { color: #9b7c46; font-size: 17rpx; letter-spacing: 3rpx; }
.section-title { color: #263b31; font-size: 25rpx; font-weight: 750; }
.refresh-button { height: 44rpx; margin: 0; padding: 0 13rpx; border: 1rpx solid #dce3dd; border-radius: 13rpx; background: #fff; color: #5d7166; font-size: 17rpx; line-height: 42rpx; }
.report-list { display: grid; grid-template-columns: 1fr; gap: 10rpx; }
.report-card { display: flex; min-width: 0; padding: 14rpx; border: 1rpx solid #e0e5e0; border-radius: 18rpx; background: #fff; box-shadow: 0 5rpx 15rpx rgba(40, 65, 52, 0.035); }
.report-date-block { display: flex; width: 54rpx; height: 60rpx; align-items: center; justify-content: center; flex: 0 0 auto; border-radius: 15rpx; background: #edf5ef; color: #176b4d; flex-direction: column; }
.report-month,
.report-day { display: block; }
.report-month { font-size: 17rpx; }
.report-day { margin-top: 1rpx; font-family: serif; font-size: 23rpx; font-weight: 700; }
.report-copy { min-width: 0; flex: 1; margin-left: 12rpx; }
.report-title-line { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.report-disease { overflow: hidden; color: #2b4035; font-size: 21rpx; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.report-status { flex: 0 0 auto; color: #2f825e; font-size: 18rpx; }
.report-diagnosis,
.report-syndrome { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.report-diagnosis { margin-top: 5rpx; color: #56685e; font-size: 19rpx; }
.report-syndrome { margin-top: 2rpx; color: #9a7640; font-size: 17rpx; }
.report-prescription { display: flex; align-items: center; margin-top: 7rpx; color: #7d877f; font-size: 17rpx; }
.prescription-label { margin-right: 9rpx; padding: 3rpx 9rpx; border-radius: 10rpx; background: #f3ead9; color: #946b2a; font-size: 17rpx; }
.report-note { display: block; margin-top: 9rpx; color: #9aa39d; font-size: 16rpx; line-height: 1.45; text-align: center; }
</style>
