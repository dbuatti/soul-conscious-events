import React from 'react';
import { format, parseISO } from 'date-fns';
import { DollarSign, Calendar, Clock, MapPin } from 'lucide-react';
import { Event } from '@/types/event';

const eventGradients: Record<string, string> = {
  Music: 'from-rose-900 via-purple-900 to-indigo-900',
  Workshop: 'from-amber-800 via-orange-700 to-red-800',
  Meditation: 'from-teal-800 via-cyan-800 to-blue-900',
  'Sound Bath': 'from-violet-900 via-purple-800 to-fuchsia-900',
  'Open Mic': 'from-yellow-800 via-amber-700 to-orange-800',
  Foraging: 'from-green-900 via-emerald-800 to-teal-900',
  'Community Gathering': 'from-sky-800 via-blue-700 to-indigo-800',
  Other: 'from-slate-800 via-gray-700 to-neutral-800',
};

const eventPatterns: Record<string, string> = {
  Music: '♪ ♫ ♪',
  Workshop: '✦ ◆ ✦',
  Meditation: '◎ ○ ◎',
  'Sound Bath': '≋ ~ ≋',
  'Open Mic': '🎤 ✦ 🎤',
  Foraging: '❋ ✿ ❋',
  'Community Gathering': '⟡ ✦ ⟡',
  Other: '· · ·',
};

interface EventCardFallbackProps {
  event: Event;
}

const EventCardFallback: React.FC<EventCardFallbackProps> = ({ event }) => {
  const gradient = eventGradients[event.event_type || 'Other'] || eventGradients.Other;
  const pattern = eventPatterns[event.event_type || 'Other'] || eventPatterns.Other;

  let dateStr = '';
  try {
    dateStr = format(parseISO(event.event_date), 'EEE, MMM d');
  } catch { /* ignore */ }

  const isFree = event.price?.toLowerCase().includes('free');
  const isDonation = event.price?.toLowerCase().includes('donation');
  const displayPrice = event.price?.replace(/\$/g, '') || '';

  return (
    <div className={`w-full h-full bg-gradient-to-br ${gradient} relative overflow-hidden flex flex-col items-center justify-center text-white p-4 sm:p-6`}>
      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-[0.07] flex items-center justify-center text-[80px] sm:text-[120px] font-bold tracking-[0.3em] select-none pointer-events-none">
        {pattern}
      </div>
      
      {/* Decorative circles */}
      <div className="absolute -top-8 -right-8 w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white/[0.06]" />
      <div className="absolute -bottom-6 -left-6 w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-white/[0.04]" />

      {/* Content */}
      <div className="relative z-10 text-center flex flex-col items-center gap-1.5 sm:gap-3">
        {event.event_type && (
          <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.25em] bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
            {event.event_type}
          </span>
        )}
        
        <h3 className="font-heading font-black text-lg sm:text-3xl leading-tight tracking-tight max-w-[90%] line-clamp-2">
          {event.event_name}
        </h3>

        <div className="flex items-center gap-3 sm:gap-5 text-white/70 text-[10px] sm:text-xs mt-1">
          {dateStr && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {dateStr}
            </span>
          )}
          {event.event_time && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {event.event_time}
            </span>
          )}
          {event.geographical_state && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {event.geographical_state}
            </span>
          )}
        </div>

        {displayPrice && (
          <div className="flex items-center bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full mt-1">
            {!isFree && !isDonation && <DollarSign className="h-3 w-3 mr-0.5" />}
            <span className="font-bold text-xs sm:text-sm">{isFree ? 'Free' : isDonation ? 'Donation' : displayPrice}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCardFallback;
