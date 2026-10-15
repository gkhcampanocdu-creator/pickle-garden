-- 003_lock_down_public_access.sql
--
-- STEP 2 of the security rollout. Run this AFTER the "security-fixes" branch
-- is merged and the new version is live on Vercel. From then on the website
-- reads and writes bookings only through its own server, so the public
-- (anon) key no longer needs, or gets, any access to customer data.
-- Safe to run more than once.

begin;

alter table public.bookings enable row level security;

-- Remove every existing policy on bookings (e.g. "Allow public availability
-- read", which exposed names, phones, emails and GCash refs to anyone)
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'bookings' loop
    execute format('drop policy %I on public.bookings', p.policyname);
  end loop;
end $$;

revoke all on public.bookings from anon, authenticated;

-- The old browser-callable booking function trusted the price sent by the browser.
-- Drop every version of it, whatever its parameter types.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'create_booking'
  loop
    execute format('drop function %s', f.signature);
  end loop;
end $$;

commit;
