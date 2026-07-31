import { describe, expect, it } from "bun:test";
import {
  renderThankYouPhotosEmail,
  type ThankYouPhotosData,
} from "@/lib/email/thank-you-photos";

const base: ThankYouPhotosData = {
  coupleName: "Helen & Enrique",
  greetingName: "Ada",
  uploadUrl: "https://example.com/helen-and-enrique/photos/upload",
  websiteUrl: "https://example.com/helen-and-enrique",
};

describe("renderThankYouPhotosEmail", () => {
  it("includes the couple, greeting, thanks copy, and the upload link", () => {
    const { subject, html } = renderThankYouPhotosEmail(base);

    expect(subject).toBe("Thank you for celebrating with us — Helen & Enrique");
    expect(html).toContain("Hi Ada,");
    expect(html).toContain("Thank you so much for celebrating with us");
    expect(html).toContain(
      "https://example.com/helen-and-enrique/photos/upload",
    );
    expect(html).toContain("Upload your photos");
    expect(html).toContain("No account needed");
    expect(html).toContain("https://example.com/helen-and-enrique");
  });

  it("uses a generic greeting when no name is given (preview)", () => {
    const { html } = renderThankYouPhotosEmail({
      ...base,
      greetingName: null,
    });
    expect(html).toContain("Hi there,");
    expect(html).not.toContain("Hi Ada,");
  });

  it("HTML-escapes injected values (no markup injection)", () => {
    const { subject, html } = renderThankYouPhotosEmail({
      ...base,
      coupleName: "<script>alert(1)</script>",
      greetingName: '"><img src=x onerror=alert(1)>',
    });

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
    // Subject is plain text (not HTML), so it carries the raw couple name.
    expect(subject).toContain("<script>alert(1)</script>");
  });

  it("collapses CR/LF in the subject (header-split guard)", () => {
    const { subject } = renderThankYouPhotosEmail({
      ...base,
      coupleName: "Helen\r\nBcc: evil@x.com",
    });
    expect(subject).not.toMatch(/[\r\n]/);
    expect(subject).toContain("Helen Bcc: evil@x.com");
  });
});
