import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => {
  const state: { result: { data: unknown; error: unknown } } = { result: { data: null, error: null } };
  const calls: { method: string; args: unknown[] }[] = [];

  type Chain = Record<string, unknown>;
  const chain: Chain = {};
  for (const method of ["select", "eq", "order", "insert", "update", "delete"]) {
    chain[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return chain;
    };
  }
  chain.then = (onFulfilled: (value: unknown) => unknown) =>
    Promise.resolve(state.result).then(onFulfilled);

  const from = (...args: unknown[]) => {
    calls.push({ method: "from", args });
    return chain;
  };

  return { state, calls, from };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mock.from },
}));

import {
  getApprovedEvents,
  getFavouriteVenues,
  setFavouriteVenue,
  softDeleteEvent,
} from "./events-service";

describe("events-service", () => {
  beforeEach(() => {
    mock.state.result = { data: null, error: null };
    mock.calls.length = 0;
  });

  it("fetches approved, non-deleted events ordered by date", async () => {
    mock.state.result = { data: [{ id: "a" }, { id: "b" }], error: null };

    const events = await getApprovedEvents();

    expect(events).toEqual([{ id: "a" }, { id: "b" }]);
    expect(mock.calls).toContainEqual({ method: "from", args: ["events"] });
    expect(mock.calls).toContainEqual({ method: "eq", args: ["approval_status", "approved"] });
    expect(mock.calls).toContainEqual({ method: "eq", args: ["is_deleted", false] });
    expect(mock.calls).toContainEqual({ method: "order", args: ["event_date", { ascending: true }] });
  });

  it("throws a normalised error when the events query fails", async () => {
    mock.state.result = { data: null, error: { message: "boom" } };

    await expect(getApprovedEvents()).rejects.toThrow("boom");
  });

  it("returns favourite venue names and drops nulls", async () => {
    mock.state.result = {
      data: [{ place_name: "Byron Bay" }, { place_name: null }, { place_name: "Sydney" }],
      error: null,
    };

    await expect(getFavouriteVenues("user-1")).resolves.toEqual(["Byron Bay", "Sydney"]);
    expect(mock.calls).toContainEqual({ method: "eq", args: ["user_id", "user-1"] });
  });

  it("inserts a favourite when adding", async () => {
    await setFavouriteVenue("user-1", "Byron Bay", true);

    expect(mock.calls).toContainEqual({
      method: "insert",
      args: [[{ user_id: "user-1", place_name: "Byron Bay" }]],
    });
  });

  it("deletes a favourite when removing", async () => {
    await setFavouriteVenue("user-1", "Byron Bay", false);

    expect(mock.calls).toContainEqual({ method: "delete", args: [] });
    expect(mock.calls).toContainEqual({ method: "eq", args: ["user_id", "user-1"] });
    expect(mock.calls).toContainEqual({ method: "eq", args: ["place_name", "Byron Bay"] });
  });

  it("soft-deletes an event by base id", async () => {
    await softDeleteEvent("550e8400-e29b-41d4-a716-446655440000");

    expect(mock.calls).toContainEqual({ method: "update", args: [{ is_deleted: true }] });
    expect(mock.calls).toContainEqual({
      method: "eq",
      args: ["id", "550e8400-e29b-41d4-a716-446655440000"],
    });
  });
});
