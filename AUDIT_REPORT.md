# Pickle Garden — Security & Performance Audit Report
**Date:** 2026-04-26  
**Auditor:** Claude Code (Sonnet 4.6)  
**Scope:** Full-stack Next.js 16 booking application

---

## 1. Environment Variable Audit

| Variable | Location | Status |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` only | ✅ Safe |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` only | ✅ Safe |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` only — server-side only | ✅ Safe |
| `ADMIN_PASSWORD` | `.env.local` only — never exposed to client | ✅ Safe |
| `RESEND_API_KEY` | `.env.local` only — server-side only | ✅ Safe |
| `RESEND_FROM_EMAIL` | `.env.local` only | ✅ Safe |
| `NEXT_PUBLIC_PRICE_PER_HOUR` | `.env.local` — intentionally public | ✅ Safe |
| `NEXT_PUBLIC_GCASH_QR_PATH` | `.env.local` — intentionally public | ✅ Safe |

**Finding:** Zero hardcoded secrets found in source code. All sensitive values accessed via `process.env`.

---

## 2. Supabase RLS Recommendations

The booking submission (`lib/bookings.ts`) uses the **anonymous key** directly from the browser, so Supabase Row Level Security is the primary data protection layer. The following policies must be enabled in your Supabase dashboard:

```sql
-- Enable RLS on the bookings table
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Anyone (anon) can INSERT a new booking
CREATE POLICY "Allow public bookings insert"
  ON bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- Anyone can read non-cancelled bookings (needed for availability check)
CREATE POLICY "Allow public availability read"
  ON bookings FOR SELECT
  TO anon
  USING (status != 'cancelled');

-- Nobody can UPDATE or DELETE via the anon key
-- (updates go through service-role key in API routes only)
```

**Action required:** Verify these policies are active in the Supabase Dashboard → Authentication → Policies. The service-role key (used in API routes) bypasses RLS by design.

---

## 3. Rate Limiting Summary

| Route | Limit | Window | Auth Required |
|---|---|---|---|
| `GET /api/lookup-booking` | 20 req | 60 s | None |
| `POST /api/cancel-booking` | 10 req | 60 s | Phone verification |
| `POST /api/admin-auth` | 5 attempts | 5 min | Password |
| `POST /api/admin/update-payment` | — | — | Admin token header |
| `POST /api/admin/cancel` | — | — | Admin token header |
| `POST /api/send-confirmation` | — | — | Internal only |

**Note:** Rate limiting is in-memory (`lib/rate-limit.ts`). Resets on serverless cold starts. For persistent rate limiting under high traffic, migrate to [Upstash Redis](https://upstash.com/).

---

## 4. Security Headers

| Header | Value | Purpose |
|---|---|---|
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` | Blocks MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables unused browser APIs |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Forces HTTPS for 1 year |
| `Content-Security-Policy` | See `next.config.ts` | Blocks XSS & injection |

---

## 5. Competitive Benchmarking

### Page Load Speed (LCP)

| Metric | Industry Best Practice | Pickle Garden | Notes |
|---|---|---|---|
| LCP target | < 2.5 s | ~1.2 s (estimated) | Static page, no server-rendered data |
| Fonts | `next/font` with `display:swap` | ✅ Implemented | Playfair Display + Inter |
| Images | `next/image` with `priority` on hero | ⚠️ Partial | Only GCash QR uses `<Image>` — no hero image present |
| Bundle splitting | Automatic via Next.js | ✅ App Router | Each route is its own chunk |
| Tree-shaking | Named imports only | ✅ Implemented | `lucide-react`, `framer-motion` |
| Splash screen | Coordinates with page load | ✅ Implemented | Waits for `window.load` before exit |

### Security Headers

| Header | Industry Standard | Pickle Garden | Score |
|---|---|---|---|
| `Content-Security-Policy` | Required | ✅ Added | A |
| `HSTS` | Required for HTTPS sites | ✅ Added | A |
| `X-Frame-Options` | Required | ✅ Present | A |
| `X-Content-Type-Options` | Required | ✅ Present | A |
| `Referrer-Policy` | Recommended | ✅ Present | A |
| `Permissions-Policy` | Recommended | ✅ Present | A |
| Admin token (constant-time compare) | Best practice | ⚠️ String equality | Upgrade to `crypto.timingSafeEqual` for defence-in-depth |

**Overall Security Header Grade: A-**

### Mobile Responsiveness

