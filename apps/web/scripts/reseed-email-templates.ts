/**
 * One-time script to upsert all default email templates for existing weddings.
 * Run with: cd apps/web && bun run scripts/reseed-email-templates.ts
 *
 * This creates missing templates (e.g. Spanish translations) and updates
 * existing templates with the latest default HTML from default-templates.ts.
 */
import { db } from "@/lib/db";
import { getDefaultTemplates } from "@/lib/email/default-templates";

async function main() {
  const weddings = await db.wedding.findMany({
    select: { id: true, slug: true },
  });
  console.log(`Found ${weddings.length} wedding(s)`);

  for (const wedding of weddings) {
    const defaults = getDefaultTemplates(wedding.id);
    let created = 0;
    let updated = 0;

    for (const tpl of defaults) {
      const existing = await db.emailTemplate.findFirst({
        where: {
          weddingId: wedding.id,
          type: tpl.type as Parameters<
            typeof db.emailTemplate.findFirst
          >[0]["where"]["type"],
          language: (tpl.language as string) || "en",
        },
      });

      if (existing) {
        await db.emailTemplate.update({
          where: { id: existing.id },
          data: {
            htmlBody: tpl.htmlBody as string,
            subject: tpl.subject as string,
            name: tpl.name as string,
            variables: tpl.variables ?? [],
          },
        });
        updated++;
      } else {
        await db.emailTemplate.create({ data: tpl });
        created++;
      }
    }

    console.log(
      `  ${wedding.slug}: ${created} created, ${updated} updated (${defaults.length} total)`,
    );
  }

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
