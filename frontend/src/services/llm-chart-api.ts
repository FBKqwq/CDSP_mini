import { appEnv } from '@/config/env'
import { MockLlmChartApi } from '@/services/mock-api'
import { RemoteLlmChartApi } from '@/services/remote-api'
import type { LlmChartApi } from '@/types/api'

export const llmChartApi: LlmChartApi = appEnv.useMock
  ? new MockLlmChartApi()
  : new RemoteLlmChartApi()

