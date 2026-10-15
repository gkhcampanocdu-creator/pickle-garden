# Pickle Garden — Court Booking

Booking site for Pickle Garden, a pickleball court in Mandaue City: https://picklegarden.vercel.app

Guests pick a date and 1–4 one-hour slots, pay by GCash, and enter their GCash reference number. Guests can look up or cancel a booking with its reference. Staff verify payments at `/admin`.

Built with Next.js 16 (App Router), React 19, Tailwind CSS 4, Supabase (Postgres) and Resend (email).

## How it fits together

- **The browser never talks to Supabase.** Every read and write goes through the site's own API routes in `app/api/`. Those routes use a server-only Supabase client with the service-role key. The public anon key isn't used anywhere.
- **Booking rules live in `lib/booking-rules.ts`:**
  - opening hours 8:00 AM–9:00 PM
  - 1–4 slots per booking
  - ₱300 per hour, or ₱1,000 for 4 hours
  - up to 60 days ahead
  - Asia/Manila time
  
  The browser uses these rules for instant feedback, and the server enforces them. The price is always worked out on the server.
- **A booking is saved all at once.** `create_booking_group()` in Postgres saves every chosen hour, or none if any hour was taken. It also rejects a GCash reference that's already been used. Only the server can call it.
- **Admin login is a signed, httpOnly cookie** that lasts 12 hours. The password is checked on the server, and the account locks for 5 minutes after 5 wrong attempts.
- **Emails are sent only by the server,** for bookings it just created or cancelled. Anything the guest typed is escaped before it goes into an email.

## Setup (local)

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000, admin at /admin
```

## Security rollout (one time)

Do these steps in this order. The live site keeps working between steps.

1. Add `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` in Vercel (see `.env.example`).
2. Run `supabase/migrations/002_secure_booking.sql` in the Supabase SQL editor. This only adds things.
3. Merge the `security-fixes` branch into `main`. Vercel deploys it.
4. Run `supabase/migrations/003_lock_down_public_access.sql`. This removes all public access to the bookings table.
5. In Vercel, delete `NEXT_PUBLIC_SUPABASE_ANON_KEY`, which is no longer used.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Unit tests: booking rules, booking service, admin session, email escaping, Supabase request mapping, and the SQL migrations (run against an in-memory Postgres) |
