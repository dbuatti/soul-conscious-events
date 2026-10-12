import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useEventFilters } from "./use-event-filters";
import type { Event } from "@/types/event";

const makeEvent = (overrides: Partial<Event> & Pick<Event, "id" | "event_name" | "event_date">): Event => ({
  ...overrides,
});

const events: Event[] = [
  makeEvent({ id: "past", event_name: "Past Event", event_date: "2026-01-01", place_name: "Byron Bay", geographical_state: "NSW" }),
  makeEvent({ id: "today", event_name: "Sound Bath", event_date: "2026-01-15", place_name: "Byron Bay", geographical_state: "NSW", event_type: "Music", price: "Free" }),
  makeEvent({ id: "tomorrow", event_name: "Yoga Retreat", event_date: "2026-01-16", place_name: "Melbourne", geographical_state: "VIC", event_type: "Workshop", price: "50" }),
  makeEvent({ id: "weekend", event_name: "Ecstatic Dance", event_date: "2026-01-17", place_name: "Sydney", geographical_state: "NSW", event_type: "Dance", price: "Donation" }),
  makeEvent({ id: "later", event_name: "Kirtan", event_date: "2026-01-28", place_name: "Byron Bay", geographical_state: "NSW" }),
  makeEvent({ id: "next-month", event_name: "Breathwork", event_date: "2026-02-20", place_name: "Perth", geographical_state: "WA" }),
];

const ids = (list: Event[]) => list.map((e) => e.id);

describe("useEventFilters", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T09:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = () => renderHook(() => useEventFilters(events));

  it("excludes past events by default", () => {
    const { result } = setup();

    expect(ids(result.current.filteredEvents)).toEqual(["today", "tomorrow", "weekend", "later", "next-month"]);
    expect(result.current.totalCount).toBe(events.length);
  });

  it("matches the search term across name, place and state", () => {
    const { result } = setup();

    act(() => result.current.setSearchTerm("byron"));
    expect(ids(result.current.filteredEvents)).toEqual(["today", "later"]);

    act(() => result.current.setSearchTerm("nsw"));
    expect(ids(result.current.filteredEvents)).toEqual(["today", "weekend", "later"]);
  });

  it("filters by category", () => {
    const { result } = setup();

    act(() => result.current.setFilters({ ...result.current.filters, category: ["Music"] }));
    expect(ids(result.current.filteredEvents)).toEqual(["today"]);
  });

  it("filters by venue", () => {
    const { result } = setup();

    act(() => result.current.setFilters({ ...result.current.filters, venue: ["Byron Bay"] }));
    expect(ids(result.current.filteredEvents)).toEqual(["today", "later"]);
  });

  it("filters by state", () => {
    const { result } = setup();

    act(() => result.current.setFilters({ ...result.current.filters, state: ["VIC"] }));
    expect(ids(result.current.filteredEvents)).toEqual(["tomorrow"]);
  });

  it("filters free, paid and donation prices", () => {
    const { result } = setup();

    act(() => result.current.setFilters({ ...result.current.filters, price: ["Free"] }));
    expect(ids(result.current.filteredEvents)).toEqual(["today"]);

    act(() => result.current.setFilters({ ...result.current.filters, price: ["Paid"] }));
    expect(ids(result.current.filteredEvents)).toEqual(["tomorrow"]);

    act(() => result.current.setFilters({ ...result.current.filters, price: ["Donation"] }));
    expect(ids(result.current.filteredEvents)).toEqual(["weekend"]);
  });

  it("supports the Today, This Weekend and This Month date filters", () => {
    const { result } = setup();

    act(() => result.current.setFilters({ ...result.current.filters, date: "Today" }));
    expect(ids(result.current.filteredEvents)).toEqual(["today"]);

    act(() => result.current.setFilters({ ...result.current.filters, date: "This Weekend" }));
    expect(ids(result.current.filteredEvents)).toEqual(["tomorrow", "weekend"]);

    act(() => result.current.setFilters({ ...result.current.filters, date: "This Month" }));
    expect(ids(result.current.filteredEvents)).toEqual(["past", "today", "tomorrow", "weekend", "later"]);
  });
});
