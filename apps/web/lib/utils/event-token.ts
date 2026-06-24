import { randomInt } from "node:crypto";

/**
 * Generate an unguessable, URL-safe token for an event's public RSVP link.
 *
 * Uses an unambiguous lowercase alphabet (no 0/1/i/l/o) for a clean URL like
 * `/{slug}/events/{token}`. 16 chars from a 31-symbol alphabet is ~79 bits.
 * Generated with a CSPRNG (node:crypto.randomInt) so the ~79 bits are real —
 * Math.random would have made the token predictable regardless of length.
 */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function generateEventToken(length = 16): string {
  let token = "";
  for (let i = 0; i < length; i++) {
    token += ALPHABET.charAt(randomInt(ALPHABET.length));
  }
  return token;
}
