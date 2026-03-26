import type { EmailTemplateType, Prisma } from "@prisma/client";

type DefaultTemplate = Prisma.EmailTemplateCreateManyInput;

interface TemplateDefinition {
  type: EmailTemplateType;
  name: string;
  subjects: Record<string, string>;
  htmlBodies: Record<string, string>;
  variables: Array<{ key: string; description: string }>;
}

/**
 * Returns the default email templates for a new wedding.
 * HTML uses triple-brace Mustache-style placeholders: {{{VARIABLE_NAME}}}
 * Creates one template per type per language.
 */
export function getDefaultTemplates(
  weddingId: string,
  languages: string[] = ["en", "es"],
): DefaultTemplate[] {
  const definitions: TemplateDefinition[] = [
    {
      type: "wedding_invitation" as EmailTemplateType,
      name: "Wedding Invitation",
      subjects: {
        en: "You're Invited to {{{COUPLE_NAMES}}}'s Wedding!",
        es: "Estas Invitado/a a la Boda de {{{COUPLE_NAMES}}}!",
      },
      htmlBodies: {
        en: weddingInvitationHtml,
        es: weddingInvitationHtmlEs,
      },
      variables: [
        {
          key: "COUPLE_NAMES",
          description: "Names of the couple (e.g. Helen & Enrique)",
        },
        { key: "GUEST_NAME", description: "Full name of the invited guest" },
        { key: "WEDDING_DATE", description: "Formatted wedding date" },
        { key: "VENUE_NAME", description: "Name of the wedding venue" },
        { key: "VENUE_ADDRESS", description: "Address of the wedding venue" },
        {
          key: "INVITE_CODE",
          description: "Unique invitation code for the guest",
        },
        { key: "RSVP_URL", description: "URL for the guest to RSVP" },
        {
          key: "PERSONAL_MESSAGE",
          description: "Optional personal message to the guest",
        },
      ],
    },
    {
      type: "rsvp_notification" as EmailTemplateType,
      name: "RSVP Notification",
      subjects: {
        en: "New RSVP: {{{GUEST_NAMES}}} - {{{STATUS}}}",
        es: "Nueva Confirmacion: {{{GUEST_NAMES}}} - {{{STATUS}}}",
      },
      htmlBodies: {
        en: rsvpNotificationHtml,
        es: rsvpNotificationHtmlEs,
      },
      variables: [
        {
          key: "GUEST_NAMES",
          description: "Comma-separated list of guest names",
        },
        {
          key: "GUEST_EMAILS",
          description: "Comma-separated list of guest emails",
        },
        { key: "INVITE_CODE", description: "Invite code used for the RSVP" },
        { key: "STATUS", description: "Attending or Not Attending" },
        {
          key: "STATUS_COLOR",
          description: "Hex color for the status badge (#48bb78 or #f56565)",
        },
        { key: "STATUS_EMOJI", description: "Status emoji (checkmark or X)" },
        { key: "GUEST_COUNT", description: "Number of guests in the RSVP" },
        {
          key: "DIETARY_RESTRICTIONS",
          description: "Dietary restrictions (if any)",
        },
        {
          key: "SUBMITTED_AT",
          description: "Date/time the RSVP was submitted",
        },
      ],
    },
    {
      type: "gift_notification" as EmailTemplateType,
      name: "Gift Notification",
      subjects: {
        en: "New Gift Received: {{{AMOUNT}}} from {{{DONOR_NAME}}}",
        es: "Nuevo Regalo Recibido: {{{AMOUNT}}} de {{{DONOR_NAME}}}",
      },
      htmlBodies: {
        en: giftNotificationHtml,
        es: giftNotificationHtmlEs,
      },
      variables: [
        {
          key: "DONOR_NAME",
          description: "Name of the gift giver (or Anonymous)",
        },
        {
          key: "DONOR_EMAIL",
          description: "Email of the gift giver (if provided)",
        },
        {
          key: "AMOUNT",
          description: "Formatted gift amount with currency symbol",
        },
        {
          key: "GIFT_TYPE",
          description: "Type of gift (e.g. Honeymoon, Baby Fund)",
        },
        { key: "GIFT_EMOJI", description: "Emoji representing the gift type" },
        {
          key: "MATCHED_GUEST",
          description: "Name of the matched guest (if any)",
        },
        { key: "CHARGE_ID", description: "Stripe transaction/charge ID" },
        {
          key: "SUBMITTED_AT",
          description: "Date/time the gift was received",
        },
      ],
    },
    {
      type: "activities_invitation" as EmailTemplateType,
      name: "Activities Invitation",
      subjects: {
        en: "Explore Things to Do - {{{COUPLE_NAMES}}}'s Wedding",
        es: "Que Hacer - Boda de {{{COUPLE_NAMES}}}",
      },
      htmlBodies: {
        en: activitiesInvitationHtml,
        es: activitiesInvitationHtmlEs,
      },
      variables: [
        { key: "GUEST_NAME", description: "Full name of the guest" },
        { key: "COUPLE_NAMES", description: "Names of the couple" },
        { key: "INVITE_CODE", description: "Guest invite code" },
        {
          key: "THINGS_TO_DO_URL",
          description: "URL to the things-to-do page",
        },
        {
          key: "BACKGROUND_IMAGE_URL",
          description: "URL for the hero background image",
        },
      ],
    },
    {
      type: "event_invitation" as EmailTemplateType,
      name: "Event Invitation",
      subjects: {
        en: "You're Invited: {{{EVENT_NAME}}}",
        es: "Estas Invitado/a: {{{EVENT_NAME}}}",
      },
      htmlBodies: {
        en: eventInvitationHtml,
        es: eventInvitationHtmlEs,
      },
      variables: [
        { key: "GUEST_NAME", description: "Full name of the invited guest" },
        { key: "COUPLE_NAMES", description: "Names of the couple" },
        { key: "EVENT_NAME", description: "Name of the event" },
        { key: "EVENT_DESCRIPTION", description: "Description of the event" },
        { key: "EVENT_DATE", description: "Formatted event date" },
        { key: "EVENT_TIME", description: "Event time" },
        { key: "LOCATION_NAME", description: "Name of the event venue" },
        { key: "LOCATION_ADDRESS", description: "Address of the event venue" },
        { key: "INVITE_CODE", description: "Guest invite code" },
        { key: "RSVP_URL", description: "URL to RSVP for the event" },
        {
          key: "BACKGROUND_IMAGE_URL",
          description: "URL for the hero background image",
        },
      ],
    },
    {
      type: "event_rsvp_notification" as EmailTemplateType,
      name: "Event RSVP Notification",
      subjects: {
        en: "Event RSVP: {{{GUEST_NAME}}} - {{{STATUS}}} for {{{EVENT_NAME}}}",
        es: "Confirmacion de Evento: {{{GUEST_NAME}}} - {{{STATUS}}} para {{{EVENT_NAME}}}",
      },
      htmlBodies: {
        en: eventRsvpNotificationHtml,
        es: eventRsvpNotificationHtmlEs,
      },
      variables: [
        { key: "GUEST_NAME", description: "Name of the guest" },
        {
          key: "GUEST_EMAIL",
          description: "Email of the guest (if provided)",
        },
        { key: "INVITE_CODE", description: "Invite code used" },
        { key: "EVENT_NAME", description: "Name of the event" },
        { key: "STATUS", description: "Attending or Not Attending" },
        { key: "STATUS_COLOR", description: "Hex color for the status badge" },
        { key: "STATUS_EMOJI", description: "Status emoji" },
        {
          key: "SUBMITTED_AT",
          description: "Date/time the RSVP was submitted",
        },
      ],
    },
    {
      type: "hotel_interest_notification" as EmailTemplateType,
      name: "Hotel Interest Notification",
      subjects: {
        en: "Hotel Interest: {{{GUEST_NAME}}} - {{{HOTEL_NAME}}}",
        es: "Interes en Hotel: {{{GUEST_NAME}}} - {{{HOTEL_NAME}}}",
      },
      htmlBodies: {
        en: hotelInterestNotificationHtml,
        es: hotelInterestNotificationHtmlEs,
      },
      variables: [
        { key: "GUEST_NAME", description: "Full name of the guest" },
        {
          key: "GUEST_EMAIL",
          description: "Email of the guest (if provided)",
        },
        {
          key: "GUEST_PHONE",
          description: "Phone number of the guest (if provided)",
        },
        { key: "HOTEL_NAME", description: "Name of the hotel" },
        {
          key: "HOTEL_ADDRESS",
          description: "Address of the hotel (if provided)",
        },
        { key: "CHECK_IN_DATE", description: "Requested check-in date" },
        { key: "CHECK_OUT_DATE", description: "Requested check-out date" },
        { key: "NUMBER_OF_ROOMS", description: "Number of rooms requested" },
        { key: "NOTES", description: "Additional notes from the guest" },
        {
          key: "ADMIN_URL",
          description: "URL to the admin guest details page",
        },
      ],
    },
    {
      type: "calendar_invite" as EmailTemplateType,
      name: "Calendar Invite",
      subjects: {
        en: "Save the Date: {{{COUPLE_NAMES}}}'s Wedding - {{{EVENT_NAME}}}",
        es: "Reserva la Fecha: Boda de {{{COUPLE_NAMES}}} - {{{EVENT_NAME}}}",
      },
      htmlBodies: {
        en: calendarInviteHtml,
        es: calendarInviteHtmlEs,
      },
      variables: [
        { key: "GUEST_NAME", description: "Full name of the guest" },
        { key: "COUPLE_NAMES", description: "Names of the couple" },
        {
          key: "EVENT_NAME",
          description: "Name of the event (e.g. Wedding Ceremony)",
        },
        { key: "EVENT_DATE", description: "Formatted event date" },
        { key: "EVENT_TIME", description: "Event time" },
        { key: "VENUE_NAME", description: "Name of the venue" },
        { key: "VENUE_ADDRESS", description: "Address of the venue" },
      ],
    },
    {
      type: "rsvp_reminder" as EmailTemplateType,
      name: "RSVP Reminder",
      subjects: {
        en: "Reminder: Please RSVP for {{{COUPLE_NAMES}}}'s Wedding",
        es: "Recordatorio: Por favor confirma para la Boda de {{{COUPLE_NAMES}}}",
      },
      htmlBodies: {
        en: rsvpReminderHtml,
        es: rsvpReminderHtmlEs,
      },
      variables: [
        { key: "GUEST_NAME", description: "Full name of the guest" },
        { key: "COUPLE_NAMES", description: "Names of the couple" },
        { key: "WEDDING_DATE", description: "Formatted wedding date" },
        { key: "RSVP_DEADLINE", description: "RSVP deadline date" },
        {
          key: "DAYS_REMAINING",
          description: "Number of days until the RSVP deadline",
        },
        { key: "RSVP_URL", description: "URL for the guest to RSVP" },
        { key: "INVITE_CODE", description: "Guest invitation code" },
      ],
    },
    {
      type: "admin_summary" as EmailTemplateType,
      name: "Admin Summary",
      subjects: {
        en: "Wedding Update: {{{COUPLE_NAMES}}} - Guest List Summary",
        es: "Actualizacion de Boda: {{{COUPLE_NAMES}}} - Resumen de Invitados",
      },
      htmlBodies: {
        en: adminSummaryHtml,
        es: adminSummaryHtmlEs,
      },
      variables: [
        { key: "COUPLE_NAMES", description: "Names of the couple" },
        { key: "WEDDING_DATE", description: "Formatted wedding date" },
        {
          key: "TOTAL_A_LIST",
          description: "Total number of A-list guests",
        },
        {
          key: "A_LIST_INVITED",
          description: "Number of A-list guests who have been sent invites",
        },
        {
          key: "A_LIST_NOT_INVITED",
          description: "Number of A-list guests who have NOT been sent invites",
        },
        {
          key: "A_LIST_PENDING",
          description: "Number of A-list guests with pending RSVP",
        },
        {
          key: "A_LIST_YES",
          description: "Number of A-list guests who RSVP'd yes",
        },
        {
          key: "A_LIST_NO",
          description: "Number of A-list guests who RSVP'd no",
        },
        {
          key: "UNINVITED_GUESTS",
          description: "HTML list of A-list guests not yet sent invites",
        },
        { key: "ADMIN_URL", description: "URL to the admin dashboard" },
        {
          key: "REPORT_DATE",
          description: "Date this report was generated",
        },
      ],
    },
  ];

  const templates: DefaultTemplate[] = [];

  for (const def of definitions) {
    for (const lang of languages) {
      const subject = def.subjects[lang] ?? def.subjects.en ?? "";
      const htmlBody = def.htmlBodies[lang] ?? def.htmlBodies.en ?? "";
      templates.push({
        weddingId,
        type: def.type,
        language: lang,
        name: def.name,
        subject,
        htmlBody,
        isActive: true,
        variables: def.variables,
      });
    }
  }

  return templates;
}

