# CLAUDE.md - Project Guidelines for AI Code Reviews

## Project Overview

This is a wedding website built with Next.js 16 (App Router), React 19, and TypeScript. It uses a monorepo structure with Turborepo.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5.7+ (strict mode)
- **Package Manager**: Bun (not npm/yarn)
- **Styling**: Tailwind CSS 4
- **Components**: shadcn/ui (Radix UI based)
- **Database**: Supabase (PostgreSQL) with Kysely ORM
- **Auth**: Clerk
- **Email**: Resend with templates
- **Payments**: Stripe
- **Linting**: Biome

## Code Style

### Formatting
- 2-space indentation
- Double quotes for strings
- No semicolons (Biome handles this)
- Run `bun run lint` to check, `bun run lint:fix` to auto-fix

### Naming Conventions
- **Components**: PascalCase (`MainNavigation.tsx`)
- **Functions/Utils**: camelCase (`generateInviteCode`)
- **Types/Interfaces**: PascalCase (`Gift`, `Photo`)
- **Constants**: UPPER_SNAKE_CASE (`HERO_PHOTOS`)
- **Database columns**: snake_case (`thank_you_email_sent`)

### File Structure
```
apps/web/
├── app/           # Next.js App Router pages and API routes
├── components/    # Reusable React components
├── lib/           # Utilities, DB, auth, email, validations
├── __tests__/     # Unit tests (Bun test)
└── e2e/           # E2E tests (Playwright)
```

## Key Patterns

### Server vs Client Components
- Server Components are the default (no directive needed)
- Client Components must have `"use client"` at the top
- Keep client components minimal; prefer server components

### Server Actions
- Mark with `"use server"` directive
- Always wrap in try-catch with console.error logging
- Return `{ success: boolean, error?: string }` pattern

### Database Queries
- Use Kysely for all database operations (type-safe)
- Never use raw SQL strings
- Chain methods: `db.selectFrom().select().where().execute()`

### Type Safety
- Never use `any` type - use proper interfaces
- Use Zod for runtime validation
- All component props must be typed with interfaces
- Environment variables validated in `env.ts`

### Email
- Use Resend templates (not inline HTML)
- Template IDs defined in `lib/email/constants.ts`
- Don't pass `subject` when using templates (subject comes from template)

## Testing

### Unit Tests
- Location: `__tests__/**/*.test.ts`
- Framework: Bun test
- Run: `bun run test`
- Cover edge cases (empty arrays, nulls, type variations)

### E2E Tests
- Location: `e2e/**/*.spec.ts`
- Framework: Playwright
- Run: `bun run test:e2e`
- Test user flows, not implementation details

## PR Review Checklist

When reviewing PRs, check for:

1. **Type Safety**: No `any` types, proper interfaces
2. **Error Handling**: Try-catch in server actions, meaningful error messages
3. **Server/Client Boundary**: Correct use of directives
4. **Database**: Using Kysely, not raw SQL
5. **Testing**: Unit tests for utils, E2E for user flows
6. **Security**: No exposed secrets, proper input validation
7. **Performance**: No unnecessary re-renders, proper memoization
8. **Code Style**: Follows Biome rules, consistent naming

## Commands

```bash
bun install          # Install dependencies
bun run dev          # Start dev server
bun run build        # Build for production
bun run lint         # Check linting
bun run lint:fix     # Fix linting issues
bun run typecheck    # TypeScript check
bun run test         # Unit tests
bun run test:e2e     # E2E tests
```

## Important Notes

- Always use `bun` (not npm/yarn)
- Path alias `@/*` maps to project root
- Path alias `@workspace/ui/*` maps to shared UI package
- Client env vars must be prefixed with `NEXT_PUBLIC_`
- Database types are auto-generated in `lib/db/types.ts`
