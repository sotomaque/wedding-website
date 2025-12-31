export const LOCATIONS = [
  {
    id: "balboa-park",
    name: "Balboa Park",
    description:
      "One of our favorite spots for a lazy Sunday stroll. The gardens are stunning, and there's always something new to discover. Pro tip: grab coffee at the Japanese Friendship Garden!",
    address: "1549 El Prado, San Diego, CA",
    imageUrl: "/balboa.png",
    coordinates: [-117.1496, 32.7311] as [number, number],
    color: [34, 197, 94, 255] as [number, number, number, number], // Green
  },
  {
    id: "la-jolla-cove",
    name: "La Jolla Cove",
    description:
      "We love watching the sea lions here—they're hilarious! The views are breathtaking, especially at sunset. Walk along the coastal path and you might spot some seals too.",
    address: "500 Coast Blvd, La Jolla, CA",
    imageUrl: "/la-jolla-cove.webp",
    coordinates: [-117.2715, 32.8507] as [number, number],
    color: [59, 130, 246, 255] as [number, number, number, number], // Blue
  },
  {
    id: "little-italy",
    name: "Little Italy",
    description:
      "One of our favorite neighborhoods for an evening stroll. Amazing Italian restaurants, trendy cafes, and a wonderful Saturday farmers market. The vibe here is unbeatable!",
    address: "Little Italy, San Diego",
    imageUrl: "/little-italy.jpeg",
    coordinates: [-117.167, 32.7212] as [number, number],
    color: [236, 72, 153, 255] as [number, number, number, number], // Pink
  },
  {
    id: "coronado-beach",
    name: "Coronado Beach",
    description:
      "Hands down our favorite beach in San Diego. The sand sparkles (really!), the water is perfect, and the Hotel del Coronado is such an iconic spot for a sunset cocktail.",
    address: "1500 Orange Ave, Coronado",
    imageUrl: "/coronado.webp",
    coordinates: [-117.1783, 32.6859] as [number, number],
    color: [251, 191, 36, 255] as [number, number, number, number], // Amber
  },
  {
    id: "del-mar-beach",
    name: "Del Mar Beach",
    description:
      "One of the most beautiful beaches in Southern California! The wide sandy shores are perfect for long walks, and the beach town has such a charming, laid-back vibe. Great for sunset watching!",
    address: "Del Mar, CA",
    imageUrl: "/del-mar.jpg",
    coordinates: [-117.2652, 32.9595] as [number, number],
    color: [14, 165, 233, 255] as [number, number, number, number], // Sky blue
  },
  {
    id: "san-diego-zoo",
    name: "San Diego Zoo",
    description:
      "World-famous for a reason! We never get tired of visiting. The pandas are adorable, and the aerial tram gives you amazing views. Plan for at least half a day here!",
    address: "2920 Zoo Drive, San Diego",
    imageUrl: "/sandiegozoo.jpg",
    coordinates: [-117.1509, 32.7347] as [number, number],
    color: [168, 85, 247, 255] as [number, number, number, number], // Purple
  },
];

export const IMMACULATA = {
  name: "The Immaculata",
  type: "ceremony",
  coordinates: [-117.1902, 32.7719] as [number, number],
};

export const HEADQUARTERS = {
  name: "Headquarters at Seaport",
  type: "reception",
  coordinates: [-117.1689, 32.7091] as [number, number],
};