// ---------------------------------------------------------------------------
// Template HTML strings — English
// ---------------------------------------------------------------------------

const weddingInvitationHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're Invited - {{{COUPLE_NAMES}}}'s Wedding</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

      <!-- Hero Section -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
        <tr>
          <td style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.92) 0%, rgba(118, 75, 162, 0.92) 100%); padding: 80px 40px; text-align: center;">
            <h1 style="margin: 0 0 20px; color: #ffffff; font-size: 42px; font-weight: 300; letter-spacing: 2px; font-family: Georgia, 'Times New Roman', serif; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
              You're Invited
            </h1>
            <table role="presentation" width="80" cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td style="border-top: 1px solid rgba(255,255,255,0.6); padding: 20px 0 0;"></td>
              </tr>
            </table>
            <p style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 300; letter-spacing: 1px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
              {{{COUPLE_NAMES}}}
            </p>
          </td>
        </tr>
      </table>

      <!-- Main Content -->
      <div style="padding: 50px 40px; background-color: #ffffff;">
        <p style="margin: 0 0 25px; color: #2d3748; font-size: 18px; line-height: 1.6;">
          Dear {{{GUEST_NAME}}},
        </p>

        <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.8;">
          We joyfully invite you to celebrate our wedding day with us!
        </p>

        <p style="margin: 0 0 30px; color: #4a5568; font-size: 16px; line-height: 1.8;">
          {{{PERSONAL_MESSAGE}}}
        </p>

        <!-- Wedding Details Card -->
        <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border-left: 4px solid #667eea; padding: 30px; margin: 40px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <p style="margin: 0 0 20px; color: #4a5568; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            Wedding Details
          </p>
          <div style="margin: 0 0 15px;">
            <span style="color: #667eea; font-size: 16px;">&#x1F4C5;</span>
            <span style="color: #2d3748; font-size: 16px; margin-left: 10px; font-weight: 500;">{{{WEDDING_DATE}}}</span>
          </div>
          <div style="margin: 0 0 15px;">
            <span style="color: #667eea; font-size: 16px;">&#x1F4CD;</span>
            <span style="color: #2d3748; font-size: 16px; margin-left: 10px; font-weight: 500;">{{{VENUE_NAME}}}</span>
          </div>
          <div style="margin-left: 30px;">
            <span style="color: #718096; font-size: 14px;">{{{VENUE_ADDRESS}}}</span>
          </div>
        </div>

        <!-- Invitation Code Card -->
        <div style="background: #f7fafc; border-radius: 8px; padding: 25px; margin: 40px 0; text-align: center;">
          <p style="margin: 0 0 15px; color: #4a5568; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            Your Invitation Code
          </p>
          <div style="margin: 0 0 15px;">
            <span style="display: inline-block; background: #ffffff; padding: 14px 24px; border-radius: 8px; font-size: 28px; font-weight: 700; color: #667eea; letter-spacing: 3px; font-family: 'Courier New', monospace; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              {{{INVITE_CODE}}}
            </span>
          </div>
          <p style="margin: 0; color: #718096; font-size: 13px;">
            Use this code to RSVP on our wedding website
          </p>
        </div>

        <!-- RSVP Button -->
        <div style="text-align: center; margin: 45px 0;">
          <a href="{{{RSVP_URL}}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 18px 50px; border-radius: 50px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);">
            RSVP Now
          </a>
        </div>

        <!-- Link Fallback -->
        <p style="margin: 40px 0 0; color: #a0aec0; font-size: 12px; line-height: 1.6; text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          If the button doesn't work, copy this link:<br>
          <a href="{{{RSVP_URL}}}" style="color: #667eea; text-decoration: none; word-break: break-all; font-size: 11px;">{{{RSVP_URL}}}</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); padding: 40px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 15px; color: #2d3748; font-size: 18px; font-weight: 500;">
          We can't wait to celebrate with you!
        </p>
        <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
          {{{COUPLE_NAMES}}}
        </p>
      </div>
    </div>
  </body>
</html>`;

const rsvpNotificationHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New RSVP Submission</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
          {{{STATUS_EMOJI}}} New RSVP Submission
        </h1>
      </div>

      <!-- Main Content -->
      <div style="padding: 40px;">

        <!-- Status Badge -->
        <div style="text-align: center; margin-bottom: 30px;">
          <span style="display: inline-block; background-color: {{{STATUS_COLOR}}}; color: #ffffff; padding: 12px 24px; border-radius: 50px; font-size: 18px; font-weight: 600;">
            {{{STATUS}}}
          </span>
        </div>

        <!-- Guest Details Card -->
        <div style="background: #f7fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Guest(s)</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="color: #2d3748; font-size: 18px; font-weight: 600;">{{{GUEST_NAMES}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Email(s)</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="color: #4a5568; font-size: 14px;">{{{GUEST_EMAILS}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Invite Code</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="display: inline-block; background: #edf2f7; padding: 8px 16px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 16px; font-weight: 600; color: #667eea; letter-spacing: 2px;">{{{INVITE_CODE}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Submitted At</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0;">
                <span style="color: #4a5568; font-size: 14px;">{{{SUBMITTED_AT}}}</span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Dietary Restrictions -->
        <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; color: #92400e; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
            Dietary Restrictions
          </p>
          <p style="margin: 0; color: #78350f; font-size: 15px; line-height: 1.6;">
            {{{DIETARY_RESTRICTIONS}}}
          </p>
        </div>

        <!-- Guest Count Summary -->
        <div style="background: #f0fff4; border: 1px solid #68d391; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="margin: 0; color: #276749; font-size: 14px;">
            {{{GUEST_COUNT}}} guest(s) - {{{STATUS}}}
          </p>
        </div>

      </div>

      <!-- Footer -->
      <div style="background: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #718096; font-size: 13px;">
          This is an automated notification from your wedding website.
        </p>
      </div>
    </div>
  </body>
</html>`;

const giftNotificationHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Gift Received</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); padding: 40px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
          {{{GIFT_EMOJI}}} New Gift Received!
        </h1>
      </div>

      <!-- Main Content -->
      <div style="padding: 40px;">

        <!-- Amount Badge -->
        <div style="text-align: center; margin-bottom: 30px;">
          <span style="display: inline-block; background-color: #48bb78; color: #ffffff; padding: 16px 32px; border-radius: 50px; font-size: 24px; font-weight: 700;">
            {{{AMOUNT}}}
          </span>
        </div>

        <!-- Gift Details Card -->
        <div style="background: #f7fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Gift Type</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="color: #2d3748; font-size: 18px; font-weight: 600;">{{{GIFT_EMOJI}}} {{{GIFT_TYPE}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Donor Name</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="color: #2d3748; font-size: 16px;">{{{DONOR_NAME}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Donor Email</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="color: #4a5568; font-size: 14px;">{{{DONOR_EMAIL}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Received At</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0;">
                <span style="color: #4a5568; font-size: 14px;">{{{SUBMITTED_AT}}}</span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Matched Guest -->
        <div style="background: #ebf8ff; border: 1px solid #90cdf4; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; color: #2b6cb0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
            Matched Guest
          </p>
          <p style="margin: 0; color: #2c5282; font-size: 16px; font-weight: 600;">
            {{{MATCHED_GUEST}}}
          </p>
        </div>

        <!-- Transaction ID -->
        <div style="text-align: center; padding: 16px; background: #f7fafc; border-radius: 8px;">
          <p style="margin: 0; color: #718096; font-size: 12px;">
            Transaction ID: <code style="background: #edf2f7; padding: 2px 6px; border-radius: 4px;">{{{CHARGE_ID}}}</code>
          </p>
        </div>

      </div>

      <!-- Footer -->
      <div style="background: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #718096; font-size: 13px;">
          This is an automated notification from your wedding website.
        </p>
      </div>
    </div>
  </body>
</html>`;

const activitiesInvitationHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Explore Things to Do - {{{COUPLE_NAMES}}}'s Wedding</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

      <!-- Hero Section with Background Image -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
        <tr>
          <td style="background: linear-gradient(135deg, rgba(14, 165, 233, 0.88) 0%, rgba(59, 130, 246, 0.88) 100%), url({{{BACKGROUND_IMAGE_URL}}}) center/cover; padding: 70px 40px; text-align: center;">
            <h1 style="margin: 0 0 20px; color: #ffffff; font-size: 42px; font-weight: 300; letter-spacing: 2px; font-family: Georgia, 'Times New Roman', serif; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
              Explore Things to Do
            </h1>
            <table role="presentation" width="80" cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td style="border-top: 1px solid rgba(255,255,255,0.6); padding: 20px 0 0;"></td>
              </tr>
            </table>
            <p style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 300; letter-spacing: 1px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
              Our Favorite Places to Visit
            </p>
          </td>
        </tr>
      </table>

      <!-- Main Content -->
      <div style="padding: 50px 40px; background-color: #ffffff;">
        <p style="margin: 0 0 25px; color: #2d3748; font-size: 18px; line-height: 1.6;">
          Dear {{{GUEST_NAME}}},
        </p>

        <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.8;">
          Thank you so much for RSVPing to our wedding! We're so excited to celebrate with you.
        </p>

        <p style="margin: 0 0 30px; color: #4a5568; font-size: 16px; line-height: 1.8;">
          To help you make the most of your trip, we've put together a guide to our favorite spots in the area. You can also let us know which places you're planning to visit - and see who else might be going!
        </p>

        <!-- Feature Highlights -->
        <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 25px; margin: 30px 0;">
          <p style="margin: 0 0 15px; color: #0369a1; font-size: 15px; font-weight: 600;">
            What you can do:
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
            <tr>
              <td style="padding: 8px 0; color: #4a5568; font-size: 14px; vertical-align: top;">
                <span style="color: #0ea5e9; font-size: 18px; margin-right: 10px;">&#x1F5FA;&#xFE0F;</span>
                Browse our favorite beaches, restaurants, and attractions
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #4a5568; font-size: 14px; vertical-align: top;">
                <span style="color: #0ea5e9; font-size: 18px; margin-right: 10px;">&#x1F440;</span>
                See which guests are planning to visit the same spots
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #4a5568; font-size: 14px; vertical-align: top;">
                <span style="color: #0ea5e9; font-size: 18px; margin-right: 10px;">&#x2728;</span>
                Mark activities you're interested in or committed to
              </td>
            </tr>
          </table>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 45px 0;">
          <a href="{{{THINGS_TO_DO_URL}}}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 18px 50px; border-radius: 50px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 6px 20px rgba(14, 165, 233, 0.4);">
            Explore Things to Do
          </a>
        </div>

        <!-- Invite Code Reminder -->
        <div style="background: #f7fafc; border-left: 4px solid #0ea5e9; padding: 20px; margin: 40px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0 0 10px; color: #4a5568; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            Your Invite Code
          </p>
          <p style="margin: 0 0 10px; font-size: 24px; font-weight: 700; color: #0ea5e9; letter-spacing: 2px; font-family: 'Courier New', monospace;">
            {{{INVITE_CODE}}}
          </p>
          <p style="margin: 0; color: #718096; font-size: 13px;">
            Your activities will be linked to your invite code - no login required!
          </p>
        </div>

        <!-- Link Fallback -->
        <p style="margin: 40px 0 0; color: #a0aec0; font-size: 12px; line-height: 1.6; text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          Direct link (copy if button doesn't work):<br>
          <a href="{{{THINGS_TO_DO_URL}}}" style="color: #0ea5e9; text-decoration: none; word-break: break-all; font-size: 11px;">{{{THINGS_TO_DO_URL}}}</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); padding: 40px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 15px; color: #2d3748; font-size: 18px; font-weight: 500;">
          We can't wait to see you there!
        </p>
        <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
          {{{COUPLE_NAMES}}}
        </p>
      </div>
    </div>
  </body>
</html>`;

const eventInvitationHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{{EVENT_NAME}}} - {{{COUPLE_NAMES}}}</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

      <!-- Hero Section with Background Image -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
        <tr>
          <td style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.92) 0%, rgba(118, 75, 162, 0.92) 100%), url({{{BACKGROUND_IMAGE_URL}}}) center/cover; padding: 80px 40px; text-align: center;">
            <h1 style="margin: 0 0 20px; color: #ffffff; font-size: 36px; font-weight: 300; letter-spacing: 2px; font-family: Georgia, 'Times New Roman', serif; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
              You're Invited
            </h1>
            <table role="presentation" width="80" cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td style="border-top: 1px solid rgba(255,255,255,0.6); padding: 20px 0 0;"></td>
              </tr>
            </table>
            <p style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 400; letter-spacing: 1px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
              {{{EVENT_NAME}}}
            </p>
            <p style="margin: 15px 0 0; color: rgba(255,255,255,0.98); font-size: 16px; font-weight: 300; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">
              Hosted by {{{COUPLE_NAMES}}}
            </p>
          </td>
        </tr>
      </table>

      <!-- Main Content -->
      <div style="padding: 50px 40px; background-color: #ffffff;">
        <p style="margin: 0 0 25px; color: #2d3748; font-size: 18px; line-height: 1.6;">
          Dear {{{GUEST_NAME}}},
        </p>

        <p style="margin: 0 0 30px; color: #4a5568; font-size: 16px; line-height: 1.8;">
          {{{EVENT_DESCRIPTION}}}
        </p>

        <!-- Event Details Card -->
        <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border-left: 4px solid #667eea; padding: 30px; margin: 40px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <p style="margin: 0 0 20px; color: #4a5568; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            Event Details
          </p>
          <div style="margin: 0 0 15px;">
            <span style="color: #667eea; font-size: 16px;">&#x1F4C5;</span>
            <span style="color: #2d3748; font-size: 16px; margin-left: 10px; font-weight: 500;">{{{EVENT_DATE}}}</span>
          </div>
          <div style="margin: 0 0 15px;">
            <span style="color: #667eea; font-size: 16px;">&#x1F550;</span>
            <span style="color: #2d3748; font-size: 16px; margin-left: 10px; font-weight: 500;">{{{EVENT_TIME}}}</span>
          </div>
          <div style="margin: 0 0 5px;">
            <span style="color: #667eea; font-size: 16px;">&#x1F4CD;</span>
            <span style="color: #2d3748; font-size: 16px; margin-left: 10px; font-weight: 500;">{{{LOCATION_NAME}}}</span>
          </div>
          <div style="margin-left: 30px;">
            <span style="color: #718096; font-size: 14px;">{{{LOCATION_ADDRESS}}}</span>
          </div>
        </div>

        <!-- Invitation Code Card -->
        <div style="background: #f7fafc; border-radius: 8px; padding: 25px; margin: 40px 0; text-align: center;">
          <p style="margin: 0 0 15px; color: #4a5568; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            Your Invitation Code
          </p>
          <div style="margin: 0 0 15px;">
            <span style="display: inline-block; background: #ffffff; padding: 14px 24px; border-radius: 8px; font-size: 28px; font-weight: 700; color: #667eea; letter-spacing: 3px; font-family: 'Courier New', monospace; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              {{{INVITE_CODE}}}
            </span>
          </div>
          <p style="margin: 0; color: #718096; font-size: 13px;">
            Use this code to RSVP
          </p>
        </div>

        <!-- RSVP Button -->
        <div style="text-align: center; margin: 45px 0;">
          <a href="{{{RSVP_URL}}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 18px 50px; border-radius: 50px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);">
            RSVP Now
          </a>
        </div>

        <!-- Link Fallback -->
        <p style="margin: 40px 0 0; color: #a0aec0; font-size: 12px; line-height: 1.6; text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          If the button doesn't work, copy this link:<br>
          <a href="{{{RSVP_URL}}}" style="color: #667eea; text-decoration: none; word-break: break-all; font-size: 11px;">{{{RSVP_URL}}}</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); padding: 40px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 15px; color: #2d3748; font-size: 18px; font-weight: 500;">
          We hope to see you there!
        </p>
        <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
          {{{COUPLE_NAMES}}}
        </p>
      </div>
    </div>
  </body>
