import { supabase } from "@/integrations/supabase/client";
import type { Event } from "@/types/event";

/**
 * Central data-access layer for events and venue favourites.
 *
 * Every function throws a normalised `Error` on failure so React Query can
 * surface a single, consistent error path instead of Supabase's error shapes.
 */

export const eventKeys = {
  all: ["events"] as const,
  favourites: (userId: string) => ["favourite-venues", userId] as const,
};

/** All approved, non-deleted events, earliest first. */
export async function getApprovedEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("approval_status", "approved")
    .eq("is_deleted", false)
    .order("event_date", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Event[];
}

/** The place names a user has favourited. */
export async function getFavouriteVenues(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_favourite_venues")
    .select("place_name")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { place_name: string | null }[];
  return rows.map((row) => row.place_name).filter((name): name is string => Boolean(name));
}

/** Adds or removes a favourite venue for the user. */
export async function setFavouriteVenue(
  userId: string,
  placeName: string,
  isFavourited: boolean,
): Promise<void> {
  const { error } = isFavourited
    ? await supabase.from("user_favourite_venues").insert([{ user_id: userId, place_name: placeName }])
    : await supabase
        .from("user_favourite_venues")
        .delete()
        .eq("user_id", userId)
        .eq("place_name", placeName);

  if (error) throw new Error(error.message);
}

/** Soft-deletes an event by its base UUID. */
export async function softDeleteEvent(baseEventId: string): Promise<void> {
  const { error } = await supabase
    .from("events")
    .update({ is_deleted: true })
    .eq("id", baseEventId);

  if (error) throw new Error(error.message);
}
