import { describe, expect, it, mock } from "bun:test";
import { resolveWeddingContext } from "@/lib/db/wedding-resolver";

// A wedding is identified by id "real-id" / slug "real-slug"; every other
// lookup (including any would-be default fallback) resolves to null.
const CTX = { weddingId: "real-id", slug: "real-slug" };

function makeLookups() {
  const getById = mock((id: string) =>
    Promise.resolve(id === "real-id" ? CTX : null),
  );
  const getBySlug = mock((slug: string) =>
    Promise.resolve(slug === "real-slug" ? CTX : null),
  );
  return { getById, getBySlug };
}

describe("resolveWeddingContext (fail closed)", () => {
  it("resolves by wedding id when present", async () => {
    const { getById, getBySlug } = makeLookups();
    const ctx = await resolveWeddingContext({
      weddingId: "real-id",
      weddingSlug: null,
      getById,
      getBySlug,
    });
    expect(ctx).toBe(CTX);
    expect(getById).toHaveBeenCalledTimes(1);
    expect(getBySlug).not.toHaveBeenCalled();
  });

  it("falls through to slug when id is absent", async () => {
    const { getById, getBySlug } = makeLookups();
    const ctx = await resolveWeddingContext({
      weddingId: null,
      weddingSlug: "real-slug",
      getById,
      getBySlug,
    });
    expect(ctx).toBe(CTX);
    expect(getBySlug).toHaveBeenCalledTimes(1);
  });

  it("throws when neither header is present (no default fallback)", async () => {
    const { getById, getBySlug } = makeLookups();
    await expect(
      resolveWeddingContext({
        weddingId: null,
        weddingSlug: null,
        getById,
        getBySlug,
      }),
    ).rejects.toThrow(/Could not resolve wedding context/);
    // No lookup happened at all — the resolver never guesses a tenant.
    expect(getById).not.toHaveBeenCalled();
    expect(getBySlug).not.toHaveBeenCalled();
  });

  it("throws when the id/slug match no wedding (no default fallback)", async () => {
    const { getById, getBySlug } = makeLookups();
    await expect(
      resolveWeddingContext({
        weddingId: "ghost-id",
        weddingSlug: "ghost-slug",
        getById,
        getBySlug,
      }),
    ).rejects.toThrow(/Refusing to fall back to a default wedding/);
    // It tried exactly the provided id and slug, then gave up — it did not
    // query any additional default slug.
    expect(getById).toHaveBeenCalledTimes(1);
    expect(getBySlug).toHaveBeenCalledTimes(1);
  });
});