</html>`;

const eventRsvpNotificationHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Event RSVP - {{{EVENT_NAME}}}</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
        <h1 style="margin: 0 0 10px; color: #ffffff; font-size: 24px; font-weight: 600;">
          {{{STATUS_EMOJI}}} Event RSVP Response
        </h1>
        <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 18px;">
          {{{EVENT_NAME}}}
        </p>
      </div>

      <!-- Main Content -->
      <div style="padding: 40px;">

        <!-- Status Badge -->
        <div style="text-align: center; margin-bottom: 30px;">
          <span style="display: inline-block; background-color: {{{STATUS_COLOR}}}; color: #ffffff; padding: 12px 24px; border-radius: 50px; font-size: 18px; font-weight: 600;">
            {{{STATUS}}}
          </span>
        </div>

        <!-- Guest Details Card -->
        <div style="background: #f7fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Guest</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="color: #2d3748; font-size: 18px; font-weight: 600;">{{{GUEST_NAME}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Email</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="color: #4a5568; font-size: 14px;">{{{GUEST_EMAIL}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Event</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="color: #2d3748; font-size: 16px; font-weight: 500;">{{{EVENT_NAME}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Invite Code</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="display: inline-block; background: #edf2f7; padding: 8px 16px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 16px; font-weight: 600; color: #667eea; letter-spacing: 2px;">{{{INVITE_CODE}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Submitted At</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0;">
                <span style="color: #4a5568; font-size: 14px;">{{{SUBMITTED_AT}}}</span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Response Summary -->
        <div style="background: #f0fff4; border: 1px solid #68d391; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="margin: 0; color: #276749; font-size: 14px;">
            Guest has responded {{{STATUS}}} for {{{EVENT_NAME}}}
          </p>
        </div>

      </div>

      <!-- Footer -->
      <div style="background: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #718096; font-size: 13px;">
          This is an automated notification from your wedding website.
        </p>
      </div>
    </div>
  </body>
</html>`;

const hotelInterestNotificationHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hotel Interest: {{{GUEST_NAME}}}</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
          &#x1F3E8; New Hotel Interest
        </h1>
      </div>

      <!-- Main Content -->
      <div style="padding: 40px; background-color: #ffffff;">
        <p style="margin: 0 0 20px; color: #2d3748; font-size: 16px; line-height: 1.6;">
          A guest has expressed interest in a hotel for your wedding.
        </p>

        <!-- Guest Information -->
        <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <h2 style="margin: 0 0 15px; color: #1e293b; font-size: 18px; font-weight: 600;">
            Guest Information
          </h2>
          <p style="margin: 0 0 8px; color: #475569; font-size: 14px;">
            <strong>Name:</strong> {{{GUEST_NAME}}}
          </p>
          <p style="margin: 0 0 8px; color: #475569; font-size: 14px;">
            <strong>Email:</strong> <a href="mailto:{{{GUEST_EMAIL}}}" style="color: #6366f1; text-decoration: none;">{{{GUEST_EMAIL}}}</a>
          </p>
          <p style="margin: 0 0 8px; color: #475569; font-size: 14px;">
            <strong>Phone:</strong> <a href="tel:{{{GUEST_PHONE}}}" style="color: #6366f1; text-decoration: none;">{{{GUEST_PHONE}}}</a>
          </p>
        </div>

        <!-- Hotel Information -->
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <h2 style="margin: 0 0 15px; color: #78350f; font-size: 18px; font-weight: 600;">
            Hotel Interest
          </h2>
          <p style="margin: 0 0 8px; color: #92400e; font-size: 14px;">
            <strong>Hotel:</strong> {{{HOTEL_NAME}}}
          </p>
          <p style="margin: 0 0 8px; color: #92400e; font-size: 14px;">
            <strong>Address:</strong> {{{HOTEL_ADDRESS}}}
          </p>
          <p style="margin: 0 0 8px; color: #92400e; font-size: 14px;">
            <strong>Dates:</strong> {{{CHECK_IN_DATE}}} - {{{CHECK_OUT_DATE}}}
          </p>
          <p style="margin: 0 0 8px; color: #92400e; font-size: 14px;">
            <strong>Number of Rooms:</strong> {{{NUMBER_OF_ROOMS}}}
          </p>
          <p style="margin: 0 0 8px; color: #92400e; font-size: 14px;">
            <strong>Notes:</strong> {{{NOTES}}}
          </p>
        </div>

        <!-- Call to Action -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{{ADMIN_URL}}}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(99, 102, 241, 0.25);">
            View Guest Details
          </a>
        </div>

        <!-- Footer Note -->
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
            This notification was sent because {{{GUEST_NAME}}} marked their interest in {{{HOTEL_NAME}}} on your wedding website.
          </p>
        </div>
      </div>

      <!-- Email Footer -->
      <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #94a3b8; font-size: 12px;">
          Wedding Website Admin Notification
        </p>
      </div>
    </div>
  </body>
</html>`;

const calendarInviteHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Save the Date - {{{COUPLE_NAMES}}}'s Wedding</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
        <h1 style="margin: 0 0 10px; color: #ffffff; font-size: 28px; font-weight: 600;">
          &#x1F4C5; Save the Date
        </h1>
        <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 18px;">
          {{{COUPLE_NAMES}}}
        </p>
      </div>

      <!-- Main Content -->
      <div style="padding: 40px;">
        <p style="margin: 0 0 25px; color: #2d3748; font-size: 18px; line-height: 1.6;">
          Dear {{{GUEST_NAME}}},
        </p>

        <p style="margin: 0 0 30px; color: #4a5568; font-size: 16px; line-height: 1.8;">
          Please find attached a calendar invite for <strong>{{{EVENT_NAME}}}</strong>. Add it to your calendar so you don't miss it!
        </p>

        <!-- Event Details Card -->
        <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border-left: 4px solid #667eea; padding: 30px; margin: 40px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <p style="margin: 0 0 20px; color: #4a5568; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            Event Details
          </p>
          <div style="margin: 0 0 15px;">
            <span style="color: #667eea; font-size: 16px;">&#x1F4C5;</span>
            <span style="color: #2d3748; font-size: 16px; margin-left: 10px; font-weight: 500;">{{{EVENT_DATE}}}</span>
          </div>
          <div style="margin: 0 0 15px;">
            <span style="color: #667eea; font-size: 16px;">&#x1F550;</span>
            <span style="color: #2d3748; font-size: 16px; margin-left: 10px; font-weight: 500;">{{{EVENT_TIME}}}</span>
          </div>
          <div style="margin: 0 0 5px;">
            <span style="color: #667eea; font-size: 16px;">&#x1F4CD;</span>
            <span style="color: #2d3748; font-size: 16px; margin-left: 10px; font-weight: 500;">{{{VENUE_NAME}}}</span>
          </div>
          <div style="margin-left: 30px;">
            <span style="color: #718096; font-size: 14px;">{{{VENUE_ADDRESS}}}</span>
          </div>
        </div>

        <p style="margin: 0; color: #718096; font-size: 14px; text-align: center;">
          A .ics calendar file is attached to this email.
        </p>
      </div>

      <!-- Footer -->
      <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); padding: 40px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 15px; color: #2d3748; font-size: 18px; font-weight: 500;">
          We can't wait to celebrate with you!
        </p>
        <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
          {{{COUPLE_NAMES}}}
        </p>
      </div>
    </div>
  </body>
</html>`;

const rsvpReminderHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RSVP Reminder - {{{COUPLE_NAMES}}}'s Wedding</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

      <!-- Hero Section -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
        <tr>
          <td style="background: linear-gradient(135deg, rgba(237, 137, 54, 0.92) 0%, rgba(221, 107, 32, 0.92) 100%); padding: 60px 40px; text-align: center;">
            <h1 style="margin: 0 0 15px; color: #ffffff; font-size: 36px; font-weight: 300; letter-spacing: 2px; font-family: Georgia, 'Times New Roman', serif; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
              Friendly Reminder
            </h1>
            <table role="presentation" width="80" cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td style="border-top: 1px solid rgba(255,255,255,0.6); padding: 15px 0 0;"></td>
              </tr>
            </table>
            <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 300; letter-spacing: 1px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
              {{{DAYS_REMAINING}}} days left to RSVP
            </p>
          </td>
        </tr>
      </table>

      <!-- Main Content -->
      <div style="padding: 50px 40px; background-color: #ffffff;">
        <p style="margin: 0 0 25px; color: #2d3748; font-size: 18px; line-height: 1.6;">
          Dear {{{GUEST_NAME}}},
        </p>

        <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.8;">
          We haven't heard back from you yet! We'd love to know if you can join us for {{{COUPLE_NAMES}}}'s wedding.
        </p>

        <!-- Deadline Card -->
        <div style="background: linear-gradient(135deg, #fffaf0 0%, #feebc8 100%); border-left: 4px solid #ed8936; padding: 25px; margin: 30px 0; border-radius: 8px;">
          <p style="margin: 0 0 15px; color: #744210; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            Important Dates
          </p>
          <div style="margin: 0 0 12px;">
            <span style="color: #ed8936; font-size: 16px;">&#x1F4C5;</span>
            <span style="color: #2d3748; font-size: 16px; margin-left: 10px;">Wedding: <strong>{{{WEDDING_DATE}}}</strong></span>
          </div>
          <div>
            <span style="color: #ed8936; font-size: 16px;">&#x23F0;</span>
            <span style="color: #2d3748; font-size: 16px; margin-left: 10px;">RSVP Deadline: <strong>{{{RSVP_DEADLINE}}}</strong></span>
          </div>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 40px 0;">
          <a href="{{{RSVP_URL}}}" style="display: inline-block; background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%); color: #ffffff; padding: 16px 48px; font-size: 18px; font-weight: 600; text-decoration: none; border-radius: 50px; box-shadow: 0 4px 15px rgba(237,137,54,0.4); letter-spacing: 1px;">
            RSVP Now
          </a>
        </div>

        <!-- Invitation Code -->
        <div style="background: #f7fafc; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
          <p style="margin: 0 0 10px; color: #4a5568; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            Your Invitation Code
          </p>
          <span style="display: inline-block; background: #ffffff; padding: 10px 20px; border-radius: 8px; font-size: 24px; font-weight: 700; color: #ed8936; letter-spacing: 3px; font-family: 'Courier New', monospace; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            {{{INVITE_CODE}}}
          </span>
        </div>

        <p style="margin: 30px 0 0; color: #718096; font-size: 14px; line-height: 1.6; text-align: center;">
          We truly hope you can make it!
        </p>
      </div>

      <!-- Footer -->
      <div style="padding: 30px 40px; background-color: #f7fafc; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 8px; color: #4a5568; font-size: 14px; line-height: 1.6;">
          With love,
        </p>
        <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
          {{{COUPLE_NAMES}}}
        </p>
      </div>
    </div>
  </body>
