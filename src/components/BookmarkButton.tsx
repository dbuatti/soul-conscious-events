import React, { useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { isValidEventId, getBaseEventId } from '@/utils/event-utils';

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
  const [isAnimating, setIsAnimating] = useState(false);

  const baseEventId = getBaseEventId(eventId);
  const isIdValid = isValidEventId(eventId);

  useEffect(() => {
    if (!isSessionLoading && user && isIdValid) {
      const checkBookmarkStatus = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('user_bookmarks')
          .select('*')
          .eq('user_id', user.id)
          .eq('event_id', baseEventId)
          .maybeSingle();

        if (!error) {
          setIsBookmarked(!!data);
        }
        setLoading(false);
      };
      checkBookmarkStatus();
    } else if (!user || !isIdValid) {
      setIsBookmarked(false);
    }
  }, [user, baseEventId, isSessionLoading, isIdValid]);

  const handleBookmarkToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSessionLoading || !isIdValid) return;

    if (!user) {
      toast.info('Please log in to bookmark events.');
      return;
    }

    setLoading(true);
    setIsAnimating(true);
    
    if (isBookmarked) {
      const { error } = await supabase
        .from('user_bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('event_id', baseEventId);

      if (!error) {
        setIsBookmarked(false);
        toast.success('Event unbookmarked!');
      }
    } else {
      const { error } = await supabase
        .from('user_bookmarks')
        .insert([{ user_id: user.id, event_id: baseEventId }]);

      if (!error) {
        setIsBookmarked(true);
        toast.success('Event bookmarked!');
      }
    }
    
    setLoading(false);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleBookmarkToggle}
      disabled={loading || isSessionLoading || !isIdValid}
      aria-label={isBookmarked ? "Remove from Bookmarks" : "Add to Bookmarks"}
      className={cn(
        "transition-all duration-300 ease-in-out transform hover:scale-105",
        isBookmarked ? "bg-primary text-primary-foreground hover:bg-primary/80" : "text-muted-foreground hover:bg-accent",
        isAnimating && "pop-in",
        className
      )}
      title={isBookmarked ? "Remove from Bookmarks" : "Add to Bookmarks"}
    >
      <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-current")} />
    </Button>
  );
};

export default BookmarkButton;