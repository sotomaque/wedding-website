-- Add travel info fields to guests table (admin-only)
alter table guests
  add column if not exists arrival_date date,
  add column if not exists arrival_transport text,
  add column if not exists departure_date date,
  add column if not exists departure_transport text,
  add column if not exists accommodation_notes text;
