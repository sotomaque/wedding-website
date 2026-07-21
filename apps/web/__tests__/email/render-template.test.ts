import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockFindUnique = mock(() => Promise.resolve(null));

mock.module("@/lib/db", () => ({
  db: {
    emailTemplate: {
      findUnique: mockFindUnique,
    },
  },
}));

const { renderEmailTemplate } = await import("@/lib/email/render-template");

describe("renderEmailTemplate", () => {
  beforeEach(() => {
    mockFindUnique.mockClear();
  });

  it("should render variables in subject and html", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "tpl-1",
      weddingId: "w-1",
      type: "wedding_invitation",
      name: "Wedding Invitation",
      subject: "You're Invited to {{{COUPLE_NAMES}}}'s Wedding!",
      htmlBody: "<h1>Hello {{{FIRST_NAME}}}</h1><p>Code: {{{INVITE_CODE}}}</p>",
      isActive: true,
      variables: [],
    });

    const result = await renderEmailTemplate("w-1", "wedding_invitation", {
      COUPLE_NAMES: "Helen & Enrique",
      FIRST_NAME: "Alice",
      INVITE_CODE: "ABC-1234",
    });

    expect(result).not.toBeNull();
    expect(result?.subject).toBe(
      "You're Invited to Helen & Enrique's Wedding!",
    );
    expect(result?.html).toBe("<h1>Hello Alice</h1><p>Code: ABC-1234</p>");
  });

  it("should return null when template is inactive", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "tpl-1",
      weddingId: "w-1",
      type: "rsvp_notification",
      name: "RSVP Notification",
      subject: "New RSVP",
      htmlBody: "<p>Test</p>",
      isActive: false,
      variables: [],
    });

    const result = await renderEmailTemplate("w-1", "rsvp_notification", {});

    expect(result).toBeNull();
  });

  it("should return null when template is not found", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const result = await renderEmailTemplate(
      "nonexistent",
      "gift_notification",
      {},
    );

    expect(result).toBeNull();
  });

  it("should leave unmatched placeholders as-is", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "tpl-1",
      weddingId: "w-1",
      type: "wedding_invitation",
      name: "Test",
      subject: "Hello {{{NAME}}} - {{{MISSING}}}",
      htmlBody: "<p>{{{PROVIDED}}} and {{{NOT_PROVIDED}}}</p>",
      isActive: true,
      variables: [],
    });

    const result = await renderEmailTemplate("w-1", "wedding_invitation", {
      NAME: "Alice",
      PROVIDED: "yes",
    });

    expect(result?.subject).toBe("Hello Alice - {{{MISSING}}}");
    expect(result?.html).toBe("<p>yes and {{{NOT_PROVIDED}}}</p>");
  });

  it("should handle template with no variables", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "tpl-1",
      weddingId: "w-1",
      type: "calendar_invite",
      name: "Calendar",
      subject: "Save the Date",
      htmlBody: "<p>Plain email with no placeholders</p>",
      isActive: true,
      variables: [],
    });

    const result = await renderEmailTemplate("w-1", "calendar_invite", {});

    expect(result?.subject).toBe("Save the Date");
    expect(result?.html).toBe("<p>Plain email with no placeholders</p>");
  });

  it("should query with correct weddingId, type, and language", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    await renderEmailTemplate("wedding-123", "gift_notification", {}, "es");

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: {
        weddingId_type_language: {
          weddingId: "wedding-123",
          type: "gift_notification",
          language: "es",
        },
      },
    });
  });

  it("should replace placeholder with empty string when variable value is empty", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "tpl-1",
      weddingId: "w-1",
      type: "wedding_invitation",
      name: "Test",
      subject: "Hi {{{NAME}}}",
      htmlBody: "<p>{{{CONTENT}}}</p>",
      isActive: true,
      variables: [],
    });

    const result = await renderEmailTemplate("w-1", "wedding_invitation", {
      NAME: "",
      CONTENT: "",
    });

    expect(result?.subject).toBe("Hi ");
    expect(result?.html).toBe("<p></p>");
  });

  it("passes the subject through literally but HTML-escapes body values", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "tpl-1",
      weddingId: "w-1",
      type: "wedding_invitation",
      name: "Test",
      subject: "{{{TEXT}}}",
      htmlBody: "<p>{{{HTML}}}</p>",
      isActive: true,
      variables: [],
    });

    const result = await renderEmailTemplate("w-1", "wedding_invitation", {
      TEXT: "Tom & Jerry's $100 gift",
      HTML: '<a href="test">link</a>',
    });

    // Subject is plain text → unchanged.
    expect(result?.subject).toBe("Tom & Jerry's $100 gift");
    // Body value is escaped so injected markup can't render.
    expect(result?.html).toBe(
      "<p>&lt;a href=&quot;test&quot;&gt;link&lt;/a&gt;</p>",
    );
  });

  it("does not escape trusted pre-built HTML keys (admin summary rows)", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "tpl-1",
      weddingId: "w-1",
      type: "admin_summary",
      name: "Test",
      subject: "Summary",
      htmlBody: "<table>{{{UNINVITED_GUESTS}}}</table>",
      isActive: true,
      variables: [],
    });

    const result = await renderEmailTemplate("w-1", "admin_summary", {
      UNINVITED_GUESTS: "<tr><td>Row</td></tr>",
    });

    expect(result?.html).toBe("<table><tr><td>Row</td></tr></table>");
  });

  it("should handle adjacent placeholders", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "tpl-1",
      weddingId: "w-1",
      type: "wedding_invitation",
      name: "Test",
      subject: "{{{FIRST}}}{{{LAST}}}",
      htmlBody: "{{{A}}}{{{B}}}{{{C}}}",
      isActive: true,
      variables: [],
    });

    const result = await renderEmailTemplate("w-1", "wedding_invitation", {
      FIRST: "John",
      LAST: "Doe",
      A: "1",
      B: "2",
      C: "3",
    });

    expect(result?.subject).toBe("JohnDoe");
    expect(result?.html).toBe("123");
  });
});
