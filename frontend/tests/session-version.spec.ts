import { describe, expect, it } from 'vitest'
import { SessionVersion } from '@/domain/session-version'

describe('session version isolation', () => {
  it('invalidates callbacks captured before context changes', () => {
    const version = new SessionVersion()
    const oldCallbackVersion = version.capture()
    version.bump()
    expect(version.isCurrent(oldCallbackVersion)).toBe(false)
    expect(version.isCurrent(version.capture())).toBe(true)
  })

  it('increments monotonically for rapid context switches', () => {
    const version = new SessionVersion()
    expect([version.bump(), version.bump(), version.bump()]).toEqual([1, 2, 3])
  })
})

