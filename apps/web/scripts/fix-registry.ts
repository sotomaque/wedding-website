import { db } from "@/lib/db";

// Production Stripe product IDs from Vercel
const STRIPE_DATA = [
  {
    titleMatch: "Tiny Humans",
    stripeProductId: "prod_TjvGB5rTuQuZBq",
  },
  {
    titleMatch: "Somewhere Pretty",
    stripeProductId: "prod_TjvGVSJNlF2Tft",
  },
  {
    titleMatch: "Student Loans",
    stripeProductId: "prod_TjvG2XrPXQffNH",
  },
];

async function main() {
  const wedding = await db.wedding.findFirst({
    where: { slug: "helen-and-enrique" },
    select: { id: true },
  });
  if (!wedding) {
    console.error("Wedding not found!");
    process.exit(1);
  }

  const items = await db.registryItem.findMany({
    where: { weddingId: wedding.id },
  });
  console.log(`Found ${items.length} registry items`);

  for (const s of STRIPE_DATA) {
    const item = items.find((i) => i.title.includes(s.titleMatch));
    if (item) {
      await db.registryItem.update({
        where: { id: item.id },
        data: { stripeProductId: s.stripeProductId },
      });
      console.log(`Updated product ID: ${item.title} → ${s.stripeProductId}`);
    } else {
      console.log(`Not found: ${s.titleMatch}`);
    }
  }

  console.log("Done!");
  process.exit(0);
}

main();
