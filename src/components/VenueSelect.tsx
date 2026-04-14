import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Check, ChevronsUpDown, MapPin, Plus } from "lucide-react";
import { cn, extractAustralianState } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UseFormReturn } from 'react-hook-form';

interface VenueSelectProps {
  form: UseFormReturn<any>;
}

const VenueSelect: React.FC<VenueSelectProps> = ({ form }) => {
  const [open, setOpen] = useState(false);
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    const fetchVenues = async () => {
      const { data } = await supabase.from('venues').select('*').order('name');
      setVenues(data || []);
      setLoading(false);
    };
    fetchVenues();
  }, []);

  const selectedValue = form.watch('placeName');

  const handleSelectCustom = () => {
    if (inputValue.trim()) {
      form.setValue('placeName', inputValue.trim(), { shouldValidate: true });
      // Clear address if switching to custom, so user knows to fill it
      form.setValue('fullAddress', '', { shouldValidate: true });
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-12 rounded-xl bg-secondary/50 border-none hover:bg-secondary text-left font-normal"
        >
          {selectedValue ? (
            <span className="flex items-center truncate">
              <MapPin className="mr-2 h-4 w-4 text-primary shrink-0" /> 
              <span className="truncate">{selectedValue}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Select a known venue or type a new one...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl shadow-2xl border-border">
        <Command className="rounded-xl">
          <CommandInput 
            placeholder="Search venues..." 
            className="h-12" 
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty className="p-4 text-sm flex flex-col items-start gap-2">
              <span>No venue found.</span>
              <Button 
                type="button"
                variant="secondary" 
                size="sm"
                className="font-bold rounded-lg"
                onClick={handleSelectCustom}
              >
                <Plus className="mr-1 h-3 w-3" /> Use "{inputValue}"
              </Button>
            </CommandEmpty>
            <CommandGroup heading="Community Venues">
              {venues.map((venue) => (
                <CommandItem
                  key={venue.id}
                  value={venue.name}
                  onSelect={() => {
                    form.setValue('placeName', venue.name, { shouldValidate: true });
                    form.setValue('fullAddress', venue.full_address, { shouldValidate: true });
                    const state = extractAustralianState(venue.full_address);
                    if (state) form.setValue('geographicalState', state, { shouldValidate: true });
                    setOpen(false);
                  }}
                  className="cursor-pointer py-3"
                >
                  <Check className={cn("mr-2 h-4 w-4", selectedValue === venue.name ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span className="font-bold">{venue.name}</span>
                    <span className="text-xs text-muted-foreground line-clamp-1">{venue.full_address}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default VenueSelect;