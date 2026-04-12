import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, Search, Star, List, CalendarDays, Music, Sparkles, Heart, Users, Palette, Utensils, Leaf, GraduationCap, Globe, Zap, HelpCircle } from 'lucide-react';
import { v2EventCategories, v2PriceOptions, v2Venues, v2States, v2DateOptions } from '@/lib/v2/constants';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export interface FilterDropdownsV2Props {
  currentFilters: {
    date: string;
    category: string[];
    venue: string[];
    price: string[];
    state: string[];
  };
  onFilterChange: (filters: FilterDropdownsV2Props['currentFilters']) => void;
  availableVenues: string[];
  favouriteVenues: string[];
  onToggleFavouriteVenue: (placeName: string, isFavourited: boolean) => void;
  isUserLoggedIn: boolean;
  viewMode: 'list' | 'calendar';
  onViewModeChange: (mode: 'list' | 'calendar') => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  'Wellness': <Heart className="h-3.5 w-3.5 mr-2" />,
  'Dance & Movement': <Zap className="h-3.5 w-3.5 mr-2" />,
  'Consciousness & Spirituality': <Sparkles className="h-3.5 w-3.5 mr-2" />,
  'Arts & Creativity': <Palette className="h-3.5 w-3.5 mr-2" />,
  'Community & Social': <Users className="h-3.5 w-3.5 mr-2" />,
  'Music': <Music className="h-3.5 w-3.5 mr-2" />,
  'Food & Drink': <Utensils className="h-3.5 w-3.5 mr-2" />,
  'Relationships & Connection': <Heart className="h-3.5 w-3.5 mr-2" />,
  'Talks & Learning': <GraduationCap className="h-3.5 w-3.5 mr-2" />,
  'Local Culture': <Globe className="h-3.5 w-3.5 mr-2" />,
  'Nature & Outdoors': <Leaf className="h-3.5 w-3.5 mr-2" />,
  'Other': <HelpCircle className="h-3.5 w-3.5 mr-2" />,
};

