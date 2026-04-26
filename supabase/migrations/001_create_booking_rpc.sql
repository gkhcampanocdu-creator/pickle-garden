-- Atomic booking creation with advisory lock to prevent double-bookings.
--
-- pg_advisory_xact_lock ensures only one transaction at a time processes
-- bookings for a given date, making the conflict check + insert atomic.
-- The lock is automatically released when the transaction commits/rolls back.
--
-- Deploy via: Supabase Dashboard → SQL Editor → Run, or supabase db push.

CREATE OR REPLACE FUNCTION create_booking(
  p_guest_name  TEXT,
  p_phone       TEXT,
  p_email       TEXT,
  p_booking_date DATE,
  p_start_hour  INTEGER,
  p_duration    INTEGER,
  p_total_price NUMERIC,
  p_gcash_ref   TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id       UUID;
  v_conflict INTEGER;
BEGIN
  -- Serialise all writes for the same date.
  -- hashtext() folds the date string into a bigint key.
  PERFORM pg_advisory_xact_lock(hashtext(p_booking_date::text));

  -- Range-overlap check: two bookings overlap when
  --   existing.start_hour < new.end_hour  AND  new.start_hour < existing.end_hour
  SELECT COUNT(*) INTO v_conflict
  FROM bookings
  WHERE booking_date = p_booking_date
    AND status       != 'cancelled'
    AND start_hour    < p_start_hour + p_duration
    AND p_start_hour  < start_hour   + duration;

  IF v_conflict > 0 THEN
    RAISE EXCEPTION 'SLOT_CONFLICT';
  END IF;

  INSERT INTO bookings (
    guest_name, phone, email,
    booking_date, start_hour, duration,
    total_price, gcash_ref
  ) VALUES (
    p_guest_name, p_phone, p_email,
    p_booking_date, p_start_hour, p_duration,
    p_total_price, p_gcash_ref
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Allow the anonymous (browser) key to call this function.
-- The SECURITY DEFINER above means it runs with the table-owner's privileges,
-- so RLS on the bookings table does NOT apply inside this function.
GRANT EXECUTE ON FUNCTION create_booking(TEXT, TEXT, TEXT, DATE, INTEGER, INTEGER, NUMERIC, TEXT) TO anon;
