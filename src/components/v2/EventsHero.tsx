import { format, isToday, parseISO } from 'date-fns';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Event } from '@/types/event';

const QUICK_FILTERS = [
  { label: 'Music', value: 'Music' },
  { label: 'Meditation', value: 'Meditation' },
  { label: 'Sound Bath', value: 'Sound Bath' },
  { label: 'Workshops', value: 'Workshop' },
  { label: 'Community', value: 'Community Gathering' },
];

interface EventsHeroProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  selectedCategories: string[];
  onToggleQuickFilter: (category: string) => void;
  showNextWeekCount: boolean;
  nextWeekCount: number;
  comingUp: Event[];
  onViewDetails: (event: Event) => void;
}

/**
 * The hero banner: search box, quick category chips, the live next-7-days
 * count, and an optional "coming up" preview rail.
 */
const EventsHero = ({
  searchTerm,
  onSearchTermChange,
  selectedCategories,
  onToggleQuickFilter,
  showNextWeekCount,
  nextWeekCount,
  comingUp,
  onViewDetails,
}: EventsHeroProps) => (
  <section className="hero-glow relative overflow-hidden rounded-[2rem] px-5 py-10 sm:px-12 sm:py-14 mb-6 animate-in fade-in duration-700 lg:grid lg:grid-cols-[1fr_20rem] lg:gap-12 lg:items-center">
    <div>
      <div className="max-w-3xl">
        <p className="eyebrow mb-4">Conscious events across Australia</p>
        <h1 className="text-[2.6rem] leading-[1.02] sm:text-6xl xl:text-[4.25rem] font-heading font-semibold text-foreground">
          Find your people.
          <br />
          <span className="italic font-medium text-primary">Soulful gatherings</span> near you.
        </h1>
        <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
          Sound baths, breathwork, ecstatic dance, kirtan, circles and workshops, gathered in one calm place.
        </p>
      </div>

      <div className="mt-8 max-w-2xl">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search events, venues or suburbs"
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            aria-label="Search events"
            className="h-14 pl-14 pr-12 rounded-full border-border/80 bg-card text-base shadow-[0_10px_30px_-12px_hsl(20_40%_25%/0.25)] focus-visible:ring-primary"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchTermChange('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
          {QUICK_FILTERS.map((qf) => {
            const active = selectedCategories.includes(qf.value);
            return (
              <button
                key={qf.value}
                type="button"
                onClick={() => onToggleQuickFilter(qf.value)}
                aria-pressed={active}
                className={cn(
                  "whitespace-nowrap px-4 h-9 rounded-full text-sm font-medium transition-all border",
                  active
                    ? "bg-foreground border-foreground text-background"
                    : "bg-card/70 border-border/80 text-foreground/80 hover:border-primary/50 hover:text-primary"
                )}
              >
                {qf.label}
              </button>
            );
          })}
        </div>
      </div>

      {showNextWeekCount && (
        <p className="mt-8 text-sm text-muted-foreground">
          <span className="font-heading text-2xl font-semibold text-foreground mr-1.5">{nextWeekCount}</span>
          gatherings in the next 7 days
        </p>
      )}
    </div>

    {comingUp.length > 0 && (
      <aside className="hidden lg:block" aria-label="Coming up">
        <p className="eyebrow mb-3">Coming up</p>
        <ul className="space-y-3">
          {comingUp.map((event) => {
            const date = parseISO(event.event_date);
            return (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onViewDetails(event)}
                  className="group w-full flex items-center gap-3 rounded-2xl bg-card/80 backdrop-blur border border-border/60 p-2.5 pr-4 text-left shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
                >
                  <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                    {event.image_url && <img src={event.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-primary">
                      {isToday(date) ? 'Today' : format(date, 'EEE d MMM')}{event.event_time ? ` · ${event.event_time.split(/\s*[–-]\s*/)[0]}` : ''}
                    </span>
                    <span className="block font-heading text-lg font-semibold leading-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {event.event_name}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
    )}
  </section>
);

export default EventsHero;