</html>`;

const adminSummaryHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Guest List Summary - {{{COUPLE_NAMES}}}'s Wedding</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

      <!-- Header -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
        <tr>
          <td style="background: linear-gradient(135deg, rgba(56, 178, 172, 0.92) 0%, rgba(49, 151, 149, 0.92) 100%); padding: 50px 40px; text-align: center;">
            <h1 style="margin: 0 0 10px; color: #ffffff; font-size: 30px; font-weight: 300; letter-spacing: 2px; font-family: Georgia, 'Times New Roman', serif;">
              Guest List Summary
            </h1>
            <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px;">
              {{{REPORT_DATE}}}
            </p>
          </td>
        </tr>
      </table>

      <!-- Stats Grid -->
      <div style="padding: 40px;">
        <p style="margin: 0 0 20px; color: #2d3748; font-size: 18px; font-weight: 600;">
          A-List Overview
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding: 12px 16px; background: #f7fafc; border-radius: 8px;">
              <span style="color: #4a5568; font-size: 14px;">Total A-List Guests</span>
            </td>
            <td style="padding: 12px 16px; background: #f7fafc; border-radius: 8px; text-align: right;">
              <strong style="color: #2d3748; font-size: 18px;">{{{TOTAL_A_LIST}}}</strong>
            </td>
          </tr>
          <tr><td colspan="2" style="height: 8px;"></td></tr>
          <tr>
            <td style="padding: 12px 16px; background: #f0fff4; border-radius: 8px;">
              <span style="color: #276749; font-size: 14px;">&#x2705; Invited</span>
            </td>
            <td style="padding: 12px 16px; background: #f0fff4; border-radius: 8px; text-align: right;">
              <strong style="color: #276749; font-size: 18px;">{{{A_LIST_INVITED}}}</strong>
            </td>
          </tr>
          <tr><td colspan="2" style="height: 8px;"></td></tr>
          <tr>
            <td style="padding: 12px 16px; background: #fff5f5; border-radius: 8px;">
              <span style="color: #9b2c2c; font-size: 14px;">&#x274C; Not Yet Invited</span>
            </td>
            <td style="padding: 12px 16px; background: #fff5f5; border-radius: 8px; text-align: right;">
              <strong style="color: #9b2c2c; font-size: 18px;">{{{A_LIST_NOT_INVITED}}}</strong>
            </td>
          </tr>
        </table>

        <!-- RSVP Breakdown -->
        <p style="margin: 30px 0 15px; color: #2d3748; font-size: 18px; font-weight: 600;">
          RSVP Status (Invited Guests)
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding: 12px 16px; background: #fffff0; border-radius: 8px;">
              <span style="color: #744210; font-size: 14px;">&#x23F3; Pending</span>
            </td>
            <td style="padding: 12px 16px; background: #fffff0; border-radius: 8px; text-align: right;">
              <strong style="color: #744210; font-size: 18px;">{{{A_LIST_PENDING}}}</strong>
            </td>
          </tr>
          <tr><td colspan="2" style="height: 8px;"></td></tr>
          <tr>
            <td style="padding: 12px 16px; background: #f0fff4; border-radius: 8px;">
              <span style="color: #276749; font-size: 14px;">&#x1F389; Attending</span>
            </td>
            <td style="padding: 12px 16px; background: #f0fff4; border-radius: 8px; text-align: right;">
              <strong style="color: #276749; font-size: 18px;">{{{A_LIST_YES}}}</strong>
            </td>
          </tr>
          <tr><td colspan="2" style="height: 8px;"></td></tr>
          <tr>
            <td style="padding: 12px 16px; background: #fff5f5; border-radius: 8px;">
              <span style="color: #9b2c2c; font-size: 14px;">&#x1F614; Declined</span>
            </td>
            <td style="padding: 12px 16px; background: #fff5f5; border-radius: 8px; text-align: right;">
              <strong style="color: #9b2c2c; font-size: 18px;">{{{A_LIST_NO}}}</strong>
            </td>
          </tr>
        </table>

        <!-- Uninvited Guests -->
        <div style="margin-top: 30px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="padding: 15px 20px; background: #fff5f5; border-bottom: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #9b2c2c; font-size: 14px; font-weight: 600;">
              A-List Guests Not Yet Invited
            </p>
          </div>
          <div style="padding: 20px;">
            {{{UNINVITED_GUESTS}}}
          </div>
        </div>

        <!-- CTA -->
        <div style="text-align: center; margin: 35px 0 10px;">
          <a href="{{{ADMIN_URL}}}" style="display: inline-block; background: linear-gradient(135deg, #38b2ac 0%, #319795 100%); color: #ffffff; padding: 14px 40px; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 50px; box-shadow: 0 4px 15px rgba(56,178,172,0.4);">
            Go to Admin Dashboard
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding: 25px 40px; background-color: #f7fafc; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #718096; font-size: 13px;">
          This is an automated summary for {{{COUPLE_NAMES}}}'s wedding.
        </p>
      </div>
    </div>
  </body>
</html>`;

// ---------------------------------------------------------------------------
// Template HTML strings — Spanish
// ---------------------------------------------------------------------------

const weddingInvitationHtmlEs = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Estas Invitado/a - Boda de {{{COUPLE_NAMES}}}</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

      <!-- Hero Section -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
        <tr>
          <td style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.92) 0%, rgba(118, 75, 162, 0.92) 100%); padding: 80px 40px; text-align: center;">
            <h1 style="margin: 0 0 20px; color: #ffffff; font-size: 42px; font-weight: 300; letter-spacing: 2px; font-family: Georgia, 'Times New Roman', serif; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
              Estas Invitado/a
            </h1>
            <table role="presentation" width="80" cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td style="border-top: 1px solid rgba(255,255,255,0.6); padding: 20px 0 0;"></td>
              </tr>
            </table>
            <p style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 300; letter-spacing: 1px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
              {{{COUPLE_NAMES}}}
            </p>
          </td>
        </tr>
      </table>

      <!-- Main Content -->
      <div style="padding: 50px 40px; background-color: #ffffff;">
        <p style="margin: 0 0 25px; color: #2d3748; font-size: 18px; line-height: 1.6;">
          Querido/a {{{GUEST_NAME}}},
        </p>

        <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.8;">
          Con mucha alegria te invitamos a celebrar el dia de nuestra boda con nosotros!
        </p>

        <p style="margin: 0 0 30px; color: #4a5568; font-size: 16px; line-height: 1.8;">
          {{{PERSONAL_MESSAGE}}}
        </p>

        <!-- Wedding Details Card -->
        <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border-left: 4px solid #667eea; padding: 30px; margin: 40px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <p style="margin: 0 0 20px; color: #4a5568; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            Detalles de la Boda
          </p>
          <div style="margin: 0 0 15px;">
            <span style="color: #667eea; font-size: 16px;">&#x1F4C5;</span>
            <span style="color: #2d3748; font-size: 16px; margin-left: 10px; font-weight: 500;">{{{WEDDING_DATE}}}</span>
          </div>
          <div style="margin: 0 0 15px;">
            <span style="color: #667eea; font-size: 16px;">&#x1F4CD;</span>
            <span style="color: #2d3748; font-size: 16px; margin-left: 10px; font-weight: 500;">{{{VENUE_NAME}}}</span>
          </div>
          <div style="margin-left: 30px;">
            <span style="color: #718096; font-size: 14px;">{{{VENUE_ADDRESS}}}</span>
          </div>
        </div>

        <!-- Invitation Code Card -->
        <div style="background: #f7fafc; border-radius: 8px; padding: 25px; margin: 40px 0; text-align: center;">
          <p style="margin: 0 0 15px; color: #4a5568; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            Tu Codigo de Invitacion
          </p>
          <div style="margin: 0 0 15px;">
            <span style="display: inline-block; background: #ffffff; padding: 14px 24px; border-radius: 8px; font-size: 28px; font-weight: 700; color: #667eea; letter-spacing: 3px; font-family: 'Courier New', monospace; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              {{{INVITE_CODE}}}
            </span>
          </div>
          <p style="margin: 0; color: #718096; font-size: 13px;">
            Usa este codigo para confirmar tu asistencia en nuestro sitio web
          </p>
        </div>

        <!-- RSVP Button -->
        <div style="text-align: center; margin: 45px 0;">
          <a href="{{{RSVP_URL}}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 18px 50px; border-radius: 50px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);">
            Confirmar Ahora
          </a>
        </div>

        <!-- Link Fallback -->
        <p style="margin: 40px 0 0; color: #a0aec0; font-size: 12px; line-height: 1.6; text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          Si el boton no funciona, copia este enlace:<br>
          <a href="{{{RSVP_URL}}}" style="color: #667eea; text-decoration: none; word-break: break-all; font-size: 11px;">{{{RSVP_URL}}}</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); padding: 40px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 15px; color: #2d3748; font-size: 18px; font-weight: 500;">
          No podemos esperar para celebrar contigo!
        </p>
        <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
          {{{COUPLE_NAMES}}}
        </p>
      </div>
    </div>
  </body>
