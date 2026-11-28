import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import FilterDropdownsV2, { type FilterDropdownsV2Props } from '@/components/v2/FilterDropdownsV2';

interface EventsToolbarProps {
  filters: FilterDropdownsV2Props['currentFilters'];
  onFilterChange: FilterDropdownsV2Props['onFilterChange'];
  availableVenues: string[];
  favouriteVenues: string[];
  onToggleFavouriteVenue: (placeName: string, isFavourited: boolean) => void;
  isUserLoggedIn: boolean;
  viewMode: FilterDropdownsV2Props['viewMode'];
  onViewModeChange: FilterDropdownsV2Props['onViewModeChange'];
  searchTerm: string;
  /** Show the compact search row (hero search is scrolled out of view). */
  showCompactSearch?: boolean;
  onSearchTermChange?: (value: string) => void;
  showFilters?: boolean;
}

/**
 * Sticky filter bar: the venue/category/price/state dropdowns, the view-mode
 * switcher. Active filters show in the date wheel and state chips above it.
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
  searchTerm,
  showCompactSearch = false,
  onSearchTermChange,
  showFilters = true,
}: EventsToolbarProps) => (
  <div className="sticky top-0 z-30 -mx-2 sm:-mx-4 px-2 sm:px-4 py-2.5 sm:py-3 mb-6 bg-background/85 backdrop-blur-xl border-b border-border/50">
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
            className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary"
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
      showFilters={showFilters}
    />

  </div>
);

export default EventsToolbar;