const FilterDropdownsV2: React.FC<FilterDropdownsV2Props> = ({
  currentFilters,
  onFilterChange,
  availableVenues,
  favouriteVenues,
  onToggleFavouriteVenue,
  isUserLoggedIn,
  viewMode,
  onViewModeChange,
}) => {
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [venueSearchTerm, setVenueSearchTerm] = useState('');
  const [stateSearchTerm, setStateSearchTerm] = useState('');

  const handleSingleSelectChange = (filterType: 'date', value: string) => {
    onFilterChange({ ...currentFilters, [filterType]: value });
  };

  const handleMultiSelectChange = (filterType: 'category' | 'venue' | 'price' | 'state', value: string) => {
    const currentValues = currentFilters[filterType];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(item => item !== value)
      : [...currentValues, value];
    onFilterChange({ ...currentFilters, [filterType]: newValues });
  };

  const getTriggerText = (filterType: keyof FilterDropdownsV2Props['currentFilters'], label: string) => {
    const values = currentFilters[filterType];
    if (filterType === 'date') return values;
    if (Array.isArray(values)) {
      if (values.length === 0) return label;
      if (values.length === 1) return values[0];
      return `${label} (${values.length})`;
    }
    return label;
  };

  const renderMultiSelectDropdownContent = (
    filterType: 'category' | 'venue' | 'price' | 'state',
    options: string[],
    searchTerm: string | null,
    setSearchTerm: ((term: string) => void) | null,
    placeholder: string | null
  ) => {
    const filteredOptions = searchTerm
      ? options.filter(option => option.toLowerCase().includes(searchTerm.toLowerCase()))
      : options;

    let favouriteOptions: string[] = [];
    let otherOptions: string[] = [];

    if (filterType === 'venue' && isUserLoggedIn) {
      favouriteOptions = filteredOptions.filter(venue => favouriteVenues.includes(venue));
      otherOptions = filteredOptions.filter(venue => !favouriteVenues.includes(venue));
    } else {
      otherOptions = filteredOptions;
    }

    const renderOptionItem = (option: string, isFavourited: boolean) => (
      <div key={option} className="flex items-center justify-between group">
        <DropdownMenuCheckboxItem
          checked={currentFilters[filterType].includes(option)}
          onCheckedChange={() => handleMultiSelectChange(filterType, option)}
          onSelect={(e) => e.preventDefault()}
          className="cursor-pointer flex-grow"
        >
          <div className="flex items-center">
            {filterType === 'category' && categoryIcons[option]}
            {option}
          </div>
        </DropdownMenuCheckboxItem>
        {filterType === 'venue' && isUserLoggedIn && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 p-0 mr-2 text-muted-foreground hover:text-yellow-500 transition-colors duration-200"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onToggleFavouriteVenue(option, isFavourited);
            }}
          >
            <Star className={cn("h-4 w-4", isFavourited && "fill-current text-yellow-500")} />
          </Button>
        )}
      </div>
    );

    const content = (
      <>
        {searchTerm !== null && setSearchTerm !== null && placeholder !== null && (
          <div className="relative mb-2 px-2">
            <Search className="absolute left-4 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={placeholder}
              className="pl-8 h-9 rounded-lg bg-secondary/50 border-none focus-visible:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
        {filterType === 'venue' && isUserLoggedIn && favouriteOptions.length > 0 && (
          <>
            <DropdownMenuLabel className="text-[10px] font-black text-muted-foreground/60 px-3 py-1 uppercase tracking-widest">Favourites</DropdownMenuLabel>
            {favouriteOptions.map(option => renderOptionItem(option, true))}
            <DropdownMenuSeparator className="my-1 opacity-20" />
          </>
        )}
        {otherOptions.length > 0 && (
          <>
            {filterType === 'venue' && isUserLoggedIn && favouriteOptions.length > 0 && (
              <DropdownMenuLabel className="text-[10px] font-black text-muted-foreground/60 px-3 py-1 uppercase tracking-widest">All Venues</DropdownMenuLabel>
            )}
            {otherOptions.map(option => renderOptionItem(option, false))}
          </>
        )}
      </>
    );

    return (
      <DropdownMenuContent className="w-64 p-2 glass rounded-2xl shadow-2xl border-white/20">
        {options.length > 6 ? <ScrollArea className="h-64">{content}</ScrollArea> : content}
      </DropdownMenuContent>
    );
  };

  const buttonClasses = "flex items-center gap-2 rounded-xl px-4 py-2 h-10 bg-secondary/50 border-none hover:bg-secondary transition-all text-sm font-medium";

  return (
    <div className="flex flex-col lg:flex-row items-center gap-4 w-full">
      <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-center lg:justify-start">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={buttonClasses}>
              {getTriggerText('date', 'Date')} <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48 p-2 glass rounded-2xl shadow-2xl border-white/20">
            {v2DateOptions.map((option) => (
              <DropdownMenuCheckboxItem
                key={option}
                checked={currentFilters.date === option}
                onCheckedChange={() => handleSingleSelectChange('date', option)}
                className="rounded-lg"
              >
                {option}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={buttonClasses}>
              {getTriggerText('category', 'Category')} <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          {renderMultiSelectDropdownContent('category', v2EventCategories, categorySearchTerm, setCategorySearchTerm, 'Search categories')}
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={buttonClasses}>
              {getTriggerText('venue', 'Venue')} <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          {renderMultiSelectDropdownContent('venue', availableVenues, venueSearchTerm, setVenueSearchTerm, 'Search venues')}
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={buttonClasses}>
              {getTriggerText('price', 'Price')} <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          {renderMultiSelectDropdownContent('price', v2PriceOptions, null, null, null)}
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={buttonClasses}>
              {getTriggerText('state', 'State')} <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          {renderMultiSelectDropdownContent('state', v2States, stateSearchTerm, setStateSearchTerm, 'Search states')}
        </DropdownMenu>
      </div>

      <div className="flex items-center bg-secondary/50 p-1 rounded-xl ml-auto">
        <ToggleGroup type="single" value={viewMode} onValueChange={(value: 'list' | 'calendar') => value && onViewModeChange(value)}>
          <ToggleGroupItem value="list" className="rounded-lg h-8 w-10 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="calendar" className="rounded-lg h-8 w-10 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <CalendarDays className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
};

export default FilterDropdownsV2;