</html>`;

const rsvpNotificationHtmlEs = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nueva Confirmacion</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
          {{{STATUS_EMOJI}}} Nueva Confirmacion
        </h1>
      </div>

      <!-- Main Content -->
      <div style="padding: 40px;">

        <!-- Status Badge -->
        <div style="text-align: center; margin-bottom: 30px;">
          <span style="display: inline-block; background-color: {{{STATUS_COLOR}}}; color: #ffffff; padding: 12px 24px; border-radius: 50px; font-size: 18px; font-weight: 600;">
            {{{STATUS}}}
          </span>
        </div>

        <!-- Guest Details Card -->
        <div style="background: #f7fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Invitado(s)</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="color: #2d3748; font-size: 18px; font-weight: 600;">{{{GUEST_NAMES}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Correo(s)</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="color: #4a5568; font-size: 14px;">{{{GUEST_EMAILS}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Codigo de Invitacion</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="display: inline-block; background: #edf2f7; padding: 8px 16px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 16px; font-weight: 600; color: #667eea; letter-spacing: 2px;">{{{INVITE_CODE}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Enviado el</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0;">
                <span style="color: #4a5568; font-size: 14px;">{{{SUBMITTED_AT}}}</span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Dietary Restrictions -->
        <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; color: #92400e; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
            Restricciones Alimentarias
          </p>
          <p style="margin: 0; color: #78350f; font-size: 15px; line-height: 1.6;">
            {{{DIETARY_RESTRICTIONS}}}
          </p>
        </div>

        <!-- Guest Count Summary -->
        <div style="background: #f0fff4; border: 1px solid #68d391; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="margin: 0; color: #276749; font-size: 14px;">
            {{{GUEST_COUNT}}} invitado(s) - {{{STATUS}}}
          </p>
        </div>

      </div>

      <!-- Footer -->
      <div style="background: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #718096; font-size: 13px;">
          Esta es una notificacion automatica de tu sitio web de boda.
        </p>
      </div>
    </div>
  </body>
</html>`;

const giftNotificationHtmlEs = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nuevo Regalo Recibido</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); padding: 40px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
          {{{GIFT_EMOJI}}} Nuevo Regalo Recibido!
        </h1>
      </div>

      <!-- Main Content -->
      <div style="padding: 40px;">

        <!-- Amount Badge -->
        <div style="text-align: center; margin-bottom: 30px;">
          <span style="display: inline-block; background-color: #48bb78; color: #ffffff; padding: 16px 32px; border-radius: 50px; font-size: 24px; font-weight: 700;">
            {{{AMOUNT}}}
          </span>
        </div>

        <!-- Gift Details Card -->
        <div style="background: #f7fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Tipo de Regalo</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="color: #2d3748; font-size: 18px; font-weight: 600;">{{{GIFT_EMOJI}}} {{{GIFT_TYPE}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Nombre del Donante</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="color: #2d3748; font-size: 16px;">{{{DONOR_NAME}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Correo del Donante</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="color: #4a5568; font-size: 14px;">{{{DONOR_EMAIL}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Recibido el</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0;">
                <span style="color: #4a5568; font-size: 14px;">{{{SUBMITTED_AT}}}</span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Matched Guest -->
        <div style="background: #ebf8ff; border: 1px solid #90cdf4; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; color: #2b6cb0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
            Invitado Asociado
          </p>
          <p style="margin: 0; color: #2c5282; font-size: 16px; font-weight: 600;">
            {{{MATCHED_GUEST}}}
          </p>
        </div>

        <!-- Transaction ID -->
        <div style="text-align: center; padding: 16px; background: #f7fafc; border-radius: 8px;">
          <p style="margin: 0; color: #718096; font-size: 12px;">
            ID de Transaccion: <code style="background: #edf2f7; padding: 2px 6px; border-radius: 4px;">{{{CHARGE_ID}}}</code>
          </p>
        </div>

      </div>

      <!-- Footer -->
      <div style="background: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #718096; font-size: 13px;">
          Esta es una notificacion automatica de tu sitio web de boda.
        </p>
      </div>
    </div>
  </body>
</html>`;

const activitiesInvitationHtmlEs = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Que Hacer - Boda de {{{COUPLE_NAMES}}}</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

      <!-- Hero Section with Background Image -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
        <tr>
          <td style="background: linear-gradient(135deg, rgba(14, 165, 233, 0.88) 0%, rgba(59, 130, 246, 0.88) 100%), url({{{BACKGROUND_IMAGE_URL}}}) center/cover; padding: 70px 40px; text-align: center;">
            <h1 style="margin: 0 0 20px; color: #ffffff; font-size: 42px; font-weight: 300; letter-spacing: 2px; font-family: Georgia, 'Times New Roman', serif; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
              Que Hacer
            </h1>
            <table role="presentation" width="80" cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td style="border-top: 1px solid rgba(255,255,255,0.6); padding: 20px 0 0;"></td>
              </tr>
            </table>
            <p style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 300; letter-spacing: 1px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
              Nuestros Lugares Favoritos para Visitar
            </p>
          </td>
        </tr>
      </table>

      <!-- Main Content -->
      <div style="padding: 50px 40px; background-color: #ffffff;">
        <p style="margin: 0 0 25px; color: #2d3748; font-size: 18px; line-height: 1.6;">
          Querido/a {{{GUEST_NAME}}},
        </p>

        <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.8;">
          Muchas gracias por confirmar tu asistencia a nuestra boda! Estamos muy emocionados de celebrar contigo.
        </p>

        <p style="margin: 0 0 30px; color: #4a5568; font-size: 16px; line-height: 1.8;">
          Para ayudarte a aprovechar al maximo tu viaje, hemos preparado una guia con nuestros lugares favoritos en la zona. Tambien puedes decirnos que lugares piensas visitar y ver quien mas ira!
        </p>

        <!-- Feature Highlights -->
        <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 25px; margin: 30px 0;">
          <p style="margin: 0 0 15px; color: #0369a1; font-size: 15px; font-weight: 600;">
            Lo que puedes hacer:
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
            <tr>
              <td style="padding: 8px 0; color: #4a5568; font-size: 14px; vertical-align: top;">
                <span style="color: #0ea5e9; font-size: 18px; margin-right: 10px;">&#x1F5FA;&#xFE0F;</span>
                Explora nuestras playas, restaurantes y atracciones favoritas
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #4a5568; font-size: 14px; vertical-align: top;">
                <span style="color: #0ea5e9; font-size: 18px; margin-right: 10px;">&#x1F440;</span>
                Ve que invitados planean visitar los mismos lugares
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #4a5568; font-size: 14px; vertical-align: top;">
                <span style="color: #0ea5e9; font-size: 18px; margin-right: 10px;">&#x2728;</span>
                Marca las actividades que te interesan
              </td>
            </tr>
          </table>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 45px 0;">
          <a href="{{{THINGS_TO_DO_URL}}}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 18px 50px; border-radius: 50px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 6px 20px rgba(14, 165, 233, 0.4);">
            Ver Actividades
          </a>
        </div>

        <!-- Invite Code Reminder -->
        <div style="background: #f7fafc; border-left: 4px solid #0ea5e9; padding: 20px; margin: 40px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0 0 10px; color: #4a5568; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            Tu Codigo de Invitacion
          </p>
          <p style="margin: 0 0 10px; font-size: 24px; font-weight: 700; color: #0ea5e9; letter-spacing: 2px; font-family: 'Courier New', monospace;">
            {{{INVITE_CODE}}}
          </p>
          <p style="margin: 0; color: #718096; font-size: 13px;">
            Tus actividades estaran vinculadas a tu codigo de invitacion - no necesitas iniciar sesion!
          </p>
        </div>

        <!-- Link Fallback -->
        <p style="margin: 40px 0 0; color: #a0aec0; font-size: 12px; line-height: 1.6; text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          Enlace directo (copia si el boton no funciona):<br>
          <a href="{{{THINGS_TO_DO_URL}}}" style="color: #0ea5e9; text-decoration: none; word-break: break-all; font-size: 11px;">{{{THINGS_TO_DO_URL}}}</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); padding: 40px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 15px; color: #2d3748; font-size: 18px; font-weight: 500;">
          No podemos esperar para verte ahi!
        </p>
        <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
          {{{COUPLE_NAMES}}}
        </p>
      </div>
    </div>
  </body>
</html>`;

