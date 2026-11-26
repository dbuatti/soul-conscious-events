import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import FilterDropdownsV2, { type FilterDropdownsV2Props } from '@/components/v2/FilterDropdownsV2';

export interface FilterBadge {
  type: keyof FilterDropdownsV2Props['currentFilters'];
  value?: string;
  label: string;
}

interface EventsToolbarProps {
  filters: FilterDropdownsV2Props['currentFilters'];
  onFilterChange: FilterDropdownsV2Props['onFilterChange'];
  availableVenues: string[];
  favouriteVenues: string[];
  onToggleFavouriteVenue: (placeName: string, isFavourited: boolean) => void;
  isUserLoggedIn: boolean;
  viewMode: FilterDropdownsV2Props['viewMode'];
  onViewModeChange: FilterDropdownsV2Props['onViewModeChange'];
  hasActiveFilters: boolean;
  searchTerm: string;
  onClearSearch: () => void;
  badges: FilterBadge[];
  onRemoveBadge: (type: FilterBadge['type'], value?: string) => void;
  onClearFilters: () => void;
  shownCount: number;
  totalCount: number;
  /** Show the compact search row (hero search is scrolled out of view). */
  showCompactSearch?: boolean;
  onSearchTermChange?: (value: string) => void;
}

/**
 * Sticky filter bar: the venue/category/price/state dropdowns, the view-mode
 * switcher, and the removable pill badges that describe the active filters.
 */
const EventsToolbar = ({
  filters,
  onFilterChange,
  availableVenues,
  favouriteVenues,
  onToggleFavouriteVenue,
  isUserLoggedIn,
  viewMode,
  onViewModeChange,
  hasActiveFilters,
  searchTerm,
  onClearSearch,
  badges,
  onRemoveBadge,
  onClearFilters,
  shownCount,
  totalCount,
  showCompactSearch = false,
  onSearchTermChange,
}: EventsToolbarProps) => (
  <div className="sticky top-[calc(4rem_+_env(safe-area-inset-top))] z-30 -mx-2 sm:-mx-4 px-2 sm:px-4 py-2.5 sm:py-3 mb-6 bg-background/85 backdrop-blur-xl border-b border-border/50">
    {showCompactSearch && onSearchTermChange && (
      <div className="relative mb-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search events, venues or suburbs"
          aria-label="Search events"
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className="h-11 pl-11 pr-10 rounded-full bg-card text-base shadow-sm focus-visible:ring-primary"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => onSearchTermChange('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )}
    <FilterDropdownsV2
      currentFilters={filters}
      onFilterChange={onFilterChange}
      availableVenues={availableVenues}
      favouriteVenues={favouriteVenues}
      onToggleFavouriteVenue={onToggleFavouriteVenue}
      isUserLoggedIn={isUserLoggedIn}
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
    />

    {hasActiveFilters && (
      <div className="flex flex-wrap items-center gap-2 pt-3 animate-in fade-in">
        {searchTerm && (
          <span className={"inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary pl-3 pr-1.5 py-1 text-xs font-medium"}>
            “{searchTerm}”
            <button type="button" onClick={onClearSearch} aria-label="Clear search" className="rounded-full p-0.5 hover:bg-primary/15"><X className="h-3.5 w-3.5" /></button>
          </span>
        )}
        {badges.map((b) => (
          <span key={`${b.type}-${b.label}`} className={cn("inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary pl-3 pr-1.5 py-1 text-xs font-medium")}>
            {b.label}
            <button type="button" onClick={() => onRemoveBadge(b.type, b.value)} aria-label={`Remove ${b.label} filter`} className="rounded-full p-0.5 hover:bg-primary/15"><X className="h-3.5 w-3.5" /></button>
          </span>
        ))}
        <button type="button" onClick={onClearFilters} className="text-xs font-medium text-muted-foreground hover:text-primary underline-offset-4 hover:underline ml-1">
          Clear all
        </button>
        <span className="ml-auto text-xs text-muted-foreground">
          {shownCount} of {totalCount}
        </span>
      </div>
    )}
  </div>
);

export default EventsToolbar;