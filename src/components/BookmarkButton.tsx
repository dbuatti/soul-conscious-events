import React, { useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BookmarkButtonProps {
  eventId: string;
  initialIsBookmarked?: boolean;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const BookmarkButton: React.FC<BookmarkButtonProps> = ({ eventId, initialIsBookmarked = false, className, size = 'icon' }) => {
  const { user, isLoading: isSessionLoading } = useSession();
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
  const [loading, setLoading] = useState(false);

  // Determine the actual ID to use for database operations (base UUID)
  // 1. Handle composite IDs (UUID-date) from recurring instances
  let baseEventId = eventId.split('-')[0];
  
  // 2. Basic validation: A UUID is 36 characters long. If the extracted ID is too short,
  // it's likely an invalid ID from the database or a truncated ID. We must prevent querying with it.
  // We'll use a heuristic check for a valid UUID length (e.g., > 10 characters to catch short IDs like 'ff59ff77')
  const isValidUuidFormat = baseEventId.length > 10 && baseEventId.includes('-');

  // If the ID is short and doesn't look like a UUID, we treat it as invalid for bookmarking.
  if (baseEventId.length < 36 && !isValidUuidFormat) {
    // If the ID is short (like 'ff59ff77'), we assume it's the full ID, but if it's not a UUID,
    // we set it to null to prevent the query from running and throwing a 400 error.
    // We only allow the query if the ID is a full UUID or a composite ID where the base is a UUID.
    // Since we cannot reliably validate a UUID without a heavy regex, we rely on the length check.
    // If the ID is exactly 8 characters (like in the error), it's definitely not a UUID.
    if (baseEventId.length < 30) {
      baseEventId = ''; // Set to empty string to skip query
    }
  }

  useEffect(() => {
    if (!isSessionLoading && user && baseEventId) {
      const checkBookmarkStatus = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('user_bookmarks')
          .select('*')
          .eq('user_id', user.id)
          .eq('event_id', baseEventId) // Use baseEventId here
          .maybeSingle();

        if (error) {
          console.error('Error checking bookmark status:', error);
          toast.error('Failed to check bookmark status.');
        } else {
          setIsBookmarked(!!data);
        }
        setLoading(false);
      };
      checkBookmarkStatus();
    } else if (!user || !baseEventId) {
      setIsBookmarked(false); // Not logged in or invalid event ID, so not bookmarked
    }
  }, [user, baseEventId, isSessionLoading]);

  const handleBookmarkToggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click if button is inside a card
    if (isSessionLoading || !baseEventId) return;

    if (!user) {
      toast.info('Please log in to bookmark events.');
      return;
    }

    setLoading(true);
    if (isBookmarked) {
      // Remove bookmark
      const { error } = await supabase
        .from('user_bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('event_id', baseEventId); // Use baseEventId here

      if (error) {
        console.error('Error removing bookmark:', error);
        toast.error('Failed to remove bookmark.');
      } else {
        setIsBookmarked(false);
        toast.success('Event unbookmarked!');
      }
    } else {
      // Add bookmark
      const { error } = await supabase
        .from('user_bookmarks')
        .insert([{ user_id: user.id, event_id: baseEventId }]); // Use baseEventId here

      if (error) {
        console.error('Error adding bookmark:', error);
        toast.error('Failed to add bookmark.');
      } else {
        setIsBookmarked(true);
        toast.success('Event bookmarked!');
      }
    }
    setLoading(false);
  };

  return (
    <Button
      variant="ghost" // Changed to ghost for minimalist look
      size={size}
      onClick={handleBookmarkToggle}
      disabled={loading || isSessionLoading || !baseEventId} // Disable if baseEventId is invalid
      className={cn(
        "transition-all duration-300 ease-in-out transform hover:scale-105",
        isBookmarked ? "bg-primary text-primary-foreground hover:bg-primary/80" : "text-muted-foreground hover:bg-accent",
        className
      )}
      title={isBookmarked ? "Remove from Bookmarks" : "Add to Bookmarks"}
    >
      <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-current")} />
    </Button>
  );
};

export default BookmarkButton;