const eventInvitationHtmlEs = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{{EVENT_NAME}}} - {{{COUPLE_NAMES}}}</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

      <!-- Hero Section with Background Image -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
        <tr>
          <td style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.92) 0%, rgba(118, 75, 162, 0.92) 100%), url({{{BACKGROUND_IMAGE_URL}}}) center/cover; padding: 80px 40px; text-align: center;">
            <h1 style="margin: 0 0 20px; color: #ffffff; font-size: 36px; font-weight: 300; letter-spacing: 2px; font-family: Georgia, 'Times New Roman', serif; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
              Estas Invitado/a
            </h1>
            <table role="presentation" width="80" cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td style="border-top: 1px solid rgba(255,255,255,0.6); padding: 20px 0 0;"></td>
              </tr>
            </table>
            <p style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 400; letter-spacing: 1px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
              {{{EVENT_NAME}}}
            </p>
            <p style="margin: 15px 0 0; color: rgba(255,255,255,0.98); font-size: 16px; font-weight: 300; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">
              Organizado por {{{COUPLE_NAMES}}}
            </p>
          </td>
        </tr>
      </table>

      <!-- Main Content -->
      <div style="padding: 50px 40px; background-color: #ffffff;">
        <p style="margin: 0 0 25px; color: #2d3748; font-size: 18px; line-height: 1.6;">
          Querido/a {{{GUEST_NAME}}},
        </p>

        <p style="margin: 0 0 30px; color: #4a5568; font-size: 16px; line-height: 1.8;">
          {{{EVENT_DESCRIPTION}}}
        </p>

        <!-- Event Details Card -->
        <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border-left: 4px solid #667eea; padding: 30px; margin: 40px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <p style="margin: 0 0 20px; color: #4a5568; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            Detalles del Evento
          </p>
          <div style="margin: 0 0 15px;">
            <span style="color: #667eea; font-size: 16px;">&#x1F4C5;</span>
            <span style="color: #2d3748; font-size: 16px; margin-left: 10px; font-weight: 500;">{{{EVENT_DATE}}}</span>
          </div>
          <div style="margin: 0 0 15px;">
            <span style="color: #667eea; font-size: 16px;">&#x1F550;</span>
            <span style="color: #2d3748; font-size: 16px; margin-left: 10px; font-weight: 500;">{{{EVENT_TIME}}}</span>
          </div>
          <div style="margin: 0 0 5px;">
            <span style="color: #667eea; font-size: 16px;">&#x1F4CD;</span>
            <span style="color: #2d3748; font-size: 16px; margin-left: 10px; font-weight: 500;">{{{LOCATION_NAME}}}</span>
          </div>
          <div style="margin-left: 30px;">
            <span style="color: #718096; font-size: 14px;">{{{LOCATION_ADDRESS}}}</span>
          </div>
        </div>

        <!-- Invitation Code Card -->
        <div style="background: #f7fafc; border-radius: 8px; padding: 25px; margin: 40px 0; text-align: center;">
          <p style="margin: 0 0 15px; color: #4a5568; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            Tu Codigo de Invitacion
          </p>
          <div style="margin: 0 0 15px;">
            <span style="display: inline-block; background: #ffffff; padding: 14px 24px; border-radius: 8px; font-size: 28px; font-weight: 700; color: #667eea; letter-spacing: 3px; font-family: 'Courier New', monospace; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              {{{INVITE_CODE}}}
            </span>
          </div>
          <p style="margin: 0; color: #718096; font-size: 13px;">
            Usa este codigo para confirmar tu asistencia
          </p>
        </div>

        <!-- RSVP Button -->
        <div style="text-align: center; margin: 45px 0;">
          <a href="{{{RSVP_URL}}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 18px 50px; border-radius: 50px; font-size: 16px; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);">
            Confirmar Ahora
          </a>
        </div>

        <!-- Link Fallback -->
        <p style="margin: 40px 0 0; color: #a0aec0; font-size: 12px; line-height: 1.6; text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          Si el boton no funciona, copia este enlace:<br>
          <a href="{{{RSVP_URL}}}" style="color: #667eea; text-decoration: none; word-break: break-all; font-size: 11px;">{{{RSVP_URL}}}</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); padding: 40px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 15px; color: #2d3748; font-size: 18px; font-weight: 500;">
          Esperamos verte ahi!
        </p>
        <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
          {{{COUPLE_NAMES}}}
        </p>
      </div>
    </div>
  </body>
</html>`;

const eventRsvpNotificationHtmlEs = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmacion de Evento - {{{EVENT_NAME}}}</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
        <h1 style="margin: 0 0 10px; color: #ffffff; font-size: 24px; font-weight: 600;">
          {{{STATUS_EMOJI}}} Confirmacion de Evento
        </h1>
        <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 18px;">
          {{{EVENT_NAME}}}
        </p>
      </div>

      <!-- Main Content -->
      <div style="padding: 40px;">

        <!-- Status Badge -->
        <div style="text-align: center; margin-bottom: 30px;">
          <span style="display: inline-block; background-color: {{{STATUS_COLOR}}}; color: #ffffff; padding: 12px 24px; border-radius: 50px; font-size: 18px; font-weight: 600;">
            {{{STATUS}}}
          </span>
        </div>

        <!-- Guest Details Card -->
        <div style="background: #f7fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Invitado</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="color: #2d3748; font-size: 18px; font-weight: 600;">{{{GUEST_NAME}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Correo</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="color: #4a5568; font-size: 14px;">{{{GUEST_EMAIL}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Evento</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="color: #2d3748; font-size: 16px; font-weight: 500;">{{{EVENT_NAME}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Codigo de Invitacion</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 16px;">
                <span style="display: inline-block; background: #edf2f7; padding: 8px 16px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 16px; font-weight: 600; color: #667eea; letter-spacing: 2px;">{{{INVITE_CODE}}}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Enviado el</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 0;">
                <span style="color: #4a5568; font-size: 14px;">{{{SUBMITTED_AT}}}</span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Response Summary -->
        <div style="background: #f0fff4; border: 1px solid #68d391; border-radius: 8px; padding: 16px; text-align: center;">
          <p style="margin: 0; color: #276749; font-size: 14px;">
            El invitado ha respondido {{{STATUS}}} para {{{EVENT_NAME}}}
          </p>
        </div>

      </div>

      <!-- Footer -->
      <div style="background: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #718096; font-size: 13px;">
          Esta es una notificacion automatica de tu sitio web de boda.
        </p>
      </div>
    </div>
  </body>
</html>`;

const hotelInterestNotificationHtmlEs = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interes en Hotel: {{{GUEST_NAME}}}</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
          &#x1F3E8; Nuevo Interes en Hotel
        </h1>
      </div>

      <!-- Main Content -->
      <div style="padding: 40px; background-color: #ffffff;">
        <p style="margin: 0 0 20px; color: #2d3748; font-size: 16px; line-height: 1.6;">
          Un invitado ha expresado interes en un hotel para tu boda.
        </p>

        <!-- Guest Information -->
        <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <h2 style="margin: 0 0 15px; color: #1e293b; font-size: 18px; font-weight: 600;">
            Informacion del Invitado
          </h2>
          <p style="margin: 0 0 8px; color: #475569; font-size: 14px;">
            <strong>Nombre:</strong> {{{GUEST_NAME}}}
          </p>
          <p style="margin: 0 0 8px; color: #475569; font-size: 14px;">
            <strong>Correo:</strong> <a href="mailto:{{{GUEST_EMAIL}}}" style="color: #6366f1; text-decoration: none;">{{{GUEST_EMAIL}}}</a>
          </p>
          <p style="margin: 0 0 8px; color: #475569; font-size: 14px;">
            <strong>Telefono:</strong> <a href="tel:{{{GUEST_PHONE}}}" style="color: #6366f1; text-decoration: none;">{{{GUEST_PHONE}}}</a>
          </p>
        </div>

        <!-- Hotel Information -->
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px;">
          <h2 style="margin: 0 0 15px; color: #78350f; font-size: 18px; font-weight: 600;">
            Interes en Hotel
          </h2>
          <p style="margin: 0 0 8px; color: #92400e; font-size: 14px;">
            <strong>Hotel:</strong> {{{HOTEL_NAME}}}
          </p>
          <p style="margin: 0 0 8px; color: #92400e; font-size: 14px;">
            <strong>Direccion:</strong> {{{HOTEL_ADDRESS}}}
          </p>
          <p style="margin: 0 0 8px; color: #92400e; font-size: 14px;">
            <strong>Fechas:</strong> {{{CHECK_IN_DATE}}} - {{{CHECK_OUT_DATE}}}
          </p>
          <p style="margin: 0 0 8px; color: #92400e; font-size: 14px;">
            <strong>Numero de Habitaciones:</strong> {{{NUMBER_OF_ROOMS}}}
          </p>
          <p style="margin: 0 0 8px; color: #92400e; font-size: 14px;">
            <strong>Notas:</strong> {{{NOTES}}}
          </p>
        </div>

        <!-- Call to Action -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{{ADMIN_URL}}}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(99, 102, 241, 0.25);">
            Ver Detalles del Invitado
          </a>
        </div>

        <!-- Footer Note -->
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
            Esta notificacion fue enviada porque {{{GUEST_NAME}}} marco su interes en {{{HOTEL_NAME}}} en tu sitio web de boda.
          </p>
        </div>
      </div>

      <!-- Email Footer -->
      <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #94a3b8; font-size: 12px;">
          Notificacion de Administrador del Sitio Web de Boda
        </p>
      </div>
    </div>
  </body>
</html>`;

const calendarInviteHtmlEs = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reserva la Fecha - Boda de {{{COUPLE_NAMES}}}</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

      <!-- Header -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
        <h1 style="margin: 0 0 10px; color: #ffffff; font-size: 28px; font-weight: 600;">
          &#x1F4C5; Reserva la Fecha
        </h1>
        <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 18px;">
          {{{COUPLE_NAMES}}}
        </p>
      </div>

      <!-- Main Content -->
      <div style="padding: 40px;">
        <p style="margin: 0 0 25px; color: #2d3748; font-size: 18px; line-height: 1.6;">
          Querido/a {{{GUEST_NAME}}},
        </p>

        <p style="margin: 0 0 30px; color: #4a5568; font-size: 16px; line-height: 1.8;">
          Adjuntamos una invitacion de calendario para <strong>{{{EVENT_NAME}}}</strong>. Agregala a tu calendario para que no te lo pierdas!
        </p>

        <!-- Event Details Card -->
        <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border-left: 4px solid #667eea; padding: 30px; margin: 40px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <p style="margin: 0 0 20px; color: #4a5568; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            Detalles del Evento
          </p>
          <div style="margin: 0 0 15px;">
            <span style="color: #667eea; font-size: 16px;">&#x1F4C5;</span>
            <span style="color: #2d3748; font-size: 16px; margin-left: 10px; font-weight: 500;">{{{EVENT_DATE}}}</span>
          </div>
          <div style="margin: 0 0 15px;">
            <span style="color: #667eea; font-size: 16px;">&#x1F550;</span>
            <span style="color: #2d3748; font-size: 16px; margin-left: 10px; font-weight: 500;">{{{EVENT_TIME}}}</span>
          </div>
          <div style="margin: 0 0 5px;">
            <span style="color: #667eea; font-size: 16px;">&#x1F4CD;</span>
            <span style="color: #2d3748; font-size: 16px; margin-left: 10px; font-weight: 500;">{{{VENUE_NAME}}}</span>
          </div>
          <div style="margin-left: 30px;">
            <span style="color: #718096; font-size: 14px;">{{{VENUE_ADDRESS}}}</span>
          </div>
        </div>

        <p style="margin: 0; color: #718096; font-size: 14px; text-align: center;">
          Se adjunta un archivo de calendario .ics a este correo.
        </p>
      </div>

      <!-- Footer -->
      <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); padding: 40px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 15px; color: #2d3748; font-size: 18px; font-weight: 500;">
          No podemos esperar para celebrar contigo!
        </p>
        <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
          {{{COUPLE_NAMES}}}
        </p>
      </div>
    </div>
  </body>
</html>`;

