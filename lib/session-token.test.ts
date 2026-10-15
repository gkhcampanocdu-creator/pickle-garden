import { describe, it, expect } from 'vitest'
import { signToken, verifyToken, safeEqual } from './session-token'

const SECRET = 'test-secret-that-is-long-enough-123456'
const NOW = 1_800_000_000_000

describe('session tokens', () => {
  it('verifies a token it signed before expiry', () => {
    const token = signToken(NOW + 60_000, SECRET)
    expect(verifyToken(token, SECRET, NOW)).toBe(true)
  })

  it('rejects an expired token', () => {
    const token = signToken(NOW - 1, SECRET)
    expect(verifyToken(token, SECRET, NOW)).toBe(false)
  })

  it('rejects a token whose expiry was edited', () => {
    const token = signToken(NOW + 60_000, SECRET)
    const [, sig] = token.split('.')
    expect(verifyToken(`${NOW + 999_999_999}.${sig}`, SECRET, NOW)).toBe(false)
  })

  it('rejects a token signed with another secret', () => {
    const token = signToken(NOW + 60_000, 'some-other-secret-value-0000000000')
    expect(verifyToken(token, SECRET, NOW)).toBe(false)
  })

  it('rejects malformed and empty tokens', () => {
    expect(verifyToken('', SECRET, NOW)).toBe(false)
    expect(verifyToken('1', SECRET, NOW)).toBe(false)
    expect(verifyToken('abc.def', SECRET, NOW)).toBe(false)
    expect(verifyToken(undefined, SECRET, NOW)).toBe(false)
  })

  it('refuses to sign or verify with a missing or short secret', () => {
    expect(() => signToken(NOW + 60_000, '')).toThrow()
    expect(() => signToken(NOW + 60_000, 'short')).toThrow()
    expect(verifyToken(signToken(NOW + 60_000, SECRET), '', NOW)).toBe(false)
  })
})

describe('safeEqual', () => {
  it('compares strings without leaking length mismatches as exceptions', () => {
    expect(safeEqual('pickleball', 'pickleball')).toBe(true)
    expect(safeEqual('pickleball', 'pickleballs')).toBe(false)
    expect(safeEqual('', 'x')).toBe(false)
  })
})
