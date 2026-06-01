-- Migration 058: Add end_date column to events for multi-day events.
-- An event spans event_date (start) through end_date (end). end_date is
-- nullable; when null (or equal to event_date) the event is single-day, so
-- existing rows keep their current behavior with no backfill. start_time
-- applies to the first day and end_time to the last day; both may be null for
-- an all-day multi-day event (e.g. a 3-day camping trip).

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS end_date DATE;
