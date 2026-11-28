import React, { useMemo } from 'react';
import { Copy, ExternalLink, Megaphone, MessageCircle, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import type { Event } from '@/types/event';
import {
  buildEventShareCaption,
  buildOrganiserShareCaption,
  eventAnalyticsId,
  getEventShareUrl,
} from '@/lib/growth';

interface ShareEventButtonProps {
  event: Event;
  className?: string;
  variant?: 'default' | 'secondary' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  iconOnly?: boolean;
  label?: string;
}

const ShareEventButton: React.FC<ShareEventButtonProps> = ({
  event,
  className,
  variant = 'secondary',
  size,
  iconOnly = false,
  label = 'Share',
}) => {
  const { user } = useSession();
  const shareUrl = useMemo(() => getEventShareUrl(event), [event]);
  const caption = useMemo(() => buildEventShareCaption(event), [event]);

  const logAction = (logType: string) => {
    void supabase.from('event_analytics_logs').insert([{
      event_id: eventAnalyticsId(event.id),
      user_id: user?.id || null,
      log_type: logType,
    }]).then(({ error }) => {
      if (error) console.error('Error logging share action:', error);
    });
  };

  const copyText = async (text: string, successMessage: string, logType: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
      logAction(logType);
    } catch {
      toast.error('Could not copy to clipboard. Please try again.');
    }
  };

  const shareNative = async () => {
    const shareData = {
      title: event.event_name,
      text: caption,
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        logAction('share');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          await copyText(shareUrl, 'Link copied to clipboard!', 'copy_event_link');
        }
      }
      return;
    }

    await copyText(shareUrl, 'Tracked link copied to clipboard!', 'copy_event_link');
  };

  const copyOrganiserCaption = () => {
    const source = new URLSearchParams(window.location.search).get('utm_source') || 'organiser';
    void copyText(
      buildOrganiserShareCaption(event, source),
      'Organiser caption copied — paste it with the event link.',
      'copy_organiser_caption',
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={iconOnly ? 'icon' : size}
          className={className}
          aria-label={iconOnly ? 'Share event' : undefined}
        >
          <Share2 className={iconOnly ? 'h-4 w-4' : 'mr-2 h-4 w-4'} />
          {!iconOnly && label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
        <DropdownMenuLabel className="px-3 py-2 text-xs text-muted-foreground">
          Share this event
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => void shareNative()} className="rounded-xl cursor-pointer">
          <Share2 className="mr-3 h-4 w-4 text-muted-foreground" /> Share event…
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => void copyText(shareUrl, 'Tracked link copied!', 'copy_event_link')}
          className="rounded-xl cursor-pointer"
        >
          <Copy className="mr-3 h-4 w-4 text-muted-foreground" /> Copy tracked link
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${caption}\n${shareUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => logAction('share_whatsapp')}
          >
            <MessageCircle className="mr-3 h-4 w-4 text-muted-foreground" /> Share on WhatsApp
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => void copyText(caption, 'Event caption copied!', 'copy_event_caption')}
          className="rounded-xl cursor-pointer"
        >
          <MessageCircle className="mr-3 h-4 w-4 text-muted-foreground" /> Copy event caption
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={copyOrganiserCaption} className="rounded-xl cursor-pointer">
          <Megaphone className="mr-3 h-4 w-4 text-muted-foreground" /> Copy organiser promo
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
          <a href={`/events/${eventAnalyticsId(event.id)}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-3 h-4 w-4 text-muted-foreground" /> Open full event page
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ShareEventButton;
