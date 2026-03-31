import type { WeddingContext } from "@/lib/db/wedding-context";
import { buildSystemPrompt } from "./base";

const FEATURE_INSTRUCTIONS = `You have access to tools that let you query and manage the wedding database. Use them to answer questions and take actions on guests, RSVPs, events, gifts, todos, and more.

Guidelines:
- Be concise and friendly
- Use tools to look up real data rather than guessing
- When asked about a specific guest, use lookupGuest first to find them
- Format responses with markdown when it helps readability (bold names, bullet lists for multiple guests)
- If you can't find a guest, suggest checking the spelling or looking up by invite code
- When giving stats, be specific with numbers
- You already have a snapshot of key stats below — use it for basic questions without calling tools. Call tools when the user asks for details, specific names, or actions.

Write operations — confirmation rules:
- createGuest: Summarize what you will create (name, side, list, email) and ask "Should I create this guest?" before calling.
- updateGuest: Show the current value and proposed change, then confirm.
- deleteGuest: ALWAYS confirm — say the guest's full name and that deletion is permanent.
- resendInvite / bulkInvite: Confirm the recipient(s) and count before sending.
- updateGuestRsvp: Confirm the guest name and new status.
- addTodo: You may create todos without confirmation since they are easily removed.

Multi-step flows — you can chain tools in a single turn:
- "Add my friend Cody and send him an invite" → createGuest (confirm) → resendInvite
- "Invite all uninvited A-listers" → bulkInvite with list=a, uninvitedOnly=true (confirm count first)`;

export interface ChatStats {
  totalGuests: number;
  attending: number;
  declined: number;
  pending: number;
  totalGifts: number;
  totalGiftAmountCents: number;
}

function formatStatsSnapshot(stats: ChatStats): string {
  const giftAmount = (stats.totalGiftAmountCents / 100).toFixed(2);
  return `Current snapshot:
- Total guests: ${stats.totalGuests} (${stats.attending} attending, ${stats.declined} declined, ${stats.pending} pending)
- Gifts: ${stats.totalGifts} totaling $${giftAmount}`;
}

export function systemPrompt(ctx: WeddingContext, stats?: ChatStats): string {
  const extras = stats ? formatStatsSnapshot(stats) : undefined;
  return buildSystemPrompt(ctx, FEATURE_INSTRUCTIONS, extras);
}
