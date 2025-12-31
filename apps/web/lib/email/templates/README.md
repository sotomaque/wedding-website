# Email Templates

This directory contains all email templates for the wedding website.

## Structure

Each template is a TypeScript file that exports a function returning an HTML string. This approach provides:

- **Type safety** - Function parameters are typed
- **Reusability** - Templates can be shared across multiple routes
- **Maintainability** - Email design changes are made in one place
- **Testability** - Templates can be tested independently

## Available Templates

### `wedding-invitation.tsx`

Wedding invitation email with personalized background photo.

**Features:**
- Blurred background image (similar to RSVP page design)
- Personalized greeting with guest name
- Prominent invitation code display
- RSVP button with direct link
- Event details hint
- Responsive design

**Usage:**
```typescript
import { getWeddingInvitationEmail } from "@/lib/email/templates/wedding-invitation";

const emailHtml = getWeddingInvitationEmail({
  firstName: "John",
  lastName: "Doe",
  inviteCode: "ABCD-1234",
  rsvpUrl: "https://example.com/rsvp?code=ABCD-1234",
  appUrl: "https://example.com",
});
```

## Creating New Templates

When creating a new email template:

1. Create a new `.tsx` file in this directory
2. Define an interface for the template props
3. Export a function that returns an HTML string
4. Include proper inline CSS (most email clients strip external styles)
5. Test across multiple email clients
6. Document the template in this README

## Design Guidelines

- Use inline styles (CSS classes are often stripped by email clients)
- Test background images (some clients block them by default)
- Keep layouts simple and table-based for maximum compatibility
- Include alt text for images
- Provide text fallbacks for links
- Use web-safe fonts as fallbacks
- Target max-width of 600px for content

## Testing

Test templates in major email clients:
- Gmail (web, iOS, Android)
- Outlook (web, desktop)
- Apple Mail
- Yahoo Mail

Tools for testing:
- [Litmus](https://www.litmus.com/)
- [Email on Acid](https://www.emailonacid.com/)
- Send test emails to yourself across different clients
