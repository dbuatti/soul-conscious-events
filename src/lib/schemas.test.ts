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

  it("requires a valid ticket URL", () => {
    expect(eventFormSchema.safeParse({ ...valid, ticketLink: "not-a-url" }).success).toBe(false);
    const { ticketLink: _omit, ...withoutLink } = valid;
    expect(eventFormSchema.safeParse(withoutLink).success).toBe(false);
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
