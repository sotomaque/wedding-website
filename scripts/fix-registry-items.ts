/**
 * One-time script to update registry_items with Stripe URLs and product IDs.
 * Run with: cd apps/web && bun run ../../scripts/fix-registry-items.ts
 *
 * Make sure packages/db/.env points to the correct database first.
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const STRIPE_DATA = [
  {
    titleMatch: "Future Tiny Humans",
    stripeUrl: "https://buy.stripe.com/test_4gM4gzf0Q1Wcf3J0ni1kA00",
    stripeProductId: "prod_TjqMvBHivyWCgB",
  },
  {
    titleMatch: "Send Us Somewhere Pretty",
    stripeUrl: "https://buy.stripe.com/test_3cIaEX4mc0S85t97PK1kA01",
    stripeProductId: "prod_TjqOzu9u40yFAO",
  },
  {
    titleMatch: "Bye Bye Student Loans",
    stripeUrl: "https://buy.stripe.com/test_5kQdR9g4U6cs4p55HC1kA02",
    stripeProductId: "prod_TjqQl6YcukVJru",
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

  for (const stripe of STRIPE_DATA) {
    const item = items.find((i) => i.title.includes(stripe.titleMatch));
    if (item) {
      await db.registryItem.update({
        where: { id: item.id },
        data: {
          stripeUrl: stripe.stripeUrl,
          stripeProductId: stripe.stripeProductId,
        },
      });
      console.log(`Updated: ${item.title} → ${stripe.stripeUrl}`);
    } else {
      console.log(`Not found: ${stripe.titleMatch}`);
    }
  }

  // Also update the details content to add registry link in additionalInfo
  const content = await db.weddingContent.findFirst({
    where: { weddingId: wedding.id, section: "details" },
  });

  if (content) {
    const data = content.content as Record<string, unknown>;
    const additionalInfo =
      (data.additionalInfo as Array<Record<string, string>>) ?? [];

    const hasRegistry = additionalInfo.some((i) =>
      i.title?.toLowerCase().includes("registry"),
    );

    if (!hasRegistry) {
      additionalInfo.push({
        title: "Registry",
        description: "View our gift registry",
      });

      await db.weddingContent.update({
        where: { id: content.id },
        data: {
          content: { ...data, additionalInfo },
        },
      });
      console.log("Added Registry to details additionalInfo");
    } else {
      console.log("Registry already in additionalInfo");
    }
  }

  await db.$disconnect();
  console.log("Done!");
}

main().catch(console.error);
