import { describe, it, expect } from 'vitest'
import { buildConfirmationEmail, buildCancellationEmail, escapeHtml } from './email'

const evil = '<a href="https://evil.example">Click</a><script>x()</script>'

describe('email templates', () => {
  it('escapes every guest-supplied value in the confirmation email', () => {
    const html = buildConfirmationEmail({
      guestName: `${evil} Santos`, bookingRef: '#PBA1B2C3', date: 'Oct 18, 2026',
      time: '10:00 AM', duration: '1 hour', price: '₱300', gcashRef: evil,
    })
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<a href="https://evil.example">')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes the guest name in the cancellation email', () => {
    const html = buildCancellationEmail({
      guestName: '<script>x()</script>', bookingRef: '#PBA1B2C3', date: 'Oct 18, 2026', time: '10:00 AM', duration: '1 hour',
    })
    expect(html).not.toContain('<script>')
  })

  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;')
  })
})
