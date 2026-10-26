import { describe, expect, it } from "vitest";
import { ensureProtocol, getBookingTarget, parseOrganiserContact } from "./booking";

describe("ensureProtocol", () => {
  it("adds https when the scheme is missing", () => {
    expect(ensureProtocol("www.eventbrite.com.au/e/x")).toBe("https://www.eventbrite.com.au/e/x");
  });

  it("leaves existing schemes and other protocols alone", () => {
    expect(ensureProtocol("https://example.com")).toBe("https://example.com");
    expect(ensureProtocol("http://example.com")).toBe("http://example.com");
    expect(ensureProtocol("mailto:a@b.com")).toBe("mailto:a@b.com");
  });
});

describe("parseOrganiserContact", () => {
  it("turns an Instagram handle into a profile link", () => {
    expect(parseOrganiserContact("@embodied_abundance_with_cara")).toEqual({
      kind: "instagram",
      href: "https://instagram.com/embodied_abundance_with_cara",
      handle: "embodied_abundance_with_cara",
    });
  });

  it("finds a handle inside a free-form name", () => {
    const result = parseOrganiserContact("Jenna, Ryan @ryanswizardry");

    expect(result.kind).toBe("instagram");
    expect(result.href).toBe("https://instagram.com/ryanswizardry");
  });

  it("accepts a full Instagram URL", () => {
    expect(parseOrganiserContact("https://www.instagram.com/cara.sound/").handle).toBe("cara.sound");
  });

  it("does not mistake an email domain for a handle", () => {
    expect(parseOrganiserContact("cara@example.com")).toEqual({
      kind: "email",
      href: "mailto:cara@example.com",
    });
  });

  it("links phone numbers", () => {
    expect(parseOrganiserContact("0400 123 456")).toEqual({
      kind: "phone",
      href: "tel:0400123456",
    });
  });

  it("keeps a plain name as text", () => {
    const result = parseOrganiserContact("Cara");

    expect(result.kind).toBe("plain");
    expect(result.href).toBeNull();
    expect(result.name).toBe("Cara");
  });

  it("does not invent a name from a long free-form description", () => {
    expect(parseOrganiserContact("Cara from Embodied Abundance").name).toBeUndefined();
  });

  it("returns nothing for empty input", () => {
    expect(parseOrganiserContact("  ")).toEqual({ kind: "plain", href: null });
  });
});

describe("getBookingTarget", () => {
  it("prefers a ticket link and shows the price", () => {
    const target = getBookingTarget({
      ticket_link: "eventbrite.com.au/e/sound-bath",
      price: "40",
      organizer_contact: "@cara",
    });

    expect(target).toMatchObject({
      mode: "link",
      href: "https://eventbrite.com.au/e/sound-bath",
      label: "Get tickets · $40",
      external: true,
    });
  });

  it("omits the price when admission is free", () => {
    expect(getBookingTarget({ ticket_link: "https://x.com", price: "Free" }).label).toBe("Get tickets");
  });

  it("labels a social post as details rather than tickets", () => {
    const target = getBookingTarget({
      ticket_link: "https://www.instagram.com/p/Deh5mc7zYP8/",
      price: "$40",
    });

    expect(target).toMatchObject({ mode: "link", label: "See full details" });
  });

  it("still sells tickets through a payment link", () => {
    expect(getBookingTarget({ ticket_link: "buy.stripe.com/abc", price: "40" }).label).toBe("Get tickets · $40");
  });

  it("falls back to messaging the host when there is no link", () => {
    const target = getBookingTarget({
      organizer_contact: "@embodied_abundance_with_cara",
      price: "$40",
    });

    expect(target).toMatchObject({
      mode: "contact",
      href: "https://instagram.com/embodied_abundance_with_cara",
      label: "Message @embodied_abundance_with_cara",
    });
  });

  it("treats a blank ticket link as no link", () => {
    expect(getBookingTarget({ ticket_link: "   ", organizer_contact: "@cara" }).mode).toBe("contact");
  });

  it("reports nothing when the event has neither", () => {
    expect(getBookingTarget({})).toMatchObject({ mode: "none", href: null });
  });
});
