export const HERO_PHOTOS = [
  {
    src: "/our-photos/basilica.jpeg",
    alt: "Basilica",
    description: "A beautiful day at the Basilica",
  },
  {
    src: "/our-photos/bellevue.jpeg",
    alt: "Bellevue",
    description: "Exploring Bellevue together",
  },
  {
    src: "/our-photos/carlsbad.jpeg",
    alt: "Carlsbad",
    description: "Beach day in Carlsbad",
  },
  {
    src: "/our-photos/cdmx.jpeg",
    alt: "Mexico City",
    description: "Adventures in Mexico City",
  },
  {
    src: "/our-photos/getty.jpeg",
    alt: "Getty Museum",
    description: "Art and culture at the Getty",
  },
  {
    src: "/our-photos/haleiwa.jpeg",
    alt: "Haleiwa",
    description: "North Shore vibes in Haleiwa",
  },
  {
    src: "/our-photos/hawaii.jpeg",
    alt: "Hawaii",
    description: "Island life in Hawaii",
  },
  {
    src: "/our-photos/juanita-beach.jpeg",
    alt: "Juanita Beach",
    description: "Sunset at Juanita Beach",
  },
  {
    src: "/our-photos/keller.jpeg",
    alt: "Keller",
    description: "Memories in Keller",
  },
  {
    src: "/our-photos/kenmore.jpeg",
    alt: "Kenmore",
    description: "Home sweet home in Kenmore",
  },
  {
    src: "/our-photos/knotts-berry.jpeg",
    alt: "Knotts Berry Farm",
    description: "Thrills at Knott's Berry Farm",
  },
  {
    src: "/our-photos/la-jolla.jpeg",
    alt: "La Jolla",
    description: "Coastal beauty in La Jolla",
  },
  {
    src: "/our-photos/makua.jpeg",
    alt: "Makua Beach",
    description: "Paradise at Makua Beach",
  },
  {
    src: "/our-photos/mount-rainer.jpeg",
    alt: "Mount Rainier",
    description: "Majestic Mount Rainier",
  },
  {
    src: "/our-photos/nicaragua.jpeg",
    alt: "Nicaragua",
    description: "Adventure in Nicaragua",
  },
  {
    src: "/our-photos/pacific-beach.jpeg",
    alt: "Pacific Beach",
    description: "Pacific Beach sunsets",
  },
  {
    src: "/our-photos/padres.jpeg",
    alt: "Padres Game",
    description: "Cheering on the Padres",
  },
  {
    src: "/our-photos/phoenix.jpeg",
    alt: "Phoenix",
    description: "Desert days in Phoenix",
  },
  {
    src: "/our-photos/seattle.jpeg",
    alt: "Seattle",
    description: "Where it all began in Seattle",
  },
  {
    src: "/our-photos/sphere.jpeg",
    alt: "Sphere Las Vegas",
    description: "The incredible Sphere in Vegas",
  },
  {
    src: "/our-photos/steamboat-springs.jpeg",
    alt: "Steamboat Springs",
    description: "Winter wonderland in Steamboat",
  },
  {
    src: "/our-photos/uw.jpeg",
    alt: "University of Washington",
    description: "Campus memories at UW",
  },
  {
    src: "/our-photos/vegas.jpeg",
    alt: "Las Vegas",
    description: "Bright lights in Las Vegas",
  },
] as const;

export const HERO_CONTENT = {
  title: "Helen & Enrique",
} as const;

export const STORY_CONTENT = {
  title: "Our Story",
  paragraphs: [
    "We met in Seattle in 2020, just before the world changed. What began as a simple connection quickly grew into something steady and meaningful, and we decided to start our journey together right then.",
    "That journey soon took us to Hawai'i, where Helen began her career as a teacher and where we learned what it meant to build a life side by side. From there, our path led us to San Diego, a place we are proud to now call home.",
    "Today, we're so excited to celebrate our love with the people who mean the most to us. Join us as we begin this next chapter together, surrounded by joy, laughter, and unforgettable memories.",
  ],
} as const;

export const DETAILS_CONTENT = {
  title: "Wedding Details",
  ceremony: {
    icon: "⛪️",
    title: "Ceremony",
    time: "4:00 PM",
    venue: "The Immaculata Church",
    location: "University of San Diego",
    address: "San Diego, CA 92110",
  },
  reception: {
    icon: "🍾",
    title: "Reception",
    time: "6:00 PM",
    venue: "Headquarters",
    address: "789 W Harbor Dr Suite 148, San Diego, CA 92101",
    description: "Dinner, Dancing & Celebration",
  },
  additionalInfo: [
    {
      title: "Attire",
      description: "Formal / Black Tie Optional",
    },
    {
      title: "Accommodations",
      description: "Hotel blocks available",
    },
    {
      title: "Registry",
      description: "Details to follow",
    },
  ],
} as const;

export const SCHEDULE_CONTENT = {
  title: "Schedule",
  events: [
    {
      id: "arrival",
      time: "3:30 PM",
      event: "Guest Arrival",
      description: "Please arrive early to find your seats",
    },
    {
      id: "ceremony",
      time: "4:00 PM",
      event: "Ceremony Begins",
      description: "The celebration starts",
    },
    {
      id: "cocktail",
      time: "4:30 PM",
      event: "Cocktail Hour",
      description: "Drinks and hors d'oeuvres in the garden",
    },
    {
      id: "reception",
      time: "6:00 PM",
      event: "Reception",
      description: "Dinner, toasts, and dancing",
    },
    {
      id: "lastdance",
      time: "10:00 PM",
      event: "Last Dance",
      description: "Send off under the stars",
    },
  ],
} as const;

export const RSVP_CONTENT = {
  title: "RSVP",
  deadline: "Please respond by April 30th, 2025",
  image: {
    src: "/rsvp.png",
    alt: "RSVP",
  },
  form: {
    firstName: {
      label: "First Name",
      placeholder: "John",
    },
    lastName: {
      label: "Last Name",
      placeholder: "Doe",
    },
    email: {
      label: "Email",
      placeholder: "john@example.com",
    },
    attending: {
      label: "Will you be attending?",
      options: ["Joyfully accepts", "Regretfully declines"],
    },
    plusOne: {
      label: "Will you be bringing a plus one?",
    },
    travel: {
      label: "Where will you be traveling from?",
      placeholder: "City, State/Country (optional)",
    },
    needsAccommodation: {
      label: "Would you like hotel accommodation recommendations?",
    },
    dietary: {
      label: "Dietary Restrictions",
      placeholder: "Please let us know of any dietary restrictions...",
      rows: 3,
    },
    submitButton: "Submit RSVP",
  },
} as const;
