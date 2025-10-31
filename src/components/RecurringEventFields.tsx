import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Repeat } from 'lucide-react';

interface RecurringEventFieldsProps {
  form: UseFormReturn<any>;
}

const recurrenceOptions = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'FORTNIGHTLY', label: 'Fortnightly' },
  { value: 'MONTHLY', label: 'Monthly' },
];

const RecurringEventFields: React.FC<RecurringEventFieldsProps> = ({ form }) => {
  return (
    <FormField
      control={form.control}
      name="recurringPattern"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center">
            <Repeat className="mr-2 h-4 w-4 text-muted-foreground" /> Recurrence (Optional)
          </FormLabel>
          <Select onValueChange={field.onChange} value={field.value || ''}>
            <FormControl>
              <SelectTrigger id="recurringPattern" className="focus-visible:ring-primary">
                <SelectValue placeholder="Does this event repeat?" />
              </SelectTrigger>
            </FormControl>
            <SelectContent className="dark:bg-card dark:border-border">
              <SelectItem value="">Does not repeat</SelectItem>
              {recurrenceOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default RecurringEventFields;