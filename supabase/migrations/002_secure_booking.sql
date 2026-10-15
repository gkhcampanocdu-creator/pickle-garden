-- 002_secure_booking.sql
--
-- STEP 1 of the security rollout. Run this BEFORE merging the "security-fixes"
-- branch. It only ADDS things, so the current live site keeps working.
-- Safe to run more than once.
--
-- Adds:
--   * create_booking_group(): books all of a guest's hours in one transaction
--     (all or nothing), re-checks the rules, and blocks reused GCash refs.
--     Only the app's server (service_role) may call it.
--   * A database-level guarantee that live bookings never overlap. If your
--     existing data already contains overlaps, this one rule is skipped and a
--     WARNING tells you which date to clean up; everything else still applies.

begin;

create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

-- ── Atomic multi-hour booking ────────────────────────────────────────────────
create or replace function public.create_booking_group(
  p_guest_name   text,
  p_phone        text,
  p_email        text,
  p_booking_date date,
  p_hours        int[],
  p_prices       numeric[],
  p_gcash_ref    text
) returns uuid[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_n   int := coalesce(array_length(p_hours, 1), 0);
  v_ids uuid[] := '{}';
  v_id  uuid;
begin
  if v_n < 1 or v_n > 4
     or v_n <> coalesce(array_length(p_prices, 1), 0)
     or (select count(distinct h) from unnest(p_hours) as h) <> v_n
     or exists (select 1 from unnest(p_hours) as h where h is null or h < 8 or h > 20)
     or p_phone is null or p_phone !~ '^09[0-9]{9}$'
     or p_gcash_ref is null or p_gcash_ref !~ '^[0-9]{13}$'
     or coalesce(length(p_guest_name), 0) not between 1 and 121 then
    raise exception 'INVALID_BOOKING' using errcode = '22023';
  end if;

  -- Same per-date lock key as the old create_booking(), so both serialise together during rollout
  perform pg_advisory_xact_lock(hashtext(p_booking_date::text));
  perform pg_advisory_xact_lock(hashtext('gcash:' || p_gcash_ref));

  if exists (
    select 1 from bookings
    where gcash_ref = p_gcash_ref and status is distinct from 'cancelled'
  ) then
    raise exception 'DUPLICATE_REF' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from bookings b, unnest(p_hours) as h
    where b.booking_date = p_booking_date
      and b.status is distinct from 'cancelled'
      and b.start_hour < h + 1
      and h < b.start_hour + b.duration
  ) then
    raise exception 'SLOT_CONFLICT' using errcode = 'P0001';
  end if;

  for i in 1 .. v_n loop
    insert into bookings (guest_name, phone, email, booking_date, start_hour, duration, total_price, gcash_ref)
    values (p_guest_name, p_phone, coalesce(p_email, ''), p_booking_date, p_hours[i], 1, p_prices[i], p_gcash_ref)
    returning id into v_id;
    v_ids := v_ids || v_id;
  end loop;

  return v_ids;
end;
$$;

revoke all on function public.create_booking_group(text, text, text, date, int[], numeric[], text) from public, anon, authenticated;
grant execute on function public.create_booking_group(text, text, text, date, int[], numeric[], text) to service_role;

-- Format rules (hours, phone, GCash ref) are enforced inside create_booking_group()
-- rather than as table CHECKs, so the admin can still mark paid or cancel older
-- rows, and rows you add by hand in the Table Editor (e.g. walk-ins) still work.
alter table public.bookings drop constraint if exists bookings_hours_check;
alter table public.bookings drop constraint if exists bookings_phone_check;
alter table public.bookings drop constraint if exists bookings_gcash_ref_check;

-- ── Live bookings may never overlap ──────────────────────────────────────────
do $$
declare v_overlap record;
begin
  if exists (select 1 from pg_constraint where conname = 'bookings_no_overlap') then
    return;
  end if;

  select a.booking_date into v_overlap
  from public.bookings a
  join public.bookings b
    on a.booking_date = b.booking_date and a.id < b.id
   and a.status is distinct from 'cancelled' and b.status is distinct from 'cancelled'
   and int4range(a.start_hour::int, (a.start_hour + a.duration)::int)
    && int4range(b.start_hour::int, (b.start_hour + b.duration)::int)
  limit 1;

  if found then
    raise warning 'Skipped the no-overlap rule: existing bookings overlap on %. Cancel the duplicate in the admin dashboard, then run this file again.', v_overlap.booking_date;
    return;
  end if;

  alter table public.bookings add constraint bookings_no_overlap
    exclude using gist (booking_date with =, int4range(start_hour::int, (start_hour + duration)::int) with &&)
    where (status is distinct from 'cancelled');
end $$;

commit;

-- Result shown in the SQL editor: true means double-bookings are now impossible at the database level.
select exists (select 1 from pg_constraint where conname = 'bookings_no_overlap') as overlap_rule_active;
