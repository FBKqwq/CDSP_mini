<script setup lang="ts">
import { computed } from 'vue'
import StateBlock from '@/components/common/StateBlock.vue'
import SyndromeRadar from '@/components/diagnosis/SyndromeRadar.vue'
import { useConsultationStore } from '@/stores/consultation'
import type { DiagnosisStage } from '@/types/domain'

const store = useConsultationStore()

const stages: Array<{ key: DiagnosisStage; label: string; short: string }> = [
  { key: 'consultation', label: '问诊', short: '问' },
  { key: 'preliminary', label: '初步诊断', short: '初' },
  { key: 'collaboration', label: '专家协作', short: '协' },
  { key: 'comprehensive', label: '综合诊断', short: '综' },
]

const currentIndex = computed(() => stages.findIndex((stage) => stage.key === store.context.stage))

function stageStatus(index: number): 'done' | 'active' | 'pending' {
  if (store.diagnosis?.stage === 'comprehensive') return 'done'
  if (index < currentIndex.value) return 'done'
  if (index === currentIndex.value) return 'active'
  return 'pending'
}
</script>

<template>
  <view class="diagnosis-panel">
    <view class="stage-card">
      <view class="section-head">
        <view>
          <text class="section-eyebrow">DIAGNOSIS JOURNEY</text>
          <text class="section-title">四阶段诊疗进度</text>
        </view>
        <text class="stage-source">服务端状态</text>
      </view>
      <view class="stage-flow">
        <template v-for="(stage, index) in stages" :key="stage.key">
          <view class="stage-node" :class="stageStatus(index)">
            <view class="stage-circle">{{ stageStatus(index) === 'done' ? '✓' : stage.short }}</view>
            <text class="stage-label">{{ stage.label }}</text>
          </view>
          <view v-if="index < stages.length - 1" class="stage-line" :class="{ filled: index < currentIndex || store.diagnosis?.stage === 'comprehensive' }" />
        </template>
      </view>
    </view>

    <StateBlock
      v-if="!store.diagnosis"
      icon="诊"
      title="诊断数据尚未生成"
      description="完成必要问诊并确认进入诊断后，这里将显示四阶段进度、证候匹配和诊断结论。"
      action-text="返回问诊"
      @action="store.activeTab = 'consultation'"
    />

    <template v-else>
      <view class="diagnosis-hero">
        <view class="hero-accent" />
        <text class="diagnosis-label">综合辨证结论</text>
        <text class="diagnosis-name">{{ store.diagnosis.primaryDiagnosis }}</text>
        <view class="syndrome-line">
          <text class="syndrome-badge">证</text>
          <view>
            <text class="syndrome-caption">当前证候</text>
            <text class="syndrome-name">{{ store.diagnosis.syndrome }}</text>
          </view>
        </view>
        <text class="updated-at">更新于 {{ store.diagnosis.updatedAt }}</text>
      </view>

      <view class="content-card">
        <view class="section-head compact">
          <view>
            <text class="section-eyebrow">SYNDROME MATCHING</text>
            <text class="section-title">证候匹配</text>
          </view>
          <view class="legend"><text class="legend-dot" />匹配度</view>
        </view>
        <SyndromeRadar :scores="store.diagnosis.syndromeScores" />
      </view>

      <view class="content-card">
        <view class="section-head compact">
          <view>
            <text class="section-eyebrow">CLINICAL EVIDENCE</text>
            <text class="section-title">辨证依据</text>
          </view>
        </view>
        <view v-for="(evidence, index) in store.diagnosis.evidence" :key="evidence" class="evidence-row">
          <text class="evidence-index">{{ String(index + 1).padStart(2, '0') }}</text>
          <text class="evidence-text">{{ evidence }}</text>
        </view>
      </view>

      <view class="advice-card">
        <text class="advice-label">诊疗建议</text>
        <text class="advice-text">{{ store.diagnosis.advice }}</text>
        <text class="advice-note">结论来自服务端诊疗记录，客户端未推导或补全医疗内容。</text>
      </view>
    </template>
  </view>
</template>

