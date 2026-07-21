import { afterEach, describe, expect, it } from "bun:test";
import { buildGuestsUrl } from "@/app/[slug]/admin/guests/guests-url";

// buildGuestsUrl reads the LIVE URL (window.location.search) rather than a
// captured snapshot. Stub a minimal window so we can exercise that path.
function setSearch(search: string) {
  // @ts-expect-error - minimal window stub for the URL builder
  globalThis.window = { location: { search } };
}

afterEach(() => {
  // @ts-expect-error - reset between tests
  globalThis.window = undefined;
});

describe("buildGuestsUrl", () => {
  it("preserves every existing param when adding a new one", () => {
    setSearch("?side=bride&rsvpStatus=yes&physicalInviteSent=false");
    const url = buildGuestsUrl("demo", { edit: "g1" });
    const qs = new URLSearchParams(url.split("?")[1]);
    expect(url.startsWith("/demo/admin/guests?")).toBe(true);
    // Existing filters survive...
    expect(qs.get("side")).toBe("bride");
    expect(qs.get("rsvpStatus")).toBe("yes");
    expect(qs.get("physicalInviteSent")).toBe("false");
    // ...and the requested change is applied.
    expect(qs.get("edit")).toBe("g1");
  });

  it("carries an UNKNOWN/future filter param through untouched", () => {
    // The whole point: a filter added later needs no change here to persist.
    setSearch("?someBrandNewFilter=42");
    const qs = new URLSearchParams(
      buildGuestsUrl("demo", { edit: "g1" }).split("?")[1],
    );
    expect(qs.get("someBrandNewFilter")).toBe("42");
    expect(qs.get("edit")).toBe("g1");
  });

  it("removes a key when its value is null and keeps the rest", () => {
    setSearch("?physicalInviteSent=true&edit=g1");
    const url = buildGuestsUrl("demo", { edit: null });
    const qs = new URLSearchParams(url.split("?")[1]);
    expect(qs.get("edit")).toBeNull();
    expect(qs.get("physicalInviteSent")).toBe("true");
  });

  it("upserts an existing key rather than duplicating it", () => {
    setSearch("?sortOrder=asc");
    const url = buildGuestsUrl("demo", { sortBy: "email", sortOrder: "desc" });
    const qs = new URLSearchParams(url.split("?")[1]);
    expect(qs.getAll("sortOrder")).toEqual(["desc"]);
    expect(qs.get("sortBy")).toBe("email");
  });

  it("returns a clean path with no trailing ? when there are no params", () => {
    setSearch("");
    expect(buildGuestsUrl("demo")).toBe("/demo/admin/guests");
  });

  it("falls back to no query string when window is unavailable (SSR)", () => {
    // No setSearch() -> window is undefined.
    expect(buildGuestsUrl("demo")).toBe("/demo/admin/guests");
    expect(buildGuestsUrl("demo", { edit: "g1" })).toBe(
      "/demo/admin/guests?edit=g1",
    );
  });
});
