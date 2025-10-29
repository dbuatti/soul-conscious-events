import React, { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator, // Import DropdownMenuSeparator
  DropdownMenuLabel, // Import DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, Search, Star } from 'lucide-react'; // Import Star icon
import { v2EventCategories, v2PriceOptions, v2Venues, v2States, v2DateOptions } from '@/lib/v2/constants';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface FilterDropdownsV2Props {
  currentFilters: {
    date: string;
    category: string[];
    venue: string[];
    price: string[];
    state: string[];
  };
  onFilterChange: (filters: FilterDropdownsV2Props['currentFilters']) => void;
  isMobile?: boolean;
  availableVenues: string[];
  favouriteVenues: string[]; // New prop for favourited venues
  onToggleFavouriteVenue: (placeName: string, isFavourited: boolean) => void; // New prop for toggling favourite
  isUserLoggedIn: boolean; // New prop to check if user is logged in
}

const FilterDropdownsV2: React.FC<FilterDropdownsV2Props> = ({
  currentFilters,
  onFilterChange,
  isMobile = false,
  availableVenues,
  favouriteVenues,
  onToggleFavouriteVenue,
  isUserLoggedIn,
}) => {
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [venueSearchTerm, setVenueSearchTerm] = useState('');
  const [stateSearchTerm, setStateSearchTerm] = useState('');

  const handleSingleSelectChange = (filterType: 'date', value: string) => {
    onFilterChange({
      ...currentFilters,
      [filterType]: value,
    });
  };

  const handleMultiSelectChange = (filterType: 'category' | 'venue' | 'price' | 'state', value: string) => {
    const currentValues = currentFilters[filterType];
    let newValues: string[];

    if (currentValues.includes(value)) {
      newValues = currentValues.filter(item => item !== value);
    } else {
      newValues = [...currentValues, value];
    }
    onFilterChange({
      ...currentFilters,
      [filterType]: newValues,
    });
  };

  const getTriggerText = (filterType: keyof FilterDropdownsV2Props['currentFilters'], label: string) => {
    const values = currentFilters[filterType];
    if (filterType === 'date') {
      return values;
    }
    if (Array.isArray(values)) {
      if (values.length === 0) {
        return label;
      }
      if (values.length === 1) {
        return values[0];
      }
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

    // Special handling for venue filter to sort favourites
    let sortedOptions = filteredOptions;
    let favouriteOptions: string[] = [];
    let otherOptions: string[] = [];

    if (filterType === 'venue' && isUserLoggedIn) {
      favouriteOptions = filteredOptions.filter(venue => favouriteVenues.includes(venue));
      otherOptions = filteredOptions.filter(venue => !favouriteVenues.includes(venue));
      sortedOptions = [...favouriteOptions, ...otherOptions]; // Favourites first
    }

    const content = (
      <>
        {searchTerm !== null && setSearchTerm !== null && placeholder !== null && (
          <div className="relative mb-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={placeholder}
              className="pl-8 focus-visible:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
        {filterType === 'venue' && isUserLoggedIn && favouriteOptions.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1">Your Favourites</DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1" />
          </>
        )}
        {sortedOptions.map((option) => {
          const isFavourited = filterType === 'venue' && favouriteVenues.includes(option);
          return (
            <div key={option} className="flex items-center justify-between group">
              <DropdownMenuCheckboxItem
                checked={currentFilters[filterType].includes(option)}
                onCheckedChange={() => handleMultiSelectChange(filterType, option)}
                onSelect={(e) => e.preventDefault()}
                className="cursor-pointer flex-grow"
              >
                {option}
              </DropdownMenuCheckboxItem>
              {filterType === 'venue' && isUserLoggedIn && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 p-0 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent dropdown item from being checked
                    e.preventDefault(); // Prevent dropdown from closing
                    onToggleFavouriteVenue(option, isFavourited);
                  }}
                  title={isFavourited ? "Unfavourite Venue" : "Favourite Venue"}
                >
                  <Star className={cn("h-4 w-4", isFavourited && "fill-current text-yellow-500")} />
                </Button>
              )}
            </div>
          );
        })}
        {filterType === 'venue' && isUserLoggedIn && favouriteOptions.length > 0 && otherOptions.length > 0 && (
          <>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1">Other Venues</DropdownMenuLabel>
          </>
        )}
      </>
    );

    if (filterType === 'price' || filteredOptions.length <= 5) {
      return <DropdownMenuContent className="w-64 p-2 dark:bg-card dark:border-border">{content}</DropdownMenuContent>;
    } else {
      return (
        <DropdownMenuContent className="w-64 p-2 dark:bg-card dark:border-border">
          <ScrollArea className="h-48">
            {content}
          </ScrollArea>
        </DropdownMenuContent>
      );
    }
  };

  const renderSingleSelectDropdownContent = (filterType: 'date', options: string[]) => (
    <DropdownMenuContent className="w-48 p-2 dark:bg-card dark:border-border">
      {options.map((option) => (
        <DropdownMenuCheckboxItem
          key={option}
          checked={currentFilters[filterType] === option}
          onCheckedChange={() => handleSingleSelectChange(filterType, option)}
          className="cursor-pointer"
        >
          {option}
        </DropdownMenuCheckboxItem>
      ))}
    </DropdownMenuContent>
  );

  const buttonClasses = "flex items-center gap-1 max-w-[140px] truncate rounded-xl px-4 py-2 h-9";

  if (isMobile) {
    return (
      <div className="flex flex-col space-y-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-between", buttonClasses)}>
              {getTriggerText('date', 'Date')} <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          {renderSingleSelectDropdownContent('date', v2DateOptions)}
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-between", buttonClasses)}>
              {getTriggerText('category', 'Category')} <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          {renderMultiSelectDropdownContent('category', v2EventCategories, categorySearchTerm, setCategorySearchTerm, 'Search category')}
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-between", buttonClasses)}>
              {getTriggerText('venue', 'Venue')} <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          {renderMultiSelectDropdownContent('venue', availableVenues, venueSearchTerm, setVenueSearchTerm, 'Search venue')}
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-between", buttonClasses)}>
              {getTriggerText('price', 'Price')} <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          {renderMultiSelectDropdownContent('price', v2PriceOptions, null, null, null)}
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-between", buttonClasses)}>
              {getTriggerText('state', 'State')} <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          {renderMultiSelectDropdownContent('state', v2States, stateSearchTerm, setStateSearchTerm, 'Search state')}
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="flex space-x-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={buttonClasses}>
            {getTriggerText('date', 'Date')} <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        {renderSingleSelectDropdownContent('date', v2DateOptions)}
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={buttonClasses}>
            {getTriggerText('category', 'Category')} <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        {renderMultiSelectDropdownContent('category', v2EventCategories, categorySearchTerm, setCategorySearchTerm, 'Search category')}
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={buttonClasses}>
            {getTriggerText('venue', 'Venue')} <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        {renderMultiSelectDropdownContent('venue', availableVenues, venueSearchTerm, setVenueSearchTerm, 'Search venue')}
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={buttonClasses}>
            {getTriggerText('price', 'Price')} <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        {renderMultiSelectDropdownContent('price', v2PriceOptions, null, null, null)}
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={buttonClasses}>
            {getTriggerText('state', 'State')} <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        {renderMultiSelectDropdownContent('state', v2States, stateSearchTerm, setStateSearchTerm, 'Search state')}
      </DropdownMenu>
    </div>
  );
};

export default FilterDropdownsV2;