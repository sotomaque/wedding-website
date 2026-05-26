import { describe, expect, it } from "bun:test";
import { getMotifPack, MOTIF_PACKS } from "@/lib/motifs";

describe("getMotifPack", () => {
  it("returns 'none' for null/undefined", () => {
    expect(getMotifPack(null).id).toBe("none");
    expect(getMotifPack(undefined).id).toBe("none");
  });

  it("returns 'none' for an unknown id", () => {
    expect(getMotifPack("sparkles").id).toBe("none");
  });

  it("returns the matching pack by id", () => {
    expect(getMotifPack("floral").id).toBe("floral");
  });

  it("uses 'none' as the first/default pack", () => {
    expect(MOTIF_PACKS[0]?.id).toBe("none");
  });

  it("has unique ids", () => {
    const ids = MOTIF_PACKS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