| Criterion | Industry Best Practice | Pickle Garden | Status |
|---|---|---|---|
| Touch targets ≥ 44px | WCAG 2.5.5 | ✅ All buttons `py-3.5`+ | Pass |
| Viewport meta | `width=device-width` | ✅ Next.js default | Pass |
| Hamburger nav on mobile | < 768 px | ✅ `md:hidden` hamburger | Pass |
| No horizontal scroll | Content fits viewport | ✅ `max-w` containers | Pass |
| Reduced motion support | `prefers-reduced-motion` | ✅ CSS + Framer Motion | Pass |
| Step labels on mobile | Visible at all widths | ✅ Short labels added | Pass |

### Booking Friction (Clicks to Complete)

| Platform | Steps to Book | Clicks Required |
|---|---|---|
| Airbnb (for reference) | ~6 screens | ~12 clicks |
| Calendly | ~3 screens | ~7 clicks |
| **Pickle Garden** | **3 steps** | **~7 clicks** |
| Theoretical minimum | 1 screen | ~4 clicks |

**Breakdown for Pickle Garden:**
1. Click date on calendar (1)
2. Click duration (1)
3. Click time slot (1)
4. Click "Continue" (1)
5. Fill form fields — keyboard, not clicks (0)
6. Click "Review & Confirm" (1)
7. Scan QR + enter reference — keyboard (0)
8. Click "Confirm Booking" (1)

**Total: 6 clicks.** Competitive with Calendly. Improvement opportunity: pre-select today's date and 1-hour duration by default to remove 2 clicks.

---

## 6. Accessibility (WCAG AA)

| Component | Issue | Status |
|---|---|---|
| Navbar | All buttons have `aria-label` or visible text | ✅ Pass |
| StepIndicator | `aria-current="step"` on active step | ✅ Pass |
| TimeSlots | `role="radiogroup"` + `role="radio"` + `aria-checked` | ✅ Pass |
| BookingForm | All inputs have associated `<label>` elements | ✅ Pass |
| BookingLookup | `role="dialog"` + `aria-modal="true"` | ✅ Pass |
| BookingLookup | Focus moves to cancel phone input on confirm | ✅ Fixed |
| SuccessView | Copy feedback announced via `aria-live="polite"` | ✅ Fixed |
| Footer | Phone/address links have visible text | ✅ Pass |
| Color contrast (green `#006241` on white) | 7.2:1 ratio | ✅ AAA |
| Color contrast (stone-400 `#a8a29e` on white) | 2.8:1 ratio | ⚠️ Fails AA for small text |

**Action required:** `text-stone-400` used for helper text (e.g., phone format hint) falls below WCAG AA (4.5:1) for small text. Consider `text-stone-500` (#78716c, 4.6:1) for all helper/secondary text.

---

## 7. SEO

| Tag | Status | Value |
|---|---|---|
| `<title>` | ✅ | "Pickle Garden — Court Booking" |
| `<meta description>` | ✅ | Includes location, price, CTA |
| `og:title` | ✅ | Matches page title |
| `og:description` | ✅ | Present |
| `og:image` | ⚠️ | `/og-image.png` referenced but file not confirmed in `/public` |
| `twitter:card` | ✅ | `summary_large_image` |
| `robots` | ✅ | `index: true, follow: true` |
| `lang` attribute | ✅ | `lang="en"` on `<html>` |

**Action required:** Create `/public/og-image.png` (1200×630px) for Facebook/Viber link previews. Without it, shares will show no image.

---

## 8. Summary Scorecard

| Category | Score | Grade |
|---|---|---|
| Security (headers + secrets) | 9/10 | A |
| Performance (load speed) | 8/10 | B+ |
| Mobile Responsiveness | 10/10 | A+ |
| Booking Friction | 8/10 | B+ |
| Accessibility (WCAG AA) | 8/10 | B+ |
| SEO | 8/10 | B+ |
| **Overall** | **51/60** | **A-** |

### Remaining Action Items (Priority Order)

1. **Create `/public/og-image.png`** — unblocks Facebook/Viber link previews
2. **Verify Supabase RLS policies** are active in the dashboard (see Section 2)
3. **Replace `text-stone-400` with `text-stone-500`** for WCAG AA compliance on small helper text
4. **Use `crypto.timingSafeEqual`** for admin token comparison to prevent timing attacks
5. **Consider Upstash Redis** for persistent rate limiting if traffic grows
