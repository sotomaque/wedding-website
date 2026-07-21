import { describe, expect, it } from "bun:test";
import {
  renderTwoWeekReminderEmail,
  type TwoWeekReminderData,
} from "@/lib/email/two-week-reminder";

const base: TwoWeekReminderData = {
  coupleName: "Helen & Enrique",
  weddingDateLabel: "Saturday, July 4, 2026",
  greetingName: "Ada",
  events: [
    {
      name: "Ceremony",
      dateLabel: "Saturday, July 4, 2026",
      timeLabel: "4:00 PM - 5:00 PM",
      locationName: "La Jolla Cove",
      locationAddress: "1100 Coast Blvd, La Jolla, CA",
    },
  ],
  websiteUrl: "https://example.com/helen-and-enrique",
  registryUrl: "https://example.com/helen-and-enrique/registry",
  externalRegistryUrl: null,
};

describe("renderTwoWeekReminderEmail", () => {
  it("includes the couple, date, greeting, event, and registry link", () => {
    const { subject, html } = renderTwoWeekReminderEmail(base);

    expect(subject).toBe("Two weeks to go — Helen & Enrique's wedding!");
    expect(html).toContain("Hi Ada,");
    expect(html).toContain("Saturday, July 4, 2026");
    expect(html).toContain("Ceremony");
    expect(html).toContain("4:00 PM - 5:00 PM");
    expect(html).toContain("La Jolla Cove");
    // registry button + website button
    expect(html).toContain("https://example.com/helen-and-enrique/registry");
    expect(html).toContain("https://example.com/helen-and-enrique");
    // maps link for the address
    expect(html).toContain("https://www.google.com/maps/search/");
  });

  it("uses a generic greeting when no name is given (preview)", () => {
    const { html } = renderTwoWeekReminderEmail({
      ...base,
      greetingName: null,
    });
    expect(html).toContain("Hi there,");
    expect(html).not.toContain("Hi Ada,");
  });

  it("shows the external wishlist link when present", () => {
    const { html } = renderTwoWeekReminderEmail({
      ...base,
      externalRegistryUrl: "https://amazon.com/wishlist/abc",
    });
    expect(html).toContain("https://amazon.com/wishlist/abc");
    expect(html).toContain("external wishlist");
  });

  it("HTML-escapes injected values (no markup injection)", () => {
    const { subject, html } = renderTwoWeekReminderEmail({
      ...base,
      coupleName: "<script>alert(1)</script>",
      greetingName: '"><img src=x onerror=alert(1)>',
      events: [
        {
          name: "<b>Reception</b>",
          dateLabel: "",
          timeLabel: "",
          locationName: null,
          locationAddress: null,
        },
      ],
    });

    // No raw markup from injected values in the body.
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>Reception</b>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;b&gt;Reception&lt;/b&gt;");
    // Subject is plain text (not HTML), so it carries the raw couple name.
    expect(subject).toContain("<script>alert(1)</script>");
  });

  it("falls back gracefully when there are no events", () => {
    const { html } = renderTwoWeekReminderEmail({ ...base, events: [] });
    expect(html).toContain("Full schedule details are on our website.");
  });
});
