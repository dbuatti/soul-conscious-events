import React, { useRef, useEffect, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { extractAustralianState } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface GooglePlaceAutocompleteProps {
  form: UseFormReturn<any>;
  name: string;
  addressName: string;
  stateName: string;
  placeholder?: string;
  className?: string;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gmp-place-autocomplete': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        placeholder?: string;
        'component-restrictions'?: string;
        'fields'?: string;
        'onGmpPlaceselect'?: (event: CustomEvent<{ place: google.maps.places.PlaceResult }>) => void;
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
    const handleGoogleMapsApiReady = () => setMapApiLoaded(true);
    if (window.google && window.google.maps) {
      setMapApiLoaded(true);
    } else {
      window.addEventListener('google-maps-api-ready', handleGoogleMapsApiReady);
    }
    return () => window.removeEventListener('google-maps-api-ready', handleGoogleMapsApiReady);
  }, []);

  const handlePlaceSelect = (event: CustomEvent<{ place: google.maps.places.PlaceResult }>) => {
    const place = event.detail.place;
    const placeName = place.name || place.displayName || '';
    const formattedAddress = place.formatted_address || '';
    
    form.setValue(name, placeName, { shouldValidate: true });
    form.setValue(addressName, formattedAddress, { shouldValidate: true });

    const extractedState = extractAustralianState(formattedAddress);
    form.setValue(stateName, extractedState || '', { shouldValidate: true });
  };

  useEffect(() => {
    const element = autocompleteRef.current;
    if (element && mapApiLoaded && window.google?.maps?.places) {
      element.addEventListener('gmp-placeselect', handlePlaceSelect as EventListener);
      return () => element.removeEventListener('gmp-placeselect', handlePlaceSelect as EventListener);
    }
  }, [mapApiLoaded]);

  const fieldValue = form.watch(name);
  
  useEffect(() => {
    if (autocompleteRef.current) {
      (autocompleteRef.current as any).value = fieldValue || '';
    }
  }, [fieldValue]);

  return (
    <div className="relative w-full">
      <gmp-place-autocomplete
        ref={autocompleteRef as React.RefObject<HTMLElement>}
        className={cn(
          "w-full h-12 rounded-xl bg-secondary/50 border-none focus-within:ring-2 focus-within:ring-primary transition-all",
          className
        )}
        component-restrictions="AU"
        fields="formatted_address,name,displayName,geometry"
        placeholder={placeholder || 'Search for a venue or address...'}
      />
    </div>
  );
};

export default GooglePlaceAutocomplete;