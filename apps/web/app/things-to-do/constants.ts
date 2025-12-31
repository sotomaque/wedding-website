// Types
export type RGBAColor = [number, number, number, number];
export type Coordinates = [number, number];

export interface Location {
  id: string;
  name: string;
  emoji: string;
  description: string;
  address: string;
  imageUrl: string;
  coordinates: Coordinates;
  color: RGBAColor;
}

export interface Venue {
  name: string;
  emoji: string;
  type: "ceremony" | "reception";
  coordinates: Coordinates;
  color: RGBAColor;
}

// Colors
const COLORS = {
  GREEN: [34, 197, 94, 255] as RGBAColor,
  BLUE: [59, 130, 246, 255] as RGBAColor,
  PINK: [236, 72, 153, 255] as RGBAColor,
  AMBER: [251, 191, 36, 255] as RGBAColor,
  SKY_BLUE: [14, 165, 233, 255] as RGBAColor,
  PURPLE: [168, 85, 247, 255] as RGBAColor,
} as const;

// Locations
export const LOCATIONS: Location[] = [
  {
    id: "balboa-park",
    name: "Balboa Park",
    emoji: "🌳",
    description:
      "One of our favorite spots for a lazy Sunday stroll. The gardens are stunning, and there's always something new to discover. Pro tip: grab coffee at the Japanese Friendship Garden!",
    address: "1549 El Prado, San Diego, CA",
    imageUrl: "/balboa.png",
    coordinates: [-117.1496, 32.7311],
    color: COLORS.GREEN,
  },
  {
    id: "la-jolla-cove",
    name: "La Jolla Cove",
    emoji: "🦭",
    description:
      "We love watching the sea lions here—they're hilarious! The views are breathtaking, especially at sunset. Walk along the coastal path and you might spot some seals too.",
    address: "500 Coast Blvd, La Jolla, CA",
    imageUrl: "/la-jolla-cove.webp",
    coordinates: [-117.2715, 32.8507],
    color: COLORS.BLUE,
  },
  {
    id: "little-italy",
    name: "Little Italy",
    emoji: "🇮🇹",
    description:
      "One of our favorite neighborhoods for an evening stroll. Amazing Italian restaurants, trendy cafes, and a wonderful Saturday farmers market. The vibe here is unbeatable!",
    address: "Little Italy, San Diego",
    imageUrl: "/little-italy.jpeg",
    coordinates: [-117.167, 32.7212],
    color: COLORS.PINK,
  },
  {
    id: "coronado-beach",
    name: "Coronado Beach",
    emoji: "🏖️",
    description:
      "Hands down our favorite beach in San Diego. The sand sparkles (really!), the water is perfect, and the Hotel del Coronado is such an iconic spot for a sunset cocktail.",
    address: "1500 Orange Ave, Coronado",
    imageUrl: "/coronado.webp",
    coordinates: [-117.1783, 32.6859],
    color: COLORS.AMBER,
  },
  {
    id: "del-mar-beach",
    name: "Del Mar Beach",
    emoji: "🌊",
    description:
      "One of the most beautiful beaches in Southern California! The wide sandy shores are perfect for long walks, and the beach town has such a charming, laid-back vibe. Great for sunset watching!",
    address: "Del Mar, CA",
    imageUrl: "/del-mar.jpg",
    coordinates: [-117.2652, 32.9595],
    color: COLORS.SKY_BLUE,
  },
  {
    id: "san-diego-zoo",
    name: "San Diego Zoo",
    emoji: "🦁",
    description:
      "World-famous for a reason! We never get tired of visiting. The pandas are adorable, and the aerial tram gives you amazing views. Plan for at least half a day here!",
    address: "2920 Zoo Drive, San Diego",
    imageUrl: "/sandiegozoo.jpg",
    coordinates: [-117.1509, 32.7347],
    color: COLORS.PURPLE,
  },
];

// Venues
export const IMMACULATA: Venue = {
  name: "The Immaculata",
  emoji: "⛪️",
  type: "ceremony",
  coordinates: [-117.1902, 32.7719],
  color: COLORS.PURPLE,
};

export const HEADQUARTERS: Venue = {
  name: "Headquarters at Seaport",
  emoji: "🍾",
  type: "reception",
  coordinates: [-117.1689, 32.7091],
  color: COLORS.BLUE,
};
