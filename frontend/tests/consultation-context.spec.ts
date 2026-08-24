import { describe, expect, it } from 'vitest'
import { isConsultationContextReady } from '@/domain/consultation-context'

describe('patient consultation context', () => {
  it('allows consultation when the patient has no medical history', () => {
    expect(isConsultationContextReady({ patientId: 'patient-1', expertId: 'expert-1' })).toBe(true)
  })

  it('requires an authenticated patient profile and a consultation expert', () => {
    expect(isConsultationContextReady({ patientId: '', expertId: 'expert-1' })).toBe(false)
    expect(isConsultationContextReady({ patientId: 'patient-1', expertId: '' })).toBe(false)
  })
})
