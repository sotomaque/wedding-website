/**
 * Generate a random invite code for guests
 * Format: XXXX-XXXX (8 characters, uppercase letters and numbers)
 */
export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing characters (0, O, I, 1)
  let code = "";

  for (let i = 0; i < 8; i++) {
    if (i === 4) {
      code += "-";
    }
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}
