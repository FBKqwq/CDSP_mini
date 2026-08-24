<script setup lang="ts">
import { computed } from 'vue'
import StateBlock from '@/components/common/StateBlock.vue'
import EvidenceGraph from '@/components/diagnosis/EvidenceGraph.vue'
import SyndromeRadar from '@/components/diagnosis/SyndromeRadar.vue'
import { useConsultationStore } from '@/stores/consultation'
import type { DiagnosisStage } from '@/types/domain'

const store = useConsultationStore()

const stages: Array<{ key: DiagnosisStage; label: string; short: string }> = [
  { key: 'consultation', label: '问诊', short: '问' },
  { key: 'preliminary', label: '专家协作', short: '协' },
  { key: 'collaboration', label: '专病辨证', short: '辨' },
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
      <text class="section-title">四阶段分析进度</text>
      <view class="stage-flow">
        <template v-for="(stage, index) in stages" :key="stage.key">
          <view class="stage-node" :class="stageStatus(index)">
            <view class="stage-circle">{{ stageStatus(index) === 'done' ? '✓' : stage.short }}</view>
            <text class="stage-label">{{ stage.label }}</text>
          </view>
          <view
            v-if="index < stages.length - 1"
            class="stage-line"
            :class="{ filled: index < currentIndex || store.diagnosis?.stage === 'comprehensive' }"
          />
        </template>
      </view>
    </view>

    <StateBlock
      v-if="!store.diagnosis"
      icon="诊"
      title="健康评估尚未生成"
      description="完成必要问诊并确认生成后，这里将显示分析进度、证候匹配和评估结论。"
      action-text="返回问诊"
      @action="store.activeTab = 'consultation'"
    />

    <template v-else>
      <view class="diagnosis-summary">
        <view class="summary-main">
          <text class="summary-caption">综合辨证结论</text>
          <text class="summary-value">{{ store.diagnosis.primaryDiagnosis }}</text>
        </view>
        <view class="summary-syndrome">
          <text class="syndrome-badge">证</text>
          <view class="syndrome-copy">
            <text class="summary-caption">当前证候</text>
            <text class="syndrome-value">{{ store.diagnosis.syndrome }}</text>
          </view>
        </view>
        <text class="updated-at">{{ store.diagnosis.updatedAt }}</text>
      </view>

      <view class="diagnosis-detail-grid">
        <view class="content-card detail-grid-card">
          <view class="card-title-row">
            <text class="section-title">证候匹配</text>
            <text class="card-hint">评分 / 100</text>
          </view>
          <view class="visual-host">
            <SyndromeRadar
              class="visual-component"
              :scores="store.diagnosis.syndromeScores"
              :visible="store.activeTab === 'diagnosis'"
            />
          </view>
        </view>

        <view class="content-card detail-grid-card">
          <view class="card-title-row">
            <text class="section-title">辨证依据</text>
            <text class="card-hint">动态关联</text>
          </view>
          <view class="visual-host">
            <EvidenceGraph
              class="visual-component"
              :syndrome="store.diagnosis.syndrome"
              :evidence="store.diagnosis.evidence"
            />
          </view>
        </view>
      </view>

      <view class="prescription-card">
        <view class="prescription-head">
          <view class="prescription-title-line">
            <view class="prescription-icon">方</view>
            <text class="section-title">本次处方</text>
          </view>
          <text class="prescription-state">诊疗结果</text>
        </view>
        <view v-if="store.currentPrescription" class="prescription-body">
          <text class="prescription-name">{{ store.currentPrescription.name }}</text>
          <view class="medicine-head"><text>药物</text><text>剂量</text><text>用法</text></view>
          <view
            v-for="item in store.currentPrescription.items"
            :key="`${item.medicine}-${item.dosage}`"
            class="medicine-row"
          >
            <text class="medicine-name">{{ item.medicine }}</text>
            <text class="medicine-dose">{{ item.dosage }}</text>
            <text class="medicine-usage">{{ item.usage }}</text>
          </view>
          <view class="instructions">
            <text class="instructions-label">用药说明</text>
            <text>{{ store.currentPrescription.instructions }}</text>
          </view>
          <view v-if="store.currentPrescription.cautions" class="cautions">{{ store.currentPrescription.cautions }}</view>
        </view>
        <view v-else class="prescription-empty">
          <text class="empty-mark">方</text>
          <view>
            <text class="empty-title">本次暂未生成处方</text>
            <text class="empty-description">处方以本次诊疗结果为准，不使用历史报告替代。</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.diagnosis-panel {
  padding-top: 6rpx;
}

.stage-card,
.content-card {
  margin-bottom: 14rpx;
  padding: 18rpx;
  border: 1rpx solid rgba(29, 99, 72, 0.09);
  border-radius: 20rpx;
  background: #fff;
  box-shadow: 0 6rpx 20rpx rgba(40, 70, 55, 0.045);
}

.section-title {
  color: #263b31;
  font-size: 25rpx;
  font-weight: 750;
}

.stage-flow {
  display: flex;
  align-items: flex-start;
  margin-top: 16rpx;
}

.stage-node {
  display: flex;
  width: 82rpx;
  align-items: center;
  flex: 0 0 auto;
  flex-direction: column;
}

.stage-circle {
  display: flex;
  width: 42rpx;
  height: 42rpx;
  align-items: center;
  justify-content: center;
  border: 2rpx solid #d9e0da;
  border-radius: 50%;
  background: #f6f7f5;
  color: #9ba59f;
  font-size: 18rpx;
  font-weight: 700;
}

.stage-node.active .stage-circle {
  border-color: #b7893e;
  background: #fff5e3;
  color: #95691f;
}

.stage-node.done .stage-circle {
  border-color: #176b4d;
  background: #176b4d;
  color: #fff;
}

.stage-label {
  margin-top: 6rpx;
  color: #7f8b84;
  font-size: 17rpx;
  text-align: center;
  white-space: nowrap;
}

.stage-node.active .stage-label,
.stage-node.done .stage-label {
  color: #405449;
  font-weight: 650;
}

.stage-line {
  height: 2rpx;
  flex: 1;
  margin-top: 21rpx;
  background: #dde3de;
}

.stage-line.filled {
  background: #3a8768;
}

.diagnosis-summary {
  display: grid;
  margin-bottom: 14rpx;
  padding: 18rpx 20rpx;
  align-items: center;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #1b654b, #24523f);
  box-shadow: 0 9rpx 24rpx rgba(23, 86, 63, 0.14);
  color: #fff;
  gap: 7rpx 16rpx;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr);
}

