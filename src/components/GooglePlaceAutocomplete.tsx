import React, { useRef, useEffect, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { extractAustralianState } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface GooglePlaceAutocompleteProps {
  form: UseFormReturn<any>;
  name: string; // The form field name for the place name (e.g., 'placeName')
  addressName: string; // The form field name for the full address (e.g., 'fullAddress')
  stateName: string; // The form field name for the geographical state (e.g., 'geographicalState')
  placeholder?: string;
  className?: string;
}

// Extend JSX.IntrinsicElements to allow the custom tag without TS errors
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gmp-place-autocomplete': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        placeholder?: string;
        'component-restrictions'?: string;
        'fields'?: string;
        'onGmpPlaceselect'?: (event: CustomEvent<{ place: google.maps.places.PlaceResult }>) => void;
        // Add other properties if needed
      };
    }
  }
}

const GooglePlaceAutocomplete: React.FC<GooglePlaceAutocompleteProps> = ({
  form,
  name,
  addressName,
  stateName,
  placeholder,
  className,
}) => {
  const autocompleteRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const [mapApiLoaded, setMapApiLoaded] = useState(false);

  useEffect(() => {
    const handleGoogleMapsApiReady = () => {
      setMapApiLoaded(true);
    };

    if (window.google && window.google.maps) {
      setMapApiLoaded(true);
    } else {
      window.addEventListener('google-maps-api-ready', handleGoogleMapsApiReady);
    }

    return () => {
      window.removeEventListener('google-maps-api-ready', handleGoogleMapsApiReady);
    };
  }, []);

  const handlePlaceSelect = (event: CustomEvent<{ place: google.maps.places.PlaceResult }>) => {
    const place = event.detail.place;
    
    // Use name or displayName for place name
    const placeName = place.name || place.displayName || '';
    
    form.setValue(name, placeName, { shouldValidate: true });
    form.setValue(addressName, place.formatted_address || '', { shouldValidate: true });

    const extractedState = extractAustralianState(place.formatted_address || '');
    if (extractedState) {
      form.setValue(stateName, extractedState, { shouldValidate: true });
    } else {
      form.setValue(stateName, '', { shouldValidate: true });
    }
  };

  useEffect(() => {
    const element = autocompleteRef.current;
    if (element && mapApiLoaded && window.google && window.google.maps && window.google.maps.places) {
      
      // Set properties on the custom element
      element.componentRestrictions = { country: 'au' };
      element.fields = ['formatted_address', 'name', 'displayName'];
      element.placeholder = placeholder || 'Enter a location';

      // Attach event listener
      element.addEventListener('gmp-placeselect', handlePlaceSelect as EventListener);

      return () => {
        // Clean up event listener
        element.removeEventListener('gmp-placeselect', handlePlaceSelect as EventListener);
      };
    }
  }, [mapApiLoaded, form, name, addressName, stateName, placeholder]);

  // Watch the form field value to keep the custom element's value in sync
  const fieldValue = form.watch(name);
  
  // Manually update the custom element's value when the form state changes (e.g., on form reset or AI parse)
  useEffect(() => {
    if (autocompleteRef.current) {
      autocompleteRef.current.value = fieldValue || '';
    }
  }, [fieldValue]);

  // We render the custom element and apply styling via className
  return (
    <gmp-place-autocomplete
      ref={autocompleteRef as React.RefObject<HTMLElement>}
      className={cn(
        "w-full", // Ensure it takes full width
        className
      )}
      // Note: We cannot use React's onChange directly on the custom element for input changes, 
      // but we can use the gmp-placeselect event for selection.
    />
  );
};

export default GooglePlaceAutocomplete;