import React, { useRef, useEffect, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { extractAustralianState } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input'; // Import shadcn Input

interface GooglePlaceAutocompleteProps {
  form: UseFormReturn<any>;
  name: string; // The form field name for the place name (e.g., 'placeName')
  addressName: string; // The form field name for the full address (e.g., 'fullAddress')
  stateName: string; // The form field name for the geographical state (e.g., 'geographicalState')
  placeholder?: string;
  className?: string;
}

const GooglePlaceAutocomplete: React.FC<GooglePlaceAutocompleteProps> = ({
  form,
  name,
  addressName,
  stateName,
  placeholder,
  className,
}) => {
  // For debugging: Render a standard Input instead of the custom Google Maps element
  // This helps confirm if the component itself is rendering.
  const fieldValue = form.watch(name); // Watch the field value to update the input

  return (
    <Input
      id={name}
      placeholder={placeholder}
      className={className}
      value={fieldValue || ''}
      onChange={(e) => {
        form.setValue(name, e.target.value, { shouldValidate: true });
        // For debugging, we won't do full geocoding here, just update the field.
        // In a real scenario, you'd still want to trigger geocoding or place selection.
      }}
    />
  );
};

export default GooglePlaceAutocomplete;