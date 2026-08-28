<script setup lang="ts">
import { onHide, onLaunch, onShow } from '@dcloudio/uni-app'
import { useAuthStore } from '@/stores/auth'
import { useConsultationStore } from '@/stores/consultation'
import { useHealthContextStore } from '@/stores/health-context'

onLaunch(async () => {
  const authStore = useAuthStore()
  await authStore.bootstrap()
  uni.$on('auth:expired', () => {
    useConsultationStore().resetAll()
    useHealthContextStore().resetAll()
    authStore.expire()
    uni.reLaunch({ url: '/pages/login/index' })
  })
})

onHide(() => {
  useConsultationStore().handleBackground()
})

onShow(() => {
  void useConsultationStore().handleForeground()
})
</script>

<style>
page {
  min-height: 100%;
  background: #f3f5ef;
  color: #20332b;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

view,
text,
scroll-view,
input,
textarea,
button {
  box-sizing: border-box;
}

button::after {
  border: 0;
}
</style>

