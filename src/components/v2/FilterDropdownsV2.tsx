import React, { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, Search } from 'lucide-react';
import { v2EventCategories, v2PriceOptions, v2Areas, v2DateOptions } from '@/lib/v2/constants'; // Removed v2Venues import
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface FilterDropdownsV2Props {
  currentFilters: {
    date: string;
    category: string[];
    venue: string[];
    price: string[];
    area: string[];
  };
  onFilterChange: (filters: FilterDropdownsV2Props['currentFilters']) => void;
  isMobile?: boolean;
  availableVenues: string[]; // New prop for dynamic venues
}

const FilterDropdownsV2: React.FC<FilterDropdownsV2Props> = ({ currentFilters, onFilterChange, isMobile = false, availableVenues }) => {
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [venueSearchTerm, setVenueSearchTerm] = useState('');
  const [areaSearchTerm, setAreaSearchTerm] = useState('');

  const handleSingleSelectChange = (filterType: 'date', value: string) => {
    onFilterChange({
      ...currentFilters,
      [filterType]: value,
    });
  };

  const handleMultiSelectChange = (filterType: 'category' | 'venue' | 'price' | 'area', value: string) => {
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
      return values; // For single select, just show the value
    }
    if (Array.isArray(values)) {
      if (values.length === 0) {
        return label; // If nothing selected, show default label
      }
      if (values.length === 1) {
        return values[0]; // If one selected, show that item
      }
      return `${label} (${values.length})`; // If multiple selected, show count
    }
    return label; // Fallback
  };

  const renderMultiSelectDropdownContent = (
    filterType: 'category' | 'venue' | 'price' | 'area',
    options: string[],
    searchTerm: string | null,
    setSearchTerm: ((term: string) => void) | null,
    placeholder: string | null
  ) => {
    const filteredOptions = searchTerm
      ? options.filter(option => option.toLowerCase().includes(searchTerm.toLowerCase()))
      : options;

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
        {filteredOptions.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={currentFilters[filterType].includes(option)}
            onCheckedChange={() => handleMultiSelectChange(filterType, option)}
            className="cursor-pointer"
          >
            {option}
          </DropdownMenuCheckboxItem>
        ))}
      </>
    );

    // Conditionally wrap with ScrollArea based on filterType or number of options
    if (filterType === 'price' || filteredOptions.length <= 5) { // For price or small lists, no scroll area
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

  const buttonClasses = "flex items-center gap-1 max-w-[140px] truncate rounded-xl px-4 py-2 h-9"; // Increased max-w to 140px

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
              {getTriggerText('area', 'Area')} <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          {renderMultiSelectDropdownContent('area', v2Areas, areaSearchTerm, setAreaSearchTerm, 'Search area')}
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
            {getTriggerText('area', 'Area')} <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        {renderMultiSelectDropdownContent('area', v2Areas, areaSearchTerm, setAreaSearchTerm, 'Search area')}
      </DropdownMenu>
    </div>
  );
};

export default FilterDropdownsV2;