<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SafeRichText from '@/components/common/SafeRichText.vue'
import StateBlock from '@/components/common/StateBlock.vue'
import { useConsultationStore } from '@/stores/consultation'

const store = useConsultationStore()
const selectedReportId = ref('')
const compareIds = ref<string[]>([])
const detailExpanded = ref(true)
const prescriptionExpanded = ref(true)

watch(
  () => store.reports.map((report) => report.id).join('|'),
  () => {
    if (!store.reports.some((report) => report.id === selectedReportId.value)) {
      selectedReportId.value = store.reports[0]?.id ?? ''
    }
  },
  { immediate: true },
)

const selectedReport = computed(() => store.reports.find((report) => report.id === selectedReportId.value))

function toggleCompare(id: string): void {
  if (compareIds.value.includes(id)) {
    compareIds.value = compareIds.value.filter((item) => item !== id)
    return
  }
  if (compareIds.value.length >= 2) compareIds.value.shift()
  compareIds.value.push(id)
}

async function compare(): Promise<void> {
  if (compareIds.value.length !== 2) {
    uni.showToast({ title: '请选择两份报告', icon: 'none' })
    return
  }
  await store.compareReports(compareIds.value[0], compareIds.value[1])
}
</script>

<template>
  <view class="report-panel">
    <StateBlock
      v-if="!store.reports.length"
      icon="卷"
      title="暂无诊断报告"
      description="当前患者还没有可访问的诊断报告。完成诊疗后可在此查看报告和只读处方。"
      action-text="刷新报告"
      @action="store.restoreContext"
    />

    <template v-else>
      <view class="report-head">
        <view>
          <text class="head-eyebrow">MEDICAL RECORDS</text>
          <text class="head-title">诊断报告</text>
        </view>
        <button class="refresh-button" @tap="store.restoreContext">↻ 刷新</button>
      </view>

      <scroll-view class="report-strip" scroll-x :show-scrollbar="false">
        <view class="report-strip-inner">
          <view
            v-for="(report, index) in store.reports"
            :key="report.id"
            class="report-ticket"
            :class="{ active: selectedReportId === report.id }"
            @tap="selectedReportId = report.id"
          >
            <view class="ticket-top">
              <text class="ticket-index">0{{ index + 1 }}</text>
              <view class="compare-check" :class="{ checked: compareIds.includes(report.id) }" @tap.stop="toggleCompare(report.id)">
                {{ compareIds.includes(report.id) ? '✓' : '' }}
              </view>
            </view>
            <text class="ticket-date">{{ report.createdAt.slice(0, 10) }}</text>
            <text class="ticket-disease">{{ report.diseaseName }}</text>
            <text class="ticket-status">{{ report.status === 'completed' ? '已完成' : '草稿' }}</text>
          </view>
        </view>
      </scroll-view>

      <button class="compare-button" :disabled="compareIds.length !== 2 || store.comparing" :loading="store.comparing" @tap="compare">
        对比所选报告 <text class="compare-count">{{ compareIds.length }}/2</text>
      </button>

      <view v-if="store.comparison" class="comparison-card">
        <view class="comparison-head">
          <view>
            <text class="comparison-eyebrow">REPORT COMPARISON</text>
            <text class="comparison-title">报告纵向对比</text>
          </view>
          <button class="close-comparison" @tap="store.comparison = null">×</button>
        </view>
        <view v-for="item in store.comparison.items" :key="item.key" class="comparison-item">
          <text class="comparison-label">{{ item.label }}</text>
          <view class="comparison-side side-a">
            <text class="side-badge">A</text>
            <text class="side-text">{{ item.reportA }}</text>
          </view>
          <view class="comparison-side side-b">
            <text class="side-badge">B</text>
            <text class="side-text">{{ item.reportB }}</text>
          </view>
          <text class="difference-summary">{{ item.summary }}</text>
        </view>
      </view>

      <template v-if="selectedReport">
        <view class="report-summary">
          <view class="summary-seal">诊</view>
          <view class="summary-copy">
            <text class="summary-label">主要诊断</text>
            <text class="summary-title">{{ selectedReport.diagnosis.primaryDiagnosis }}</text>
            <text class="summary-syndrome">{{ selectedReport.diagnosis.syndrome }}</text>
          </view>
          <text class="summary-date">{{ selectedReport.createdAt.slice(5, 10) }}</text>
        </view>

        <view class="detail-card">
          <view class="detail-head" @tap="detailExpanded = !detailExpanded">
            <view>
              <text class="detail-kicker">DIAGNOSIS DETAIL</text>
              <text class="detail-title">诊断详情</text>
            </view>
            <text class="detail-expand">{{ detailExpanded ? '收起 ⌃' : '展开 ⌄' }}</text>
          </view>
          <view v-if="detailExpanded" class="detail-content">
            <text class="subsection-title">辨证依据</text>
            <view v-for="item in selectedReport.diagnosis.evidence" :key="item" class="detail-bullet">
              <text class="bullet-dot">·</text>
              <text>{{ item }}</text>
            </view>
            <text class="subsection-title advice-title">诊疗建议</text>
            <SafeRichText :content="selectedReport.diagnosis.advice" />
          </view>
        </view>

        <view v-if="selectedReport.prescription" class="prescription-card">
          <view class="prescription-head" @tap="prescriptionExpanded = !prescriptionExpanded">
            <view class="prescription-title-line">
              <view class="prescription-icon">方</view>
              <view>
                <text class="detail-kicker gold">PRESCRIPTION</text>
                <text class="detail-title">{{ selectedReport.prescription.name }}</text>
              </view>
            </view>
            <text class="detail-expand">{{ prescriptionExpanded ? '收起 ⌃' : '展开 ⌄' }}</text>
          </view>
          <view v-if="prescriptionExpanded" class="prescription-body">
            <view class="medicine-head"><text>药物</text><text>剂量</text><text>用法</text></view>
            <view v-for="item in selectedReport.prescription.items" :key="`${item.medicine}-${item.dosage}`" class="medicine-row">
              <text class="medicine-name">{{ item.medicine }}</text>
              <text class="medicine-dose">{{ item.dosage }}</text>
              <text class="medicine-usage">{{ item.usage }}</text>
            </view>
            <view class="instructions"><text class="instructions-label">用药说明</text><text>{{ selectedReport.prescription.instructions }}</text></view>
            <view v-if="selectedReport.prescription.cautions" class="cautions">⚠ {{ selectedReport.prescription.cautions }}</view>
          </view>
        </view>
      </template>
    </template>
  </view>
