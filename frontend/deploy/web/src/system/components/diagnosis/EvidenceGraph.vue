<script setup lang="ts">
import { computed } from 'vue'

interface EvidenceNode {
  id: string
  text: string
  x: number
  y: number
  angle: number
  radius: number
}

const props = defineProps<{
  syndrome: string
  evidence: string[]
}>()

const nodes = computed<EvidenceNode[]>(() => {
  const count = props.evidence.length
  const radius = count <= 4 ? 33 : 36
  return props.evidence.map((text, index) => {
    const angle = -90 + (360 * index) / count
    const radians = (angle * Math.PI) / 180
    return {
      id: `${index}-${text}`,
      text,
      angle,
      radius,
      x: 50 + Math.cos(radians) * radius,
      y: 50 + Math.sin(radians) * radius,
    }
  })
})
</script>

<template>
  <view v-if="nodes.length" class="evidence-graph">
    <view
      v-for="node in nodes"
      :key="`edge-${node.id}`"
      class="graph-edge"
      :style="{ width: `${node.radius}%`, transform: `rotate(${node.angle}deg)` }"
    />
    <view class="graph-center">
      <text class="center-label">证候</text>
      <text class="center-value">{{ syndrome || '待辨证' }}</text>
    </view>
    <view
      v-for="(node, index) in nodes"
      :key="node.id"
      class="graph-node"
      :style="{ left: `${node.x}%`, top: `${node.y}%` }"
    >
      <text class="node-index">{{ String(index + 1).padStart(2, '0') }}</text>
      <text class="node-text">{{ node.text }}</text>
    </view>
  </view>
  <view v-else class="graph-empty">暂无辨证依据</view>
</template>

<style scoped>
.evidence-graph {
  position: relative;
  width: 100%;
  height: calc(100vw - 110rpx);
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
  flex: 0 0 auto;
  overflow: hidden;
  background:
    radial-gradient(circle at center, rgba(31, 124, 87, 0.08) 0 16%, transparent 17%),
    radial-gradient(circle at center, transparent 0 34%, rgba(31, 124, 87, 0.07) 35%, transparent 36%);
}

.graph-edge {
  position: absolute;
  z-index: 1;
  left: 50%;
  top: 50%;
  height: 1px;
  transform-origin: left center;
  background: linear-gradient(90deg, rgba(31, 124, 87, 0.42), rgba(31, 124, 87, 0.12));
}

.graph-center {
  position: absolute;
  z-index: 3;
  left: 50%;
  top: 50%;
  display: flex;
  width: 31%;
  min-height: 31%;
  box-sizing: border-box;
  padding: 10rpx;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.75);
  border-radius: 50%;
  background: #1c7453;
  box-shadow: 0 8rpx 18rpx rgba(20, 84, 61, 0.18);
  color: #fff;
  flex-direction: column;
  text-align: center;
  transform: translate(-50%, -50%);
}

.center-label {
  color: rgba(255, 255, 255, 0.7);
  font-size: 17rpx;
}

.center-value {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 4rpx;
  font-size: 20rpx;
  font-weight: 700;
  line-height: 1.25;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.graph-node {
  position: absolute;
  z-index: 2;
  display: flex;
  width: 36%;
  min-height: 21%;
  box-sizing: border-box;
  padding: 8rpx 10rpx;
  align-items: flex-start;
  border: 1px solid rgba(31, 124, 87, 0.16);
  border-radius: 13rpx;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 5rpx 13rpx rgba(49, 72, 59, 0.08);
  color: #3d5146;
  gap: 6rpx;
  transform: translate(-50%, -50%);
}

.node-index {
  color: #b58436;
  font-size: 16rpx;
  font-weight: 700;
}

.node-text {
  display: -webkit-box;
  overflow: hidden;
  font-size: 17rpx;
  line-height: 1.28;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.graph-empty {
  display: flex;
  width: 100%;
  height: calc(100vw - 110rpx);
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  color: #8e9992;
  font-size: 22rpx;
}

@media (min-width: 360px) {
  .evidence-graph,
  .graph-empty {
    height: calc(50vw - 97rpx);
  }
}
</style>
