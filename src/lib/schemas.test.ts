import { describe, expect, it } from "vitest";
import { eventFormSchema } from "./schemas";

const valid = {
  eventName: "Kirtan Night",
  eventDate: new Date("2026-01-15T00:00:00"),
  ticketLink: "https://example.com/tickets",
};

describe("eventFormSchema", () => {
  it("accepts a minimal valid payload", () => {
    expect(eventFormSchema.safeParse(valid).success).toBe(true);
  });

  it("requires a name of at least two characters", () => {
    const result = eventFormSchema.safeParse({ ...valid, eventName: "A" });

    expect(result.success).toBe(false);
  });

  it("requires a date", () => {
    const { eventDate: _omit, ...withoutDate } = valid;

    expect(eventFormSchema.safeParse(withoutDate).success).toBe(false);
  });

  it("requires a valid booking URL when one is given", () => {
    expect(eventFormSchema.safeParse({ ...valid, ticketLink: "not-a-url" }).success).toBe(false);
  });

  it("accepts an event with no booking link but a contact instead", () => {
    const { ticketLink: _omit, ...withoutLink } = valid;
    const result = eventFormSchema.safeParse({ ...withoutLink, organizerContact: "@embodied_abundance_with_cara" });

    expect(result.success).toBe(true);
  });

  it("rejects an event with neither a booking link nor a contact", () => {
    const { ticketLink: _omit, ...withoutLink } = valid;

    expect(eventFormSchema.safeParse(withoutLink).success).toBe(false);
    expect(eventFormSchema.safeParse({ ...withoutLink, organizerContact: "   " }).success).toBe(false);
  });

  it("rejects a name-only contact that cannot be turned into a booking button", () => {
    const { ticketLink: _omit, ...withoutLink } = valid;

    expect(eventFormSchema.safeParse({ ...withoutLink, organizerContact: "Padma" }).success).toBe(false);
  });

  it("accepts a name alongside an actionable contact", () => {
    const { ticketLink: _omit, ...withoutLink } = valid;

    expect(eventFormSchema.safeParse({ ...withoutLink, organizerContact: "Cara @embodied_abundance_with_cara" }).success).toBe(true);
  });

  it("accepts a File for imageFile and rejects other values", () => {
    const file = new File(["x"], "cover.png", { type: "image/png" });

    expect(eventFormSchema.safeParse({ ...valid, imageFile: file }).success).toBe(true);
    expect(eventFormSchema.safeParse({ ...valid, imageFile: "https://example.com/x.png" }).success).toBe(false);
  });

  it("only allows known recurring patterns", () => {
    expect(eventFormSchema.safeParse({ ...valid, recurringPattern: "WEEKLY" }).success).toBe(true);
    expect(eventFormSchema.safeParse({ ...valid, recurringPattern: "SOMETIMES" }).success).toBe(false);
  });

  it("accepts an optional list of event days", () => {
    const result = eventFormSchema.safeParse({
      ...valid,
      eventDays: [{ date: "2026-01-15", start_time: "18:00", end_time: "20:00" }],
    });

    expect(result.success).toBe(true);
  });
});
