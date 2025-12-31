# Helen & Enrique's Wedding Website

A beautiful, modern wedding website built with Next.js 16, React 19, and Tailwind CSS. Features an interactive photo carousel, randomized galleries, an interactive map of San Diego recommendations, and elegant animations.

## Features

- **Hero Carousel**: Auto-scrolling photo carousel with manual navigation and timer reset
- **Randomized Photos**: Photos are shuffled on each visit for a fresh experience
- **Interactive Map**: Explore our favorite San Diego spots with an interactive Mapbox-powered map
- **Responsive Design**: Fully responsive across all devices
- **Dark/Light Mode**: Theme switching support
- **Elegant Animations**: Smooth hover effects and transitions throughout
- **SEO Optimized**: Complete meta tags, Open Graph, and Twitter Card support

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Components**: Custom component library with [shadcn/ui](https://ui.shadcn.com/)
- **Carousel**: [Embla Carousel](https://www.embla-carousel.com/)
- **Maps**: [Mapbox GL JS](https://www.mapbox.com/) with [deck.gl](https://deck.gl/)
- **Monorepo**: [Turborepo](https://turbo.build/)
- **Package Manager**: [Bun](https://bun.sh/)
- **Linting**: [Biome](https://biomejs.dev/)
- **Type Checking**: [TypeScript 5](https://www.typescriptlang.org/)

## Prerequisites

- [Bun](https://bun.sh/) 1.3.5 or higher
- Node.js 20 or higher

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd wedding-website
```

2. Install dependencies:
```bash
bun install
```

3. Set up environment variables:
```bash
# Create a .env.local file in apps/web
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local` and add your environment variables:
```env
# Required for map functionality
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here

# Required for RSVP email notifications
RESEND_API_KEY=your_resend_api_key_here
RSVP_EMAIL=your-email@example.com

# Required for displaying contact email in footer
NEXT_PUBLIC_RSVP_EMAIL=your-email@example.com

# Required for admin authentication (optional - only needed for /admin access)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
ADMIN_EMAILS=your-email@example.com,partner-email@example.com
```

**Getting API Keys:**
- **Mapbox Token**: Get your token at [https://account.mapbox.com/access-tokens/](https://account.mapbox.com/access-tokens/)
- **Resend API Key**: Get your API key at [https://resend.com/api-keys](https://resend.com/api-keys)
- **Clerk Keys** (Optional):
  1. Create a free account at [https://clerk.com](https://clerk.com)
  2. Create a new application
  3. Enable Email and Google OAuth as sign-in methods
  4. Copy your Publishable and Secret keys from the dashboard
  5. Add your admin emails to `ADMIN_EMAILS` (comma-separated)

4. Update site configuration:
Edit `apps/web/app/site-config.ts` to update:
- Wedding date
- RSVP deadline
- Couple names

Note: The wedding email is now configured via the `NEXT_PUBLIC_RSVP_EMAIL` environment variable.

5. Update content:
Edit `apps/web/app/constants.ts` to customize:
- Hero photos and descriptions
- Story content
- Wedding details
- Schedule
- RSVP form fields

## Development

Start the development server:
```bash
bun dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## Build

Build the project for production:
```bash
bun run build
```

## Linting & Type Checking

```bash
# Run linter
bun run lint

# Fix linting issues
bun --filter=web lint:fix

# Type checking
bun --filter=web lint:types
```

## Project Structure

```
wedding-website/
├── apps/
│   └── web/              # Next.js app
│       ├── app/          # App router pages and layouts
│       ├── components/   # Page-specific components
│       └── public/       # Static assets
├── packages/
│   └── ui/               # Shared UI component library
│       ├── src/
│       │   ├── components/  # Reusable UI components
│       │   ├── hooks/       # Custom React hooks
│       │   └── lib/         # Utility functions
│       └── package.json
└── package.json          # Root package.json
```

## Adding shadcn/ui Components

To add new shadcn/ui components:

```bash
bunx shadcn@latest add button -c apps/web
```

This will place the UI components in the `packages/ui/src/components` directory.

## Using Components

Import components from the UI package:

```tsx
import { Button } from "@workspace/ui/components/button"
import { Navigation } from "@workspace/ui/components/navigation"
```

## Customization

### Colors and Theme

Edit `packages/ui/src/styles/globals.css` to customize the color scheme.

### Navigation

Update `apps/web/app/navigation-config.ts` to modify navigation links and branding.

### Photos

Place your wedding photos in `apps/web/public/our-photos/` and update the `HERO_PHOTOS` array in `apps/web/app/constants.ts`.

## Admin Dashboard

The website includes a protected admin area at `/admin` for managing wedding-related tasks.

### Features:
- **Clerk Authentication**: Secure sign-in with email magic link and Google OAuth
- **Email-based Authorization**: Only specified admin emails can access the dashboard
- **Persistent Sessions**: Stay signed in across browser sessions
- **Protected Routes**: Middleware automatically protects all `/admin/*` routes

### Accessing the Admin Dashboard:
1. Navigate to `/admin` in your browser
2. Sign in using email magic link or Google OAuth
3. Only emails listed in `ADMIN_EMAILS` environment variable will be granted access
4. Unauthorized users will see an access denied message

### Setting Up Clerk:
1. Create a free account at [Clerk.com](https://clerk.com)
2. Create a new application in the Clerk dashboard
3. Enable the following authentication methods:
   - Email (magic link)
   - Google OAuth
4. Copy your API keys and add them to `.env.local`:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ADMIN_EMAILS=your-email@example.com,partner-email@example.com
   ```

## Deployment

This project is ready to deploy to:

- [Vercel](https://vercel.com/) (recommended for Next.js)
- [Netlify](https://www.netlify.com/)
- Any platform that supports Next.js

### Deploy to Vercel

```bash
# Install Vercel CLI
bun add -g vercel

# Deploy
vercel
```

Remember to add your environment variables in your deployment platform's settings.

## License

Private - All rights reserved
