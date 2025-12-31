import { env } from "../env";

export const SITE_CONFIG = {
  email: env.NEXT_PUBLIC_RSVP_EMAIL,
  weddingDate: "2026-07-30",
  rsvpDeadline: "March 30th, 2026",
  couple: {
    name: "Helen & Enrique",
    firstNames: {
      person1: "Helen",
      person2: "Enrique",
    },
  },
};
