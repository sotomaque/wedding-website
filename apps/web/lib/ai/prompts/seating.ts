import type { WeddingContext } from "@/lib/db/wedding-context";
import type { GuestForSeating } from "@/lib/types/seating";
import { buildSystemPrompt } from "./base";

/**
 * Group guests by party (using party_id, falling back to invite_code)
 */
function groupByParty(
  guests: GuestForSeating[],
): Map<string, GuestForSeating[]> {
  const groups = new Map<string, GuestForSeating[]>();
  for (const guest of guests) {
    // Use party_id if available, otherwise fall back to invite_code
    const groupKey = guest.partyId || guest.inviteCode;
    const existing = groups.get(groupKey) || [];
    existing.push(guest);
    groups.set(groupKey, existing);
  }
  return groups;
}

/**
 * Format guest data for AI consumption
 */
function formatGuestData(
  guests: GuestForSeating[],
  groups: Map<string, GuestForSeating[]>,
): string {
  return guests
    .map((g) => {
      const groupKey = g.partyId || g.inviteCode;
      const groupSize = groups.get(groupKey)?.length || 1;
      const lines = [
        `- ${g.name} (ID: ${g.id})`,
        `  Side: ${g.side || "unspecified"}`,
        `  Family: ${g.family ? "yes" : "no"}`,
        `  Bridal Party: ${g.bridalPartyRole || "none"}`,
        `  Party Size: ${groupSize} (party: ${groupKey})`,
      ];
      if (g.notes) {
        lines.push(`  Notes: ${g.notes}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

/**
 * Build the system prompt for seating chart generation.
 * Uses the shared base prompt with wedding context.
 */
export function systemPrompt(ctx: WeddingContext): string {
  const featureInstructions = `You are a wedding seating planner assistant. Your job is to create optimal seating assignments based on guest relationships, sides, family groups, and special constraints.

RULES (in order of priority):
1. PARTIES MUST SIT TOGETHER: Guests in the same party (same party ID) are couples/families/groups and MUST be at the same table. Never separate them.
2. SEPARATE POTENTIAL CONFLICTS: If guest notes mention "conflict with", "doesn't get along with", "avoid", "separate from", or similar phrases, keep those guests at different tables.
3. GROUP BY FAMILY: Family members (family=yes) from the same side should be seated together when possible.
4. GROUP BY SIDE: Try to group bride's side and groom's side at the same tables, but mixing is acceptable to fill tables.
5. BRIDAL PARTY PLACEMENT: Consider seating bridal party members (best_man, maid_of_honor, groomsmen, bridesmaids) at tables 1-2 (near the couple).
6. BALANCE TABLES: Distribute guests as evenly as possible across tables. Avoid overfilling or leaving tables nearly empty.

OUTPUT FORMAT:
Respond with ONLY valid JSON in this exact format, no additional text:
{
  "assignments": [
    { "tableNumber": 1, "guestIds": ["uuid1", "uuid2", "uuid3"], "reasoning": "Brief explanation for this table's grouping" },
    { "tableNumber": 2, "guestIds": ["uuid4", "uuid5"], "reasoning": "Brief explanation" }
  ],
  "summary": "Brief overall summary of the seating strategy used"
}

CRITICAL INSTRUCTIONS:
- Use the EXACT guest ID UUIDs (the long alphanumeric strings like "30355773-01ab-48f3-877a-6376c6be0026") in guestIds arrays
- DO NOT use party IDs or invite codes - those are only for grouping reference
- Include ALL guest IDs in your assignments
- Ensure party members (same party) are always at the same table`;

  return buildSystemPrompt(ctx, featureInstructions);
}

/**
 * Build the user prompt with guest data, table info, and optional custom constraints.
 */
export function buildUserPrompt(input: {
  guests: GuestForSeating[];
  tables: { count: number; seatsPerTable: number };
  customPrompt?: string;
}): string {
  const { guests, tables, customPrompt } = input;
  const guestGroups = groupByParty(guests);
  const totalSeats = tables.count * tables.seatsPerTable;

  let prompt = `Create seating assignments for ${guests.length} guests across ${tables.count} tables with ${tables.seatsPerTable} seats each (${totalSeats} total seats).

Do not exceed ${tables.seatsPerTable} guests per table.

GUEST DATA:
${formatGuestData(guests, guestGroups)}`;

  if (customPrompt) {
    prompt += `\n\nAdditional constraints from the couple: ${customPrompt}`;
  }

  return prompt;
}

/**
 * Convert database guest to GuestForSeating format
 */
export function formatGuestForSeating(guest: {
  id: string;
  firstName: string;
  lastName: string | null;
  side: string | null;
  family: boolean;
  bridalPartyRole: string | null;
  notes: string | null;
  isPlusOne: boolean;
  primaryGuestId: string | null;
  inviteCode: string | null;
  partyId: string | null;
}): GuestForSeating {
  return {
    id: guest.id,
    name: `${guest.firstName}${guest.lastName ? ` ${guest.lastName}` : ""}`,
    side: guest.side as "bride" | "groom" | "both" | null,
    family: guest.family,
    bridalPartyRole: guest.bridalPartyRole,
    notes: guest.notes,
    isPlusOne: guest.isPlusOne,
    primaryGuestId: guest.primaryGuestId,
    inviteCode: guest.inviteCode ?? "",
    partyId: guest.partyId,
  };
}