const rsvpReminderHtmlEs = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recordatorio de Confirmacion - Boda de {{{COUPLE_NAMES}}}</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

      <!-- Hero Section -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
        <tr>
          <td style="background: linear-gradient(135deg, rgba(237, 137, 54, 0.92) 0%, rgba(221, 107, 32, 0.92) 100%); padding: 60px 40px; text-align: center;">
            <h1 style="margin: 0 0 15px; color: #ffffff; font-size: 36px; font-weight: 300; letter-spacing: 2px; font-family: Georgia, 'Times New Roman', serif; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
              Recordatorio
            </h1>
            <table role="presentation" width="80" cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td style="border-top: 1px solid rgba(255,255,255,0.6); padding: 15px 0 0;"></td>
              </tr>
            </table>
            <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 300; letter-spacing: 1px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
              {{{DAYS_REMAINING}}} dias para confirmar
            </p>
          </td>
        </tr>
      </table>

      <!-- Main Content -->
      <div style="padding: 50px 40px; background-color: #ffffff;">
        <p style="margin: 0 0 25px; color: #2d3748; font-size: 18px; line-height: 1.6;">
          Querido/a {{{GUEST_NAME}}},
        </p>

        <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.8;">
          Aun no hemos recibido tu respuesta! Nos encantaria saber si puedes acompanarnos en la boda de {{{COUPLE_NAMES}}}.
        </p>

        <!-- Deadline Card -->
        <div style="background: linear-gradient(135deg, #fffaf0 0%, #feebc8 100%); border-left: 4px solid #ed8936; padding: 25px; margin: 30px 0; border-radius: 8px;">
          <p style="margin: 0 0 15px; color: #744210; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            Fechas Importantes
          </p>
          <div style="margin: 0 0 12px;">
            <span style="color: #ed8936; font-size: 16px;">&#x1F4C5;</span>
            <span style="color: #2d3748; font-size: 16px; margin-left: 10px;">Boda: <strong>{{{WEDDING_DATE}}}</strong></span>
          </div>
          <div>
            <span style="color: #ed8936; font-size: 16px;">&#x23F0;</span>
            <span style="color: #2d3748; font-size: 16px; margin-left: 10px;">Fecha limite: <strong>{{{RSVP_DEADLINE}}}</strong></span>
          </div>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 40px 0;">
          <a href="{{{RSVP_URL}}}" style="display: inline-block; background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%); color: #ffffff; padding: 16px 48px; font-size: 18px; font-weight: 600; text-decoration: none; border-radius: 50px; box-shadow: 0 4px 15px rgba(237,137,54,0.4); letter-spacing: 1px;">
            Confirmar Ahora
          </a>
        </div>

        <!-- Invitation Code -->
        <div style="background: #f7fafc; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
          <p style="margin: 0 0 10px; color: #4a5568; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
            Tu Codigo de Invitacion
          </p>
          <span style="display: inline-block; background: #ffffff; padding: 10px 20px; border-radius: 8px; font-size: 24px; font-weight: 700; color: #ed8936; letter-spacing: 3px; font-family: 'Courier New', monospace; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            {{{INVITE_CODE}}}
          </span>
        </div>

        <p style="margin: 30px 0 0; color: #718096; font-size: 14px; line-height: 1.6; text-align: center;">
          Realmente esperamos que puedas asistir!
        </p>
      </div>

      <!-- Footer -->
      <div style="padding: 30px 40px; background-color: #f7fafc; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 8px; color: #4a5568; font-size: 14px; line-height: 1.6;">
          Con carino,
        </p>
        <p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
          {{{COUPLE_NAMES}}}
        </p>
      </div>
    </div>
  </body>
</html>`;

const adminSummaryHtmlEs = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resumen de Invitados - Boda de {{{COUPLE_NAMES}}}</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

      <!-- Header -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
        <tr>
          <td style="background: linear-gradient(135deg, rgba(56, 178, 172, 0.92) 0%, rgba(49, 151, 149, 0.92) 100%); padding: 50px 40px; text-align: center;">
            <h1 style="margin: 0 0 10px; color: #ffffff; font-size: 30px; font-weight: 300; letter-spacing: 2px; font-family: Georgia, 'Times New Roman', serif;">
              Resumen de Invitados
            </h1>
            <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px;">
              {{{REPORT_DATE}}}
            </p>
          </td>
        </tr>
      </table>

      <!-- Stats Grid -->
      <div style="padding: 40px;">
        <p style="margin: 0 0 20px; color: #2d3748; font-size: 18px; font-weight: 600;">
          Resumen Lista A
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding: 12px 16px; background: #f7fafc; border-radius: 8px;">
              <span style="color: #4a5568; font-size: 14px;">Total Invitados Lista A</span>
            </td>
            <td style="padding: 12px 16px; background: #f7fafc; border-radius: 8px; text-align: right;">
              <strong style="color: #2d3748; font-size: 18px;">{{{TOTAL_A_LIST}}}</strong>
            </td>
          </tr>
          <tr><td colspan="2" style="height: 8px;"></td></tr>
          <tr>
            <td style="padding: 12px 16px; background: #f0fff4; border-radius: 8px;">
              <span style="color: #276749; font-size: 14px;">&#x2705; Invitados</span>
            </td>
            <td style="padding: 12px 16px; background: #f0fff4; border-radius: 8px; text-align: right;">
              <strong style="color: #276749; font-size: 18px;">{{{A_LIST_INVITED}}}</strong>
            </td>
          </tr>
          <tr><td colspan="2" style="height: 8px;"></td></tr>
          <tr>
            <td style="padding: 12px 16px; background: #fff5f5; border-radius: 8px;">
              <span style="color: #9b2c2c; font-size: 14px;">&#x274C; Sin Invitar</span>
            </td>
            <td style="padding: 12px 16px; background: #fff5f5; border-radius: 8px; text-align: right;">
              <strong style="color: #9b2c2c; font-size: 18px;">{{{A_LIST_NOT_INVITED}}}</strong>
            </td>
          </tr>
        </table>

        <!-- RSVP Breakdown -->
        <p style="margin: 30px 0 15px; color: #2d3748; font-size: 18px; font-weight: 600;">
          Estado de Confirmacion (Invitados)
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding: 12px 16px; background: #fffff0; border-radius: 8px;">
              <span style="color: #744210; font-size: 14px;">&#x23F3; Pendiente</span>
            </td>
            <td style="padding: 12px 16px; background: #fffff0; border-radius: 8px; text-align: right;">
              <strong style="color: #744210; font-size: 18px;">{{{A_LIST_PENDING}}}</strong>
            </td>
          </tr>
          <tr><td colspan="2" style="height: 8px;"></td></tr>
          <tr>
            <td style="padding: 12px 16px; background: #f0fff4; border-radius: 8px;">
              <span style="color: #276749; font-size: 14px;">&#x1F389; Asistiran</span>
            </td>
            <td style="padding: 12px 16px; background: #f0fff4; border-radius: 8px; text-align: right;">
              <strong style="color: #276749; font-size: 18px;">{{{A_LIST_YES}}}</strong>
            </td>
          </tr>
          <tr><td colspan="2" style="height: 8px;"></td></tr>
          <tr>
            <td style="padding: 12px 16px; background: #fff5f5; border-radius: 8px;">
              <span style="color: #9b2c2c; font-size: 14px;">&#x1F614; Declinaron</span>
            </td>
            <td style="padding: 12px 16px; background: #fff5f5; border-radius: 8px; text-align: right;">
              <strong style="color: #9b2c2c; font-size: 18px;">{{{A_LIST_NO}}}</strong>
            </td>
          </tr>
        </table>

        <!-- Uninvited Guests -->
        <div style="margin-top: 30px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="padding: 15px 20px; background: #fff5f5; border-bottom: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #9b2c2c; font-size: 14px; font-weight: 600;">
              Invitados Lista A Sin Invitar
            </p>
          </div>
          <div style="padding: 20px;">
            {{{UNINVITED_GUESTS}}}
          </div>
        </div>

        <!-- CTA -->
        <div style="text-align: center; margin: 35px 0 10px;">
          <a href="{{{ADMIN_URL}}}" style="display: inline-block; background: linear-gradient(135deg, #38b2ac 0%, #319795 100%); color: #ffffff; padding: 14px 40px; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 50px; box-shadow: 0 4px 15px rgba(56,178,172,0.4);">
            Ir al Panel de Administracion
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding: 25px 40px; background-color: #f7fafc; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #718096; font-size: 13px;">
          Este es un resumen automatico de la boda de {{{COUPLE_NAMES}}}.
        </p>
      </div>
    </div>
  </body>
</html>`;
