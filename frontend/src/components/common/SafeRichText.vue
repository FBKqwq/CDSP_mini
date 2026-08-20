<script setup lang="ts">
import { computed } from 'vue'
import { parseSafeMarkdown } from '@/utils/safe-markdown'

const props = defineProps<{ content: string }>()
const nodes = computed(() => parseSafeMarkdown(props.content))
</script>

<template>
  <rich-text class="safe-rich-text" :nodes="nodes" />
</template>

<style scoped>
.safe-rich-text {
  display: block;
  color: inherit;
  font-size: inherit;
  line-height: 1.72;
  word-break: break-word;
}

:deep(.md-heading) {
  margin: 10rpx 0 4rpx;
  font-weight: 700;
}

:deep(.md-heading-1) {
  font-size: 34rpx;
}

:deep(.md-heading-2) {
  font-size: 31rpx;
}

:deep(.md-heading-3) {
  font-size: 29rpx;
}

:deep(.md-list) {
  padding-left: 8rpx;
}
</style>

