import type { GuestForSeating } from "@/lib/types/seating";

/**
 * Group guests by invite code to identify couples/groups
 */
function groupByInviteCode(
  guests: GuestForSeating[],
): Map<string, GuestForSeating[]> {
  const groups = new Map<string, GuestForSeating[]>();
  for (const guest of guests) {
    const existing = groups.get(guest.inviteCode) || [];
    existing.push(guest);
    groups.set(guest.inviteCode, existing);
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
      const groupSize = groups.get(g.inviteCode)?.length || 1;
      const lines = [
        `- ${g.name} (ID: ${g.id})`,
        `  Side: ${g.side || "unspecified"}`,
        `  Family: ${g.family ? "yes" : "no"}`,
        `  Bridal Party: ${g.bridalPartyRole || "none"}`,
        `  Group Size: ${groupSize} (invite: ${g.inviteCode})`,
      ];
      if (g.notes) {
        lines.push(`  Notes: ${g.notes}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

/**
 * Build the AI prompt for seating chart generation
 */
export function buildSeatingPrompt(
  guests: GuestForSeating[],
  tablesCount: number,
  seatsPerTable: number,
): string {
  const guestGroups = groupByInviteCode(guests);
  const totalSeats = tablesCount * seatsPerTable;

  return `You are a wedding seating planner assistant. Create optimal seating assignments for ${guests.length} guests across ${tablesCount} tables with ${seatsPerTable} seats each (${totalSeats} total seats).

RULES (in order of priority):
1. COUPLES MUST SIT TOGETHER: Guests with the same invite code are couples/groups and MUST be at the same table. Never separate them.
2. SEPARATE POTENTIAL CONFLICTS: If guest notes mention "conflict with", "doesn't get along with", "avoid", "separate from", or similar phrases, keep those guests at different tables.
3. GROUP BY FAMILY: Family members (family=yes) from the same side should be seated together when possible.
4. GROUP BY SIDE: Try to group bride's side and groom's side at the same tables, but mixing is acceptable to fill tables.
5. BRIDAL PARTY PLACEMENT: Consider seating bridal party members (best_man, maid_of_honor, groomsmen, bridesmaids) at tables 1-2 (near the couple).
6. BALANCE TABLES: Distribute guests as evenly as possible across tables. Avoid overfilling or leaving tables nearly empty.

GUEST DATA:
${formatGuestData(guests, guestGroups)}

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
- DO NOT use invite codes (short codes like "54MN-GN92") - those are only for grouping reference
- Include ALL guest IDs in your assignments
- Do not exceed ${seatsPerTable} guests per table
- Ensure couples (same invite code) are always at the same table`;
}

/**
 * Convert database guest to GuestForSeating format
 */
export function formatGuestForSeating(guest: {
  id: string;
  first_name: string;
  last_name: string | null;
  side: "bride" | "groom" | "both" | null;
  family: boolean;
  bridal_party_role: string | null;
  notes: string | null;
  is_plus_one: boolean;
  primary_guest_id: string | null;
  invite_code: string;
}): GuestForSeating {
  return {
    id: guest.id,
    name: `${guest.first_name}${guest.last_name ? ` ${guest.last_name}` : ""}`,
    side: guest.side,
    family: guest.family,
    bridalPartyRole: guest.bridal_party_role,
    notes: guest.notes,
    isPlusOne: guest.is_plus_one,
    primaryGuestId: guest.primary_guest_id,
    inviteCode: guest.invite_code,
  };
}