.summary-main,
.syndrome-copy {
  min-width: 0;
}

.summary-syndrome {
  display: flex;
  min-width: 0;
  align-items: center;
  padding-left: 16rpx;
  border-left: 1rpx solid rgba(255, 255, 255, 0.18);
}

.summary-caption,
.summary-value,
.syndrome-value {
  display: block;
}

.summary-caption {
  color: rgba(255, 255, 255, 0.62);
  font-size: 17rpx;
}

.summary-value {
  overflow: hidden;
  margin-top: 4rpx;
  font-size: 27rpx;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.syndrome-badge {
  display: flex;
  width: 39rpx;
  height: 39rpx;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  margin-right: 9rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.25);
  border-radius: 11rpx;
  background: rgba(255, 255, 255, 0.1);
  font-size: 20rpx;
}

.syndrome-value {
  overflow: hidden;
  margin-top: 3rpx;
  font-size: 21rpx;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.updated-at {
  color: rgba(255, 255, 255, 0.48);
  font-size: 16rpx;
  grid-column: 1 / -1;
}

.diagnosis-detail-grid {
  display: grid;
  margin-bottom: 14rpx;
  gap: 14rpx;
  grid-template-columns: 1fr;
}

.detail-grid-card {
  display: flex;
  min-width: 0;
  box-sizing: border-box;
  margin-bottom: 0;
  aspect-ratio: 1 / 1;
  flex-direction: column;
}

.card-title-row {
  display: flex;
  min-height: 34rpx;
  align-items: center;
  justify-content: space-between;
}

.card-hint {
  color: #8b978f;
  font-size: 16rpx;
}

.visual-host {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex: 1;
}

.visual-component {
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  flex: 1;
}

.prescription-card {
  overflow: hidden;
  margin-bottom: 14rpx;
  border: 1rpx solid #e8dec8;
  border-radius: 20rpx;
  background: #fffdf8;
  box-shadow: 0 6rpx 20rpx rgba(40, 65, 52, 0.04);
}

.prescription-head {
  display: flex;
  padding: 15rpx 18rpx;
  align-items: center;
  justify-content: space-between;
}

.prescription-title-line {
  display: flex;
  align-items: center;
}

.prescription-icon,
.empty-mark {
  display: flex;
  width: 40rpx;
  height: 40rpx;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  margin-right: 10rpx;
  border-radius: 12rpx;
  background: #f2e8d4;
  color: #94671e;
  font-family: serif;
  font-size: 19rpx;
}

.prescription-state {
  padding: 4rpx 9rpx;
  border-radius: 11rpx;
  background: #f4efe5;
  color: #947344;
  font-size: 16rpx;
}

.prescription-body {
  padding: 0 18rpx 18rpx;
}

.prescription-name {
  display: block;
  margin-bottom: 9rpx;
  color: #594a34;
  font-size: 23rpx;
  font-weight: 700;
}

.medicine-head,
.medicine-row {
  display: grid;
  padding: 8rpx 10rpx;
  gap: 9rpx;
  grid-template-columns: 1.2fr .7fr 1fr;
}

.medicine-head {
  border-radius: 10rpx;
  background: #f4efe5;
  color: #99886c;
  font-size: 16rpx;
}

.medicine-row {
  border-bottom: 1rpx solid #eee8dc;
  color: #4e584f;
  font-size: 19rpx;
}

.medicine-name {
  color: #3b4e43;
  font-weight: 650;
}

.medicine-dose {
  color: #976b25;
  font-weight: 700;
}

.medicine-usage {
  color: #758078;
}

.instructions {
  display: flex;
  margin-top: 11rpx;
  color: #685f50;
  font-size: 18rpx;
  line-height: 1.5;
}

.instructions-label {
  flex: 0 0 auto;
  margin-right: 10rpx;
  color: #8e692d;
  font-weight: 700;
}

.cautions {
  margin-top: 10rpx;
  padding: 10rpx 12rpx;
  border-radius: 11rpx;
  background: #f8eee5;
  color: #906646;
  font-size: 17rpx;
  line-height: 1.45;
}

.prescription-empty {
  display: flex;
  padding: 0 18rpx 18rpx;
  align-items: center;
  color: #8a918b;
}

.empty-title,
.empty-description {
  display: block;
}

.empty-title {
  color: #5c615d;
  font-size: 20rpx;
  font-weight: 700;
}

.empty-description {
  margin-top: 3rpx;
  font-size: 17rpx;
  line-height: 1.45;
}

@media (min-width: 360px) {
  .diagnosis-detail-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}
</style>
