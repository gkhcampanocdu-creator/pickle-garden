# Security Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the data-exposure, abuse and integrity holes in the live Pickle Garden site without losing any current feature.

**Architecture:** The browser stops talking to Supabase. Route handlers (the repo's existing pattern) use a server-only service-role client; booking logic lives in a tested service module behind a store interface; a new `create_booking_group` SQL function books all chosen hours atomically. Admin auth becomes a signed httpOnly cookie. Rollout is zero-downtime: migration 002 is additive (run before merge), migration 003 removes public access (run after the new code is live).

**Tech Stack:** Next.js 16.2.4 route handlers, React 19, Supabase JS, Resend, Vitest + PGlite (new dev deps), server-only.

**Spec:** Findings from the 2026-10-16 review of github.com/gkhcampanocdu-creator/pickle-garden @ aac3a70:
1. Anon SELECT policy exposes all customer PII; admin list + lookup + cancel read via anon key.
2. `/api/send-confirmation` is an open, unescaped email relay.
3. `create_booking` RPC / anon INSERT accept any price, hour, date.
4. Multi-hour bookings are not atomic (partial bookings).
5. Admin password stored in localStorage and sent as a header token; non-constant-time compare.
6. `supabase-server.ts` silently falls back to the anon key.
7. Today/current hour from device clock; `new Date()` during render (hydration mismatch).
8. `pickleball-booking.html` publishes a live Apps Script URL.
Plus: lookup/cancel by reference only touch the first hour of a multi-hour booking.

## Global Constraints

- Keep current business rules: hours 8:00–21:00 (last slot starts 20:00), 1–4 one-hour slots (need not be contiguous), ₱300/h with 4 h = ₱1,000, max 60 days ahead, Asia/Manila time, phone `09XXXXXXXXX` (accept `+639…`), GCash ref 13 digits, email optional, 2-hour customer cancellation window.
- Booking reference format stays `#PB` + first 6 hex chars of the first row's id (existing refs keep working).
- One booking = rows sharing `gcash_ref` + `booking_date` + `phone` (existing data model, one row per hour).
- No secret in any `NEXT_PUBLIC_` variable. `NEXT_PUBLIC_SUPABASE_ANON_KEY` no longer used.
- Each deploy step must leave the live site working (002 before merge, 003 after).

## Review Focus

1. Device clock/zone ≠ Manila → server must still reject past hours.
2. Concurrent bookings sharing one hour of a multi-hour set → all-or-nothing, second gets conflict.
3. Admin API called with no/forged/expired cookie → 401.
4. POST /api/bookings with tampered price/hours/date → recomputed/rejected.
5. Lookup/cancel of a multi-hour booking → shows and cancels every hour.

---

### Task 1: Booking rules + test tooling
`lib/booking-rules.ts` + tests: `courtNow`, `normalizePhone`, `priceFor(n)` (4→1000), `validateContact`, `validateBooking(input,{now})` for hours arrays (distinct ints 8–20, 1–4 of them, not past on today, date ≤ today+60), `occupiedHours`, `addDays`, `bookingRef`, `splitPrice(total,n)` (sums exactly). Vitest config + `npm test`.

### Task 2: Server-only plumbing + admin session
`lib/supabase-server.ts` (server-only, lazy, no anon fallback), `lib/session-token.ts` (+tests), `lib/admin-session.ts` (cookie `pg_admin`, 12 h).

### Task 3: Booking service
`lib/booking-service.ts` (+memory-store tests): `getAvailability`, `createBooking` (validate → price → `createGroup` → conflict/duplicate_ref/invalid/error), `lookupBooking(ref)` (group, masked phone), `cancelBookingByGuest(ref, phone, now)` (whole group, 2 h window from earliest hour), `adminList`, `adminSetPaid`, `adminCancel` (each gated by `isAdmin`).

### Task 4: Migrations
`supabase/migrations/002_secure_booking.sql` (additive): `create_booking_group(...)` SECURITY DEFINER with `search_path`, per-date + per-ref advisory locks, hour/format validation, EXECUTE for service_role only; NOT VALID CHECKs; overlap exclusion constraint added only when existing data allows. `003_lock_down_public_access.sql`: drop bookings policies, revoke anon/authenticated table access, drop old `create_booking`. PGlite tests.

### Task 5: Route handlers + email
`/api/availability` GET, `/api/bookings` POST (rate-limited; confirmation email via `after()`), `/api/admin-auth` POST/DELETE (cookie), `/api/admin/bookings` GET, `/api/admin/update-payment` + `/api/admin/cancel` (cookie), `/api/lookup-booking`, `/api/cancel-booking` (service). Delete `/api/send-confirmation`. HTML-escape all values in `lib/email.ts`. `lib/supabase-store.ts`.

### Task 6: UI
BookingFlow/TimeSlots/Calendar: Manila "now" set after mount, fetch via routes, toast timer fix, stale-response guard, expiry of selected hours. Admin page: cookie session (clear old localStorage token), list via route, Manila today, failure toasts. BookingLookup: show all hours.

### Task 7: Cleanup + docs
Delete `lib/supabase.ts`, `lib/bookings.ts`, old `lib/admin.ts`, `pickleball-booking.html`; drop Supabase/Resend from CSP `connect-src`; `.env.example`; README with rollout steps; fix AUDIT_REPORT §2. Verify `npm test`, `tsc`, `next build`, live smoke test.
