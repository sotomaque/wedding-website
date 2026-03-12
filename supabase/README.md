# Supabase

This directory contains the Supabase configuration and database migrations for the wedding website.

## Structure

- `config.toml` - Supabase project configuration
- `migrations/` - SQL migration files applied in order

## Commands

```bash
# Start local Supabase
supabase start

# Create a new migration
supabase migration new <name>

# Apply migrations
supabase db push

# Generate TypeScript types
supabase gen types typescript --local
```
