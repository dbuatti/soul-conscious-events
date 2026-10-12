import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  eventKeys,
  getApprovedEvents,
  getFavouriteVenues,
  setFavouriteVenue,
  softDeleteEvent,
} from "@/services/events-service";

/** Approved, non-deleted events, cached and shared across the app. */
export const useEvents = () =>
  useQuery({
    queryKey: eventKeys.all,
    queryFn: getApprovedEvents,
  });

/** The current user's favourite venue names. Disabled until a user is known. */
export const useFavouriteVenues = (userId?: string) =>
  useQuery({
    queryKey: eventKeys.favourites(userId ?? "anonymous"),
    queryFn: () => (userId ? getFavouriteVenues(userId) : Promise.resolve([])),
    enabled: Boolean(userId),
  });

/** Soft-deletes an event and refreshes the events list. */
export const useDeleteEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: softDeleteEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventKeys.all }),
  });
};

/** Toggles a favourite venue and refreshes the cached list. */
export const useToggleFavouriteVenue = (userId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ placeName, isFavourited }: { placeName: string; isFavourited: boolean }) => {
      if (!userId) throw new Error("You must be signed in to favourite venues.");
      await setFavouriteVenue(userId, placeName, isFavourited);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favourite-venues"] }),
  });
};
