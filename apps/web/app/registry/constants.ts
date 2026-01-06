import { env } from "@/env";

export const REGISTRY_CONTENT = {
  title: "Gift Registry",
  subtitle:
    "Your presence is the greatest gift, but if you wish to celebrate with us...",
  intro:
    "We're grateful to have everything we need to start our life together. If you'd like to give a gift, please consider contributing to one of these meaningful funds.",
  gifts: [
    {
      id: "future-babies",
      title: "Future Tiny Humans Fund",
      description:
        "We're not pregnant—just planners. Help us prepare for the chaos ahead.",
      image: "/registry/future-babies.jpg",
      stripeUrl: env.NEXT_PUBLIC_STRIPE_LINK_BABY_FUND,
      emoji: "👶",
    },
    {
      id: "honeymoon",
      title: "Send Us Somewhere Pretty",
      description:
        "Fund our first adventure as a married couple—drinks with little umbrellas included.",
      image: "/registry/honeymoon.jpg",
      stripeUrl: env.NEXT_PUBLIC_STRIPE_LINK_HONEYMOON,
      emoji: "✈️",
    },
    {
      id: "student-loans",
      title: "Bye Bye Student Loans",
      description: "Contribute to our 'Sallie Mae Freedom Fund'.",
      image: "/registry/student-loan-relief.jpg",
      stripeUrl: env.NEXT_PUBLIC_STRIPE_LINK_STUDENT_LOANS,
      emoji: "🎓",
    },
  ],
};

export type RegistryGift = (typeof REGISTRY_CONTENT.gifts)[number];
