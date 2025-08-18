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

  useEffect(() => {
    if (!isSessionLoading && user) {
      const checkBookmarkStatus = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('user_bookmarks')
          .select('event_id')
          .eq('user_id', user.id)
          .eq('event_id', eventId)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error('Error checking bookmark status:', error);
          toast.error('Failed to check bookmark status.');
        } else {
          setIsBookmarked(!!data);
        }
        setLoading(false);
      };
      checkBookmarkStatus();
    } else if (!user) {
      setIsBookmarked(false); // Not logged in, so not bookmarked
    }
  }, [user, eventId, isSessionLoading]);

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
        .eq('event_id', eventId);

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
        .insert([{ user_id: user.id, event_id: eventId }]);

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
      variant="outline"
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