<style scoped>
.diagnosis-panel { padding-top: 10rpx; }
.stage-card,
.content-card { margin-bottom: 20rpx; padding: 26rpx; border: 1rpx solid rgba(29, 99, 72, 0.09); border-radius: 28rpx; background: #fff; box-shadow: 0 10rpx 32rpx rgba(40, 70, 55, 0.05); }
.section-head { display: flex; align-items: flex-start; justify-content: space-between; }
.section-head.compact { margin-bottom: 16rpx; }
.section-eyebrow,
.section-title { display: block; }
.section-eyebrow { color: #9b7c46; font-size: 17rpx; letter-spacing: 3rpx; }
.section-title { margin-top: 6rpx; color: #263b31; font-size: 30rpx; font-weight: 750; }
.stage-source { padding: 6rpx 12rpx; border-radius: 14rpx; background: #edf3ee; color: #7b8a81; font-size: 18rpx; }
.stage-flow { display: flex; align-items: flex-start; margin-top: 30rpx; }
.stage-node { display: flex; width: 84rpx; align-items: center; flex: 0 0 auto; flex-direction: column; }
.stage-circle { display: flex; width: 56rpx; height: 56rpx; align-items: center; justify-content: center; border: 2rpx solid #d9e0da; border-radius: 50%; background: #f6f7f5; color: #9ba59f; font-size: 22rpx; font-weight: 700; }
.stage-node.active .stage-circle { border-color: #b7893e; background: #fff5e3; box-shadow: 0 0 0 8rpx rgba(183, 137, 62, 0.08); color: #95691f; }
.stage-node.done .stage-circle { border-color: #176b4d; background: #176b4d; color: #fff; }
.stage-label { margin-top: 10rpx; color: #7f8b84; font-size: 19rpx; text-align: center; white-space: nowrap; }
.stage-node.active .stage-label,
.stage-node.done .stage-label { color: #405449; font-weight: 650; }
.stage-line { height: 3rpx; flex: 1; margin-top: 27rpx; background: #dde3de; }
.stage-line.filled { background: #3a8768; }

.diagnosis-hero { position: relative; overflow: hidden; margin-bottom: 20rpx; padding: 32rpx; border-radius: 30rpx; background: linear-gradient(145deg, #1a654b, #244f3e); box-shadow: 0 16rpx 40rpx rgba(23, 86, 63, 0.2); color: #fff; }
.hero-accent { position: absolute; top: -56rpx; right: -44rpx; width: 210rpx; height: 210rpx; border: 1rpx solid rgba(255, 255, 255, 0.11); border-radius: 50%; box-shadow: 0 0 0 34rpx rgba(255, 255, 255, 0.04); }
.diagnosis-label { display: block; color: rgba(255, 255, 255, 0.62); font-size: 20rpx; letter-spacing: 5rpx; }
.diagnosis-name { display: block; margin-top: 13rpx; font-family: 'STKaiti', 'KaiTi', serif; font-size: 38rpx; font-weight: 700; }
.syndrome-line { display: flex; align-items: center; margin-top: 30rpx; }
.syndrome-badge { display: flex; width: 58rpx; height: 58rpx; align-items: center; justify-content: center; margin-right: 15rpx; border: 1rpx solid rgba(255, 255, 255, 0.26); border-radius: 18rpx; background: rgba(255, 255, 255, 0.1); font-family: serif; font-size: 27rpx; }
.syndrome-caption,
.syndrome-name { display: block; }
.syndrome-caption { color: rgba(255, 255, 255, 0.55); font-size: 18rpx; }
.syndrome-name { margin-top: 3rpx; font-size: 26rpx; font-weight: 700; }
.updated-at { display: block; margin-top: 26rpx; color: rgba(255, 255, 255, 0.48); font-size: 18rpx; }
.legend { display: flex; align-items: center; color: #89958e; font-size: 18rpx; }
.legend-dot { width: 12rpx; height: 12rpx; margin-right: 7rpx; border-radius: 50%; background: #176b4d; }
.evidence-row { display: flex; align-items: flex-start; padding: 20rpx 0; border-top: 1rpx solid #edf0ed; }
.evidence-row:first-of-type { border-top: 0; }
.evidence-index { flex: 0 0 auto; margin-right: 20rpx; color: #b18745; font-family: serif; font-size: 21rpx; font-weight: 700; }
.evidence-text { color: #4a5c52; font-size: 24rpx; line-height: 1.65; }
.advice-card { margin-bottom: 20rpx; padding: 27rpx; border: 1rpx solid #eadfc9; border-radius: 28rpx; background: linear-gradient(145deg, #fffaf0, #f7f3e9); }
.advice-label,
.advice-text,
.advice-note { display: block; }
.advice-label { color: #856126; font-size: 22rpx; font-weight: 700; }
.advice-text { margin-top: 12rpx; color: #5c513f; font-size: 24rpx; line-height: 1.72; }
.advice-note { margin-top: 18rpx; padding-top: 15rpx; border-top: 1rpx dashed #ded0b7; color: #a1937a; font-size: 18rpx; }
</style>

