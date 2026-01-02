import { describe, expect, it } from "bun:test";
import {
  DETAILS_CONTENT,
  HERO_CONTENT,
  HERO_PHOTOS,
  NAVIGATION_CONFIG,
  RSVP_CONTENT,
  SCHEDULE_CONTENT,
  STORY_CONTENT,
} from "./test-constants";

describe("Static Site - Photos", () => {
  it("should have photos defined in HERO_PHOTOS", () => {
    expect(HERO_PHOTOS.length).toBeGreaterThan(0);
  });

  it("each photo should have required properties", () => {
    for (const photo of HERO_PHOTOS) {
      expect(photo.src).toBeDefined();
      expect(photo.src).toMatch(/^\/our-photos\/.+\.(jpeg|jpg|png|heic)$/);
      expect(photo.alt).toBeDefined();
      expect(photo.alt.length).toBeGreaterThan(0);
      expect(photo.description).toBeDefined();
    }
  });

  it("photo sources should be unique", () => {
    const sources = HERO_PHOTOS.map((p) => p.src);
    const uniqueSources = new Set(sources);
    expect(uniqueSources.size).toBe(sources.length);
  });
});

describe("Static Site - Navigation Links", () => {
  it("should have left navigation links defined", () => {
    expect(NAVIGATION_CONFIG.leftLinks.length).toBeGreaterThan(0);
  });

  it("should have right navigation links defined", () => {
    expect(NAVIGATION_CONFIG.rightLinks.length).toBeGreaterThan(0);
  });

  it("all links should have href and label", () => {
    const allLinks = [
      ...NAVIGATION_CONFIG.leftLinks,
      ...NAVIGATION_CONFIG.rightLinks,
    ];
    for (const link of allLinks) {
      expect(link.href).toBeDefined();
      expect(link.href.length).toBeGreaterThan(0);
      expect(link.label).toBeDefined();
      expect(link.label.length).toBeGreaterThan(0);
    }
  });

  it("internal links should start with / or /#", () => {
    const allLinks = [
      ...NAVIGATION_CONFIG.leftLinks,
      ...NAVIGATION_CONFIG.rightLinks,
    ];
    for (const link of allLinks) {
      expect(link.href).toMatch(/^\//);
    }
  });

  it("should include RSVP link", () => {
    const allLinks = [
      ...NAVIGATION_CONFIG.leftLinks,
      ...NAVIGATION_CONFIG.rightLinks,
    ];
    const rsvpLink = allLinks.find(
      (l) => l.label.toLowerCase().includes("rsvp") || l.href.includes("rsvp"),
    );
    expect(rsvpLink).toBeDefined();
  });

  it("should include Things To Do link", () => {
    const allLinks = [
      ...NAVIGATION_CONFIG.leftLinks,
      ...NAVIGATION_CONFIG.rightLinks,
    ];
    const thingsToDoLink = allLinks.find((l) =>
      l.href.includes("things-to-do"),
    );
    expect(thingsToDoLink).toBeDefined();
  });
});

describe("Static Site - Content Sections", () => {
  it("hero section should have title", () => {
    expect(HERO_CONTENT.title).toBeDefined();
    expect(HERO_CONTENT.title.length).toBeGreaterThan(0);
  });

  it("story section should have title and paragraphs", () => {
    expect(STORY_CONTENT.title).toBeDefined();
    expect(STORY_CONTENT.paragraphs).toBeDefined();
    expect(STORY_CONTENT.paragraphs.length).toBeGreaterThan(0);
  });

  it("details section should have ceremony and reception info", () => {
    expect(DETAILS_CONTENT.ceremony).toBeDefined();
    expect(DETAILS_CONTENT.ceremony.title).toBeDefined();
    expect(DETAILS_CONTENT.ceremony.time).toBeDefined();
    expect(DETAILS_CONTENT.ceremony.venue).toBeDefined();

    expect(DETAILS_CONTENT.reception).toBeDefined();
    expect(DETAILS_CONTENT.reception.title).toBeDefined();
    expect(DETAILS_CONTENT.reception.time).toBeDefined();
    expect(DETAILS_CONTENT.reception.venue).toBeDefined();
  });

  it("schedule section should have events", () => {
    expect(SCHEDULE_CONTENT.events).toBeDefined();
    expect(SCHEDULE_CONTENT.events.length).toBeGreaterThan(0);
    for (const event of SCHEDULE_CONTENT.events) {
      expect(event.time).toBeDefined();
      expect(event.event).toBeDefined();
    }
  });

  it("RSVP section should have deadline info", () => {
    expect(RSVP_CONTENT.deadline).toBeDefined();
    expect(RSVP_CONTENT.deadline).toContain("March");
  });
});

describe("Static Site - Brand Image", () => {
  it("should have brand image configured", () => {
    expect(NAVIGATION_CONFIG.brandImage).toBeDefined();
    expect(NAVIGATION_CONFIG.brandImage.src).toBeDefined();
    expect(NAVIGATION_CONFIG.brandImage.alt).toBeDefined();
  });
});
