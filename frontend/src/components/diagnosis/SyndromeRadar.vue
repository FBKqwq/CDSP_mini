<script setup lang="ts">
import { nextTick, onMounted, watch } from 'vue'
import type { SyndromeScore } from '@/types/domain'

const props = defineProps<{ scores: SyndromeScore[] }>()
const canvasId = 'syndrome-radar-canvas'

function drawRadar(): void {
  if (props.scores.length < 3) return
  const size = 270
  const center = size / 2
  const radius = 88
  const context = uni.createCanvasContext(canvasId)
  const count = props.scores.length
  const pointAt = (index: number, scale: number) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count
    return {
      x: center + Math.cos(angle) * radius * scale,
      y: center + Math.sin(angle) * radius * scale,
    }
  }

  context.clearRect(0, 0, size, size)
  for (let ring = 1; ring <= 4; ring += 1) {
    context.beginPath()
    for (let index = 0; index < count; index += 1) {
      const point = pointAt(index, ring / 4)
      if (index === 0) context.moveTo(point.x, point.y)
      else context.lineTo(point.x, point.y)
    }
    context.closePath()
    context.setStrokeStyle(ring === 4 ? '#b9cbbf' : '#dce6de')
    context.setLineWidth(1)
    context.stroke()
  }

  props.scores.forEach((_, index) => {
    const point = pointAt(index, 1)
    context.beginPath()
    context.moveTo(center, center)
    context.lineTo(point.x, point.y)
    context.setStrokeStyle('#d9e3dc')
    context.stroke()
  })

  context.beginPath()
  props.scores.forEach((score, index) => {
    const scale = Math.max(0, Math.min(1, score.value / score.max))
    const point = pointAt(index, scale)
    if (index === 0) context.moveTo(point.x, point.y)
    else context.lineTo(point.x, point.y)
  })
  context.closePath()
  context.setFillStyle('rgba(29, 118, 82, 0.22)')
  context.setStrokeStyle('#176b4d')
  context.setLineWidth(2)
  context.fill()
  context.stroke()

  props.scores.forEach((score, index) => {
    const scale = Math.max(0, Math.min(1, score.value / score.max))
    const point = pointAt(index, scale)
    context.beginPath()
    context.arc(point.x, point.y, 3.5, 0, Math.PI * 2)
    context.setFillStyle('#176b4d')
    context.fill()

    const labelPoint = pointAt(index, 1.28)
    context.setFillStyle('#53665c')
    context.setFontSize(12)
    context.setTextAlign(labelPoint.x < center - 10 ? 'right' : labelPoint.x > center + 10 ? 'left' : 'center')
    context.setTextBaseline(labelPoint.y < center ? 'bottom' : 'top')
    context.fillText(score.name.length > 5 ? `${score.name.slice(0, 5)}…` : score.name, labelPoint.x, labelPoint.y)
  })

  context.draw()
}

onMounted(() => {
  setTimeout(drawRadar, 80)
})

watch(
  () => props.scores.map((item) => `${item.name}:${item.value}:${item.max}`).join('|'),
  async () => {
    await nextTick()
    drawRadar()
  },
)
</script>

<template>
  <view class="radar-wrap">
    <canvas v-if="scores.length >= 3" class="radar-canvas" :canvas-id="canvasId" :id="canvasId" />
    <view v-else class="radar-empty">暂无可绘制的证候数据</view>
    <view v-if="scores.length" class="score-list">
      <view v-for="score in scores" :key="score.name" class="score-item">
        <view class="score-line">
          <text>{{ score.name }}</text>
          <text class="score-value">{{ score.value }}/{{ score.max }}</text>
        </view>
        <view class="score-track"><view class="score-fill" :style="{ width: `${Math.min(100, score.value / score.max * 100)}%` }" /></view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.radar-wrap { display: flex; align-items: center; flex-direction: column; }
.radar-canvas { width: 270px; height: 270px; }
.radar-empty { display: flex; height: 360rpx; align-items: center; justify-content: center; color: #8e9992; font-size: 24rpx; }
.score-list { width: 100%; margin-top: -12rpx; }
.score-item { margin-top: 15rpx; }
.score-line { display: flex; justify-content: space-between; color: #55675d; font-size: 21rpx; }
.score-value { color: #176b4d; font-weight: 700; }
.score-track { overflow: hidden; height: 8rpx; margin-top: 7rpx; border-radius: 6rpx; background: #e7ece8; }
.score-fill { height: 100%; border-radius: 6rpx; background: linear-gradient(90deg, #2b8961, #c18c39); }
</style>

