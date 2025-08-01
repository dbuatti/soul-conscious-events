import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { X, Search, Filter as FilterIcon, CalendarDays, List } from 'lucide-react';
import { eventTypes, australianStates } from '@/lib/constants';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';

interface FilterOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: {
    searchTerm: string;
    eventType: string;
    state: string;
    dateFilter: string;
  };
  onApplyFilters: (filters: {
    searchTerm: string;
    eventType: string;
    state: string;
    dateFilter: string;
  }) => void;
  onClearAllFilters: () => void;
}

const filterSchema = z.object({
  searchTerm: z.string().optional(),
  eventType: z.string().optional(),
  state: z.string().optional(),
  dateFilter: z.string().optional(),
});

const FilterOverlay: React.FC<FilterOverlayProps> = ({
  isOpen,
  onClose,
  currentFilters,
  onApplyFilters,
  onClearAllFilters,
}) => {
  const isMobile = useIsMobile();

  const form = useForm<z.infer<typeof filterSchema>>({
    resolver: zodResolver(filterSchema),
    defaultValues: currentFilters,
  });

  React.useEffect(() => {
    form.reset(currentFilters);
  }, [currentFilters, form]);

  const onSubmit = (values: z.infer<typeof filterSchema>) => {
    onApplyFilters({
      searchTerm: values.searchTerm || '',
      eventType: values.eventType || 'All',
      state: values.state || 'All',
      dateFilter: values.dateFilter || 'All Upcoming',
    });
    onClose();
  };

  const handleClearForm = () => {
    form.reset({
      searchTerm: '',
      eventType: 'All',
      state: 'All',
      dateFilter: 'All Upcoming',
    });
    onClearAllFilters();
    onClose();
  };

  const Wrapper = isMobile ? Sheet : Dialog;
  const Content = isMobile ? SheetContent : DialogContent;
  const Header = isMobile ? SheetHeader : DialogHeader;
  const Title = isMobile ? SheetTitle : DialogTitle;
  const Footer = isMobile ? SheetFooter : DialogFooter;
  const Close = isMobile ? SheetClose : DialogClose;

  const hasDraftChanges =
    form.watch('searchTerm') !== currentFilters.searchTerm ||
    form.watch('eventType') !== currentFilters.eventType ||
    form.watch('state') !== currentFilters.state ||
    form.watch('dateFilter') !== currentFilters.dateFilter;

  const hasActiveFilters =
    currentFilters.searchTerm !== '' ||
    currentFilters.eventType !== 'All' ||
    currentFilters.state !== 'All' ||
    currentFilters.dateFilter !== 'All Upcoming';

  return (
    <Wrapper open={isOpen} onOpenChange={onClose}>
      <Content className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto dark:bg-card dark:border-border">
        <Header>
          <Title className="text-3xl font-bold text-foreground text-center">
            <FilterIcon className="inline-block mr-2 h-7 w-7 text-primary" /> Filter Events
          </Title>
        </Header>
        <div className="p-4 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="searchTerm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Search Events</FormLabel>
                    <FormControl>
                      <Input placeholder="Search by name, location, organizer..." {...field} className="focus-visible:ring-primary" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="focus-visible:ring-primary">
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="dark:bg-card dark:border-border">
                        {eventTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="focus-visible:ring-primary">
                          <SelectValue placeholder="All States" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="dark:bg-card dark:border-border">
                        {australianStates.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateFilter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Range</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="focus-visible:ring-primary">
                          <SelectValue placeholder="All Upcoming" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="dark:bg-card dark:border-border">
                        <SelectItem value="All Upcoming">All Upcoming</SelectItem>
                        <SelectItem value="Today">Today</SelectItem>
                        <SelectItem value="This Week">This Week</SelectItem>
                        <SelectItem value="This Month">This Month</SelectItem>
                        <SelectItem value="Past Events">Past Events</SelectItem>
                        <SelectItem value="All Events">All Events</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 mt-6">
                {hasActiveFilters && (
                  <Button type="button" variant="outline" onClick={handleClearForm} className="transition-all duration-300 ease-in-out transform hover:scale-105">
                    Clear All
                  </Button>
                )}
                <Button type="submit" disabled={!hasDraftChanges} className="transition-all duration-300 ease-in-out transform hover:scale-105 bg-primary hover:bg-primary/80 text-primary-foreground">
                  Apply Filters
                </Button>
              </div>
            </form>
          </Form>
        </div>
        <Footer className="flex justify-end p-4 border-t border-border">
          <Close asChild>
            <Button variant="secondary" className="transition-all duration-300 ease-in-out transform hover:scale-105">
              Close
            </Button>
          </Close>
        </Footer>
      </Content>
    </Wrapper>
  );
};

export default FilterOverlay;