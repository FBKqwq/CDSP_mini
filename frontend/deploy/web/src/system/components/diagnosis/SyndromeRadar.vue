<script setup lang="ts">
import { getCurrentInstance, nextTick, onMounted, onUnmounted, watch } from 'vue'
import type { SyndromeScore } from '@/types/domain'

const props = defineProps<{
  scores: SyndromeScore[]
  visible?: boolean
}>()

const canvasId = 'syndrome-radar-canvas'
const componentInstance = getCurrentInstance()?.proxy
let drawTimer: ReturnType<typeof setTimeout> | undefined

function measureCanvas(): Promise<number> {
  return new Promise((resolve) => {
    const query = uni.createSelectorQuery()
    if (componentInstance) query.in(componentInstance)
    query
      .select(`#${canvasId}`)
      .boundingClientRect((result) => {
        const rect = Array.isArray(result) ? result[0] : result
        const width = Number(rect?.width ?? 0)
        const height = Number(rect?.height ?? 0)
        resolve(Math.floor(Math.min(width, height)))
      })
      .exec()
  })
}

async function drawRadar(attempt = 0): Promise<void> {
  if (props.visible === false || props.scores.length < 3) return

  await nextTick()
  const size = await measureCanvas()
  if (!size) {
    if (attempt < 4) drawTimer = setTimeout(() => void drawRadar(attempt + 1), 80)
    return
  }

  const center = size / 2
  const radius = size * 0.27
  const context = uni.createCanvasContext(canvasId, componentInstance)
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
    context.setStrokeStyle(ring === 4 ? '#b8cabe' : '#dce6de')
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
  context.setFillStyle('rgba(29, 118, 82, 0.2)')
  context.setStrokeStyle('#176b4d')
  context.setLineWidth(2)
  context.fill()
  context.stroke()

  props.scores.forEach((score, index) => {
    const scale = Math.max(0, Math.min(1, score.value / score.max))
    const point = pointAt(index, scale)
    context.beginPath()
    context.arc(point.x, point.y, Math.max(2.5, size * 0.012), 0, Math.PI * 2)
    context.setFillStyle('#176b4d')
    context.fill()

    const labelPoint = pointAt(index, 1.28)
    context.setFillStyle('#506359')
    context.setFontSize(Math.max(10, Math.min(12, size * 0.045)))
    context.setTextAlign('center')
    context.setTextBaseline(labelPoint.y < center ? 'bottom' : 'top')
    const name = score.name.length > 4 ? `${score.name.slice(0, 4)}…` : score.name
    context.fillText(`${name} ${score.value}`, labelPoint.x, labelPoint.y)
  })

  context.draw()
}

function scheduleDraw(): void {
  if (drawTimer) clearTimeout(drawTimer)
  drawTimer = setTimeout(() => void drawRadar(), 60)
}

onMounted(scheduleDraw)
onUnmounted(() => {
  if (drawTimer) clearTimeout(drawTimer)
})

watch(
  () => [props.visible, props.scores.map((item) => `${item.name}:${item.value}:${item.max}`).join('|')],
  scheduleDraw,
)
</script>

<template>
  <view class="radar-wrap">
    <canvas v-if="scores.length >= 3" class="radar-canvas" :canvas-id="canvasId" :id="canvasId" />
    <view v-else class="radar-empty">暂无可绘制的证候数据</view>
  </view>
</template>

<style scoped>
.radar-wrap {
  display: flex;
  width: 100%;
  height: calc(100vw - 110rpx);
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
}

.radar-canvas {
  width: 100%;
  height: 100%;
}

.radar-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8e9992;
  font-size: 22rpx;
}

@media (min-width: 360px) {
  .radar-wrap {
    height: calc(50vw - 97rpx);
  }
}
</style>
