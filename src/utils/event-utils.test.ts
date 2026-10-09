import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatPrice,
  generateRecurringInstances,
  getBaseEventId,
  getGoogleCalendarUrl,
  isValidEventId,
} from "./event-utils";
import type { Event } from "@/types/event";

const BASE_ID = "550e8400-e29b-41d4-a716-446655440000";

const makeEvent = (overrides: Partial<Event> = {}): Event => ({
  id: BASE_ID,
  event_name: "Test Event",
  event_date: "2026-01-15",
  ...overrides,
});

describe("getBaseEventId", () => {
  it("returns a plain UUID unchanged", () => {
    expect(getBaseEventId(BASE_ID)).toBe(BASE_ID);
  });

  it("strips the date suffix from a recurring instance id", () => {
    expect(getBaseEventId(`${BASE_ID}-20260112`)).toBe(BASE_ID);
  });

  it("returns an empty string for empty input", () => {
    expect(getBaseEventId("")).toBe("");
  });
});

describe("isValidEventId", () => {
  it("accepts a base UUID", () => {
    expect(isValidEventId(BASE_ID)).toBe(true);
  });

  it("accepts a recurring instance id", () => {
    expect(isValidEventId(`${BASE_ID}-20260112`)).toBe(true);
  });

  it("rejects an id that is too short", () => {
    expect(isValidEventId("abc")).toBe(false);
  });
});

describe("formatPrice", () => {
  it("falls back to N/A when missing", () => {
    expect(formatPrice()).toBe("N/A");
    expect(formatPrice(null)).toBe("N/A");
    expect(formatPrice("")).toBe("N/A");
  });

  it("preserves free and donation labels", () => {
    expect(formatPrice("Free")).toBe("Free");
    expect(formatPrice("donation")).toBe("donation");
  });

  it("prefixes bare numeric prices with a dollar sign", () => {
    expect(formatPrice("25")).toBe("$25");
  });

  it("leaves prices that already carry a currency symbol", () => {
    expect(formatPrice("$30")).toBe("$30");
  });
});

describe("generateRecurringInstances", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T09:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns nothing for a non-recurring event", () => {
    expect(generateRecurringInstances(makeEvent())).toEqual([]);
  });

  it("returns nothing for an unparseable date", () => {
    expect(generateRecurringInstances(makeEvent({ event_date: "not-a-date", recurring_pattern: "WEEKLY" }))).toEqual([]);
  });

  it("expands a weekly series up to the instance cap", () => {
    const instances = generateRecurringInstances(
      makeEvent({ event_date: "2026-01-05", recurring_pattern: "WEEKLY" }),
    );

    expect(instances).toHaveLength(10);
    expect(instances[0]).toMatchObject({
      id: `${BASE_ID}-20260112`,
      event_date: "2026-01-12",
      is_recurring_instance: true,
    });
  });

  it("skips occurrences that fall before today", () => {
    const instances = generateRecurringInstances(
      makeEvent({ event_date: "2025-01-01", recurring_pattern: "WEEKLY" }),
    );

    expect(instances.length).toBeGreaterThan(0);
    expect(instances.every((i) => i.event_date >= "2026-01-01")).toBe(true);
    expect(instances[0].event_date).toBe("2026-01-07");
  });

  it("stops at the recurring end date", () => {
    const instances = generateRecurringInstances(
      makeEvent({
        event_date: "2026-01-05",
        recurring_pattern: "WEEKLY",
        recurring_end_date: "2026-01-20",
      }),
    );

    expect(instances.map((i) => i.event_date)).toEqual(["2026-01-12", "2026-01-19"]);
  });

  it("carries the duration across to each instance's end date", () => {
    const instances = generateRecurringInstances(
      makeEvent({ event_date: "2026-01-05", end_date: "2026-01-07", recurring_pattern: "WEEKLY" }),
    );

    expect(instances[0].end_date).toBe("2026-01-14");
  });

  it("does not drift on monthly series anchored to a month-end", () => {
    const instances = generateRecurringInstances(
      makeEvent({ event_date: "2026-01-31", recurring_pattern: "MONTHLY" }),
    );

    expect(instances.map((i) => i.event_date)).toEqual(["2026-02-28", "2026-03-31"]);
  });
});

describe("getGoogleCalendarUrl", () => {
  it("builds an all-day range with an exclusive end date", () => {
    const url = getGoogleCalendarUrl(
      makeEvent({ event_name: "Kirtan Night", event_date: "2026-01-15", ticket_link: "https://example.com" }),
    );

    expect(url).toContain("https://www.google.com/calendar/render?");
    expect(url).toContain("text=Kirtan+Night");
    expect(url).toContain("dates=20260115%2F20260116");
  });
});
