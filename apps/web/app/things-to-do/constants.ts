// Types
type RGBAColor = [number, number, number, number];
type Coordinates = [number, number];

interface Location {
  id: string;
  name: string;
  emoji: string;
  description: string;
  address: string;
  imageUrl: string;
  coordinates: Coordinates;
  color: RGBAColor;
}

interface Venue {
  id: string;
  name: string;
  emoji: string;
  type: "ceremony" | "reception";
  description: string;
  address: string;
  imageUrl: string;
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
    imageUrl: "/things-to-do/balboa.png",
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
    imageUrl: "/things-to-do/la-jolla-cove.webp",
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
    imageUrl: "/things-to-do/little-italy.jpeg",
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
    imageUrl: "/things-to-do/coronado.webp",
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
    imageUrl: "/things-to-do/del-mar.jpg",
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
    imageUrl: "/things-to-do/sandiegozoo.jpg",
    coordinates: [-117.1509, 32.7347],
    color: COLORS.PURPLE,
  },
];

// Venues
export const IMMACULATA: Venue = {
  id: "immaculata",
  name: "The Immaculata",
  emoji: "⛪️",
  type: "ceremony",
  description:
    "A stunning example of Spanish Renaissance architecture, The Immaculata sits atop the University of San Diego campus with breathtaking views of Mission Bay. This beautiful church will be the setting for our ceremony.",
  address: "5998 Alcalá Park, San Diego, CA 92110",
  imageUrl: "/things-to-do/immaculata.jpg",
  coordinates: [-117.1902, 32.7719],
  color: COLORS.PURPLE,
};

export const HEADQUARTERS: Venue = {
  id: "headquarters",
  name: "Headquarters at Seaport",
  emoji: "🍾",
  type: "reception",
  description:
    "Located in the historic heart of downtown San Diego, The Headquarters at Seaport District is where we'll celebrate with dinner, drinks, and dancing. This waterfront venue offers stunning bay views and a vibrant atmosphere.",
  address: "789 W Harbor Dr, San Diego, CA 92101",
  imageUrl: "/things-to-do/headquarters.webp",
  coordinates: [-117.1689, 32.7091],
  color: COLORS.BLUE,
};
