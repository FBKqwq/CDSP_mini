import type { ConsultationContext } from '@/types/domain'

/** 历史疾病是可选背景；患者身份和问诊专家才是创建会话的必要条件。 */
export function isConsultationContextReady(
  context: Pick<ConsultationContext, 'patientId' | 'expertId'>,
): boolean {
  return Boolean(context.patientId && context.expertId)
}