</template>

<style scoped>
.report-panel { padding-top: 13rpx; }
.report-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20rpx; }
.head-eyebrow,
.head-title { display: block; }
.head-eyebrow { color: #9b7c46; font-size: 17rpx; letter-spacing: 4rpx; }
.head-title { margin-top: 5rpx; color: #23382e; font-size: 34rpx; font-weight: 750; }
.refresh-button { height: 54rpx; margin: 0; padding: 0 18rpx; border: 1rpx solid #dce3dd; border-radius: 18rpx; background: #fff; color: #5d7166; font-size: 20rpx; line-height: 52rpx; }
.report-strip { width: 100%; margin-bottom: 16rpx; white-space: nowrap; }
.report-strip-inner { display: inline-flex; padding: 1rpx 2rpx 8rpx; gap: 15rpx; }
.report-ticket { display: inline-flex; width: 238rpx; height: 190rpx; padding: 18rpx; border: 1rpx solid #e0e5e0; border-radius: 25rpx; background: #fff; flex-direction: column; box-shadow: 0 8rpx 22rpx rgba(40, 65, 52, 0.04); }
.report-ticket.active { border-color: #176b4d; background: linear-gradient(145deg, #eff7f1, #fff); box-shadow: inset 6rpx 0 #176b4d; }
.ticket-top { display: flex; align-items: center; justify-content: space-between; }
.ticket-index { color: #ac8a52; font-family: serif; font-size: 22rpx; font-weight: 700; }
.compare-check { display: flex; width: 34rpx; height: 34rpx; align-items: center; justify-content: center; border: 1rpx solid #bdc7c0; border-radius: 10rpx; background: #fff; color: #fff; font-size: 20rpx; }
.compare-check.checked { border-color: #176b4d; background: #176b4d; }
.ticket-date { display: block; margin-top: 15rpx; color: #31473b; font-size: 25rpx; font-weight: 700; }
.ticket-disease { display: block; overflow: hidden; margin-top: 5rpx; color: #79867e; font-size: 20rpx; text-overflow: ellipsis; }
.ticket-status { display: block; margin-top: auto; color: #2f825e; font-size: 19rpx; }
.compare-button { height: 72rpx; margin: 2rpx 0 20rpx; border: 1rpx solid #b9cfc1; border-radius: 22rpx; background: #edf6ef; color: #176b4d; font-size: 24rpx; font-weight: 700; line-height: 70rpx; }
.compare-button[disabled] { opacity: 0.52; }
.compare-count { margin-left: 8rpx; color: #8aa296; font-size: 20rpx; }
.comparison-card { margin-bottom: 20rpx; padding: 25rpx; border: 1rpx solid #d5e3d9; border-radius: 28rpx; background: #f8fbf8; }
.comparison-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14rpx; }
.comparison-eyebrow,
.comparison-title { display: block; }
.comparison-eyebrow { color: #8d744a; font-size: 16rpx; letter-spacing: 3rpx; }
.comparison-title { margin-top: 5rpx; color: #2e4438; font-size: 28rpx; font-weight: 700; }
.close-comparison { width: 50rpx; height: 50rpx; margin: 0; padding: 0; border-radius: 50%; background: #e8ede9; color: #77847c; font-size: 32rpx; line-height: 48rpx; }
.comparison-item { padding: 20rpx 0; border-top: 1rpx solid #e5ebe6; }
.comparison-label { display: block; margin-bottom: 12rpx; color: #263c31; font-size: 23rpx; font-weight: 700; }
.comparison-side { display: flex; align-items: flex-start; margin-top: 9rpx; padding: 13rpx 15rpx; border-radius: 17rpx; }
.side-a { background: #e9f3ec; }
.side-b { background: #f5eee2; }
.side-badge { display: flex; width: 34rpx; height: 34rpx; align-items: center; justify-content: center; flex: 0 0 auto; margin-right: 12rpx; border-radius: 10rpx; background: #176b4d; color: #fff; font-size: 18rpx; font-weight: 700; }
.side-b .side-badge { background: #a87a31; }
.side-text { color: #53655b; font-size: 21rpx; line-height: 1.55; }
.difference-summary { display: block; margin-top: 10rpx; color: #8b978f; font-size: 18rpx; }

.report-summary { display: flex; align-items: center; margin-bottom: 20rpx; padding: 26rpx; border-radius: 28rpx; background: linear-gradient(145deg, #1a654b, #244f3e); box-shadow: 0 14rpx 38rpx rgba(23, 86, 63, 0.17); color: #fff; }
.summary-seal { display: flex; width: 66rpx; height: 66rpx; align-items: center; justify-content: center; flex: 0 0 auto; border: 1rpx solid rgba(255, 255, 255, 0.24); border-radius: 20rpx; background: rgba(255, 255, 255, 0.09); font-family: serif; font-size: 29rpx; }
.summary-copy { min-width: 0; flex: 1; margin-left: 17rpx; }
.summary-label,
.summary-title,
.summary-syndrome { display: block; }
.summary-label { color: rgba(255, 255, 255, 0.52); font-size: 18rpx; }
.summary-title { overflow: hidden; margin-top: 4rpx; font-size: 27rpx; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.summary-syndrome { margin-top: 5rpx; color: #dceadf; font-size: 20rpx; }
.summary-date { color: rgba(255, 255, 255, 0.55); font-size: 20rpx; }

.detail-card,
.prescription-card { overflow: hidden; margin-bottom: 20rpx; border: 1rpx solid #e1e6e1; border-radius: 28rpx; background: #fff; box-shadow: 0 9rpx 28rpx rgba(40, 65, 52, 0.04); }
.detail-head,
.prescription-head { display: flex; align-items: center; justify-content: space-between; padding: 24rpx 26rpx; }
.detail-kicker,
.detail-title { display: block; }
.detail-kicker { color: #8b7b60; font-size: 15rpx; letter-spacing: 3rpx; }
.detail-kicker.gold { color: #9c742f; }
.detail-title { margin-top: 5rpx; color: #2b4035; font-size: 27rpx; font-weight: 700; }
.detail-expand { color: #839087; font-size: 20rpx; }
.detail-content { padding: 2rpx 26rpx 26rpx; border-top: 1rpx solid #eef1ee; color: #52645a; font-size: 23rpx; line-height: 1.68; }
.subsection-title { display: block; margin: 20rpx 0 12rpx; color: #344a3e; font-size: 22rpx; font-weight: 700; }
.advice-title { margin-top: 25rpx; }
.detail-bullet { display: flex; margin-top: 9rpx; }
.bullet-dot { flex: 0 0 auto; margin-right: 11rpx; color: #b48a46; font-size: 30rpx; line-height: 1.15; }
.prescription-card { border-color: #e8dec8; background: #fffdf8; }
.prescription-title-line { display: flex; align-items: center; }
.prescription-icon { display: flex; width: 58rpx; height: 58rpx; align-items: center; justify-content: center; margin-right: 14rpx; border-radius: 18rpx; background: #f2e8d4; color: #94671e; font-family: serif; font-size: 25rpx; }
.prescription-body { padding: 0 26rpx 26rpx; }
.medicine-head,
.medicine-row { display: grid; grid-template-columns: 1.2fr .7fr 1fr; padding: 13rpx 12rpx; gap: 12rpx; }
.medicine-head { border-radius: 14rpx; background: #f4efe5; color: #99886c; font-size: 18rpx; }
.medicine-row { border-bottom: 1rpx solid #eee8dc; color: #4e584f; font-size: 22rpx; }
.medicine-name { color: #3b4e43; font-weight: 650; }
.medicine-dose { color: #976b25; font-weight: 700; }
.medicine-usage { color: #758078; }
.instructions { display: flex; margin-top: 18rpx; color: #685f50; font-size: 21rpx; line-height: 1.6; }
.instructions-label { flex: 0 0 auto; margin-right: 14rpx; color: #8e692d; font-weight: 700; }
.cautions { margin-top: 17rpx; padding: 15rpx; border-radius: 16rpx; background: #f8eee5; color: #906646; font-size: 19rpx; line-height: 1.55; }
</style>

