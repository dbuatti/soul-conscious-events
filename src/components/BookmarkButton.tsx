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
  const baseEventId = eventId.split('-')[0];

  useEffect(() => {
    if (!isSessionLoading && user) {
      const checkBookmarkStatus = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('user_bookmarks')
          .select('*') // Changed to select all
          .eq('user_id', user.id)
          .eq('event_id', baseEventId) // Use baseEventId here
          .maybeSingle(); // Changed to maybeSingle()

        if (error) { // maybeSingle() will only return error for server issues, not for no rows found
          console.error('Error checking bookmark status:', error);
          toast.error('Failed to check bookmark status.');
        } else {
          setIsBookmarked(!!data); // data will be null if no row found
        }
        setLoading(false);
      };
      checkBookmarkStatus();
    } else if (!user) {
      setIsBookmarked(false); // Not logged in, so not bookmarked
    }
  }, [user, baseEventId, isSessionLoading]); // Depend on baseEventId

  const handleBookmarkToggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click if button is inside a card
    if (isSessionLoading) return;

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
      disabled={loading || isSessionLoading}
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