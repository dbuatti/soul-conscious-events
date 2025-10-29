import React, { useRef, useEffect, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { extractAustralianState } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [mapApiLoaded, setMapApiLoaded] = useState(false);

  useEffect(() => {
    const handleGoogleMapsApiReady = () => {
      setMapApiLoaded(true);
    };

    // Check immediately if Google Maps API is already loaded
    if (window.google && window.google.maps) {
      setMapApiLoaded(true);
    } else {
      window.addEventListener('google-maps-api-ready', handleGoogleMapsApiReady);
    }

    return () => {
      window.removeEventListener('google-maps-api-ready', handleGoogleMapsApiReady);
    };
  }, []);

  useEffect(() => {
    if (inputRef.current && mapApiLoaded && window.google && window.google.maps && window.google.maps.places) {
      const melbourneBounds = new window.google.maps.LatLngBounds(
        new window.google.maps.LatLng(-38.2, 144.5),
        new window.google.maps.LatLng(-37.5, 145.5)
      );

      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        bounds: melbourneBounds,
        componentRestrictions: { country: 'au' },
        fields: ['formatted_address', 'name'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        form.setValue(name, place.name || '', { shouldValidate: true });
        form.setValue(addressName, place.formatted_address || '', { shouldValidate: true });

        const extractedState = extractAustralianState(place.formatted_address || '');
        if (extractedState) {
          form.setValue(stateName, extractedState, { shouldValidate: true });
        } else {
          form.setValue(stateName, '', { shouldValidate: true });
        }
      });
    }
  }, [mapApiLoaded, form, name, addressName, stateName]);

  // Watch the form field value to keep the input element in sync
  const fieldValue = form.watch(name);

  return (
    <Input
      id={name}
      placeholder={placeholder}
      className={className}
      ref={inputRef}
      value={fieldValue || ''}
      onChange={(e) => form.setValue(name, e.target.value, { shouldValidate: true })}
    />
  );
};

export default GooglePlaceAutocomplete;