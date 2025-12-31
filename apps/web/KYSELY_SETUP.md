# Kysely Database Setup

This project uses [Kysely](https://kysely.dev/) as a type-safe SQL query builder for PostgreSQL (via Supabase).

## Why Kysely?

- **Type Safety**: Full TypeScript type inference for queries
- **SQL-First**: Write SQL-like queries with full control
- **Supabase Compatible**: Works seamlessly with Supabase's PostgreSQL database
- **Better DX**: Autocomplete, compile-time errors, and refactoring support

## Database Configuration

### Connection String

The database connection is configured via the `DATABASE_URL` environment variable. This uses Supabase's connection pooling endpoint for optimal performance.

**Get your connection string:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **Database**
4. Under **Connection string** → **URI**, copy the **connection pooling** string (port 6543)
5. Add it to your `.env` file:

```env
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

Replace `[PASSWORD]` with your actual database password.

## Type Definitions

Database types are defined in [`/lib/db/types.ts`](/lib/db/types.ts).

### Schema Structure

```typescript
export interface Database {
  guests: GuestsTable;
  activities: ActivitiesTable;
  guest_activity_interests: GuestActivityInterestsTable;
}
```

### Type Helpers

For each table, we export helper types:

```typescript
export type Guest = Selectable<GuestsTable>;        // SELECT queries
export type NewGuest = Insertable<GuestsTable>;     // INSERT queries
export type GuestUpdate = Updateable<GuestsTable>;  // UPDATE queries
```

## Kysely Client

The database client is initialized in [`/lib/db/index.ts`](/lib/db/index.ts):

```typescript
import { db } from "@/lib/db";

// Use db for all queries
const guests = await db.selectFrom("guests").selectAll().execute();
```

## Common Query Patterns

### SELECT - Fetch all records

```typescript
const guests = await db
  .selectFrom("guests")
  .selectAll()
  .orderBy("created_at", "desc")
  .execute();
```

### SELECT - Fetch one record

```typescript
const guest = await db
  .selectFrom("guests")
  .selectAll()
  .where("id", "=", guestId)
  .executeTakeFirst(); // Returns undefined if not found
```

### SELECT - Fetch with WHERE clause

```typescript
const guests = await db
  .selectFrom("guests")
  .selectAll()
  .where("invite_code", "=", code.toUpperCase())
  .execute();
```

### INSERT - Create new record

```typescript
const guest = await db
  .insertInto("guests")
  .values({
    name: "John Doe",
    email: "john@example.com",
    invite_code: inviteCode,
    rsvp_status: "pending",
    // ... other fields
  })
  .returningAll()
  .executeTakeFirstOrThrow(); // Throws if insert fails
```

### UPDATE - Modify existing records

```typescript
await db
  .updateTable("guests")
  .set({
    rsvp_status: "yes",
    dietary_restrictions: "Vegetarian",
  })
  .where("invite_code", "=", code)
  .execute();
```

### DELETE - Remove records

```typescript
await db
  .deleteFrom("guests")
  .where("id", "=", guestId)
  .execute();
```

## Keeping Types in Sync

When you modify your database schema in Supabase, you need to update the Kysely types to match.

### Option 1: Manual Updates (Current Approach)

When you add/modify tables or columns in Supabase:

1. Update [`/lib/db/types.ts`](/lib/db/types.ts) to match the new schema
2. Ensure field types match PostgreSQL types:
   - Use `Generated<string>` for auto-generated ID fields
   - Use `ColumnType<Date, string | undefined, never>` for timestamp fields
   - Use union types for enums (e.g., `"yes" | "no" | "pending"`)

**Example:**

```typescript
export interface GuestsTable {
  id: Generated<string>;
  name: string;
  email: string;
  rsvp_status: "pending" | "yes" | "no";
  created_at: ColumnType<Date, string | undefined, never>;
  // Add new fields here when schema changes
}
```

### Option 2: Automatic Type Generation (Optional)

You can use [kysely-codegen](https://github.com/RobinBlomberg/kysely-codegen) to automatically generate types from your database schema.

**Install:**

```bash
bun add -D kysely-codegen
```

**Generate types:**

```bash
bunx kysely-codegen --url="$DATABASE_URL" --out-file=lib/db/types.generated.ts
```

**Add to package.json:**

```json
{
  "scripts": {
    "db:generate-types": "kysely-codegen --url=\"$DATABASE_URL\" --out-file=lib/db/types.ts"
  }
}
```

Run `bun run db:generate-types` whenever your schema changes.

## Migration from Supabase Client

### Before (Supabase):

```typescript
const { data: guests, error } = await supabase
  .from("guests")
  .select("*")
  .eq("invite_code", code);

if (error) {
  // handle error
}
```

### After (Kysely):

```typescript
const guests = await db
  .selectFrom("guests")
  .selectAll()
  .where("invite_code", "=", code)
  .execute();
```

**Key Differences:**
- No more `{ data, error }` destructuring - Kysely throws on errors
- Use `.where("field", "=", value)` instead of `.eq("field", value)`
- Use `.execute()` to run the query
- Use `.executeTakeFirst()` for single records (like `.single()`)
- Use `.returningAll()` with inserts/updates to get the modified data

## Refactored Routes

All database-touching routes have been migrated to Kysely:

- ✅ [`/api/admin/guests/route.ts`](/api/admin/guests/route.ts) - Admin CRUD operations
- ✅ [`/api/admin/guests/resend-email/route.ts`](/api/admin/guests/resend-email/route.ts) - Resend invitations
- ✅ [`/api/rsvp/verify/route.ts`](/api/rsvp/verify/route.ts) - Verify invite codes
- ✅ [`/api/rsvp/submit/route.ts`](/api/rsvp/submit/route.ts) - Submit RSVP responses

The original Supabase implementation is backed up at `/api/admin/guests/route.supabase.backup.ts` for reference.

## Environment Variables Cleanup

The following Supabase environment variables have been **removed** as they're no longer needed:

- ❌ `SUPABASE_SERVICE_ROLE_KEY` - Was only used for Supabase client operations
- ❌ `NEXT_PUBLIC_SUPABASE_URL` - Was only used for Supabase client operations
- ❌ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Was only used for Supabase client operations

**Only required database variable:**
- ✅ `DATABASE_URL` - Direct PostgreSQL connection for Kysely

You can safely remove the old Supabase variables from your `.env` file.

## Resources

- [Kysely Documentation](https://kysely.dev/)
- [Kysely API Reference](https://kysely-org.github.io/kysely-apidoc/)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
