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
import { v2EventCategories, v2PriceOptions, v2Venues, v2Areas } from '@/lib/v2/constants';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface FilterDropdownsV2Props {
  currentFilters: {
    category: string;
    venue: string;
    price: string;
    area: string;
  };
  onFilterChange: (filters: { category: string; venue: string; price: string; area: string; }) => void;
  isMobile?: boolean;
}

const FilterDropdownsV2: React.FC<FilterDropdownsV2Props> = ({ currentFilters, onFilterChange, isMobile = false }) => {
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [venueSearchTerm, setVenueSearchTerm] = useState('');
  const [areaSearchTerm, setAreaSearchTerm] = useState('');

  const handleCheckboxChange = (filterType: keyof typeof currentFilters, value: string) => {
    onFilterChange({
      ...currentFilters,
      [filterType]: currentFilters[filterType] === value ? 'All' : value, // Toggle selection
    });
  };

  const renderDropdownContent = (
    filterType: keyof typeof currentFilters,
    options: string[],
    searchTerm: string,
    setSearchTerm: (term: string) => void,
    placeholder: string
  ) => {
    const filteredOptions = options.filter(option =>
      option.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <DropdownMenuContent className="w-64 p-2 dark:bg-card dark:border-border">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            className="pl-8 focus-visible:ring-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <ScrollArea className="h-48">
          {filteredOptions.map((option) => (
            <DropdownMenuCheckboxItem
              key={option}
              checked={currentFilters[filterType] === option}
              onCheckedChange={() => handleCheckboxChange(filterType, option)}
              className="cursor-pointer"
            >
              {option}
            </DropdownMenuCheckboxItem>
          ))}
        </ScrollArea>
      </DropdownMenuContent>
    );
  };

  const renderPriceDropdownContent = (options: string[]) => (
    <DropdownMenuContent className="w-48 p-2 dark:bg-card dark:border-border">
      {options.map((option) => (
        <DropdownMenuCheckboxItem
          key={option}
          checked={currentFilters.price === option}
          onCheckedChange={() => handleCheckboxChange('price', option)}
          className="cursor-pointer"
        >
          {option}
        </DropdownMenuCheckboxItem>
      ))}
    </DropdownMenuContent>
  );

  if (isMobile) {
    return (
      <div className="flex flex-col space-y-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              Category: {currentFilters.category === 'All' ? 'All' : currentFilters.category} <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          {renderDropdownContent('category', v2EventCategories, categorySearchTerm, setCategorySearchTerm, 'Search category')}
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              Venue: {currentFilters.venue === 'All' ? 'All' : currentFilters.venue} <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          {renderDropdownContent('venue', v2Venues, venueSearchTerm, setVenueSearchTerm, 'Search venue')}
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              Price: {currentFilters.price === 'All' ? 'All' : currentFilters.price} <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          {renderPriceDropdownContent(v2PriceOptions)}
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              Area: {currentFilters.area === 'All' ? 'All' : currentFilters.area} <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          {renderDropdownContent('area', v2Areas, areaSearchTerm, setAreaSearchTerm, 'Search area')}
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="flex space-x-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-1">
            Category <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        {renderDropdownContent('category', v2EventCategories, categorySearchTerm, setCategorySearchTerm, 'Search category')}
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-1">
            Venue <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        {renderDropdownContent('venue', v2Venues, venueSearchTerm, setVenueSearchTerm, 'Search venue')}
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-1">
            Price <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        {renderPriceDropdownContent(v2PriceOptions)}
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-1">
            Area <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        {renderDropdownContent('area', v2Areas, areaSearchTerm, setAreaSearchTerm, 'Search area')}
      </DropdownMenu>
    </div>
  );
};

export default FilterDropdownsV2;