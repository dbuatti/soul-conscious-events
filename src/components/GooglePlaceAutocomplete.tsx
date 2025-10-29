import React, { useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { UseFormReturn } from 'react-hook-form';
import { extractAustralianState } from '@/lib/utils';
import { toast } from 'sonner';

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
  const autocompleteRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);

  useEffect(() => {
    const initializeAutocomplete = () => {
      if (inputRef.current && window.google && window.google.maps && window.google.maps.places) {
        // Create the PlaceAutocompleteElement
        const autocompleteElement = document.createElement('google-maps-place-autocomplete') as google.maps.places.PlaceAutocompleteElement;
        autocompleteElement.setAttribute('placeholder', placeholder || '');
        autocompleteElement.setAttribute('class', inputRef.current.className); // Copy classes for styling

        // Replace the original input with the custom element
        inputRef.current.parentNode?.replaceChild(autocompleteElement, inputRef.current);
        autocompleteRef.current = autocompleteElement;

        const melbourneBounds = new window.google.maps.LatLngBounds(
          new window.google.maps.LatLng(-38.2, 144.5),
          new window.google.maps.LatLng(-37.5, 145.5)
        );

        autocompleteElement.addEventListener('gmp-placeselect', async (event: CustomEvent<{ place: google.maps.places.PlaceResult }>) => {
          const place = event.detail.place; // Corrected access to 'place'
          if (place) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ placeId: place.id }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                const fullAddress = results[0].formatted_address || '';
                form.setValue(name, place.displayName || results[0].address_components.find(comp => comp.types.includes('establishment') || comp.types.includes('point_of_interest'))?.long_name || '', { shouldValidate: true });
                form.setValue(addressName, fullAddress, { shouldValidate: true });

                const extractedState = extractAustralianState(fullAddress);
                if (extractedState) {
                  form.setValue(stateName, extractedState, { shouldValidate: true });
                } else {
                  form.setValue(stateName, '', { shouldValidate: true });
                }
              } else {
                console.error('Geocoding failed:', status);
                toast.error('Failed to get full address details for the selected place.');
              }
            });
          }
        });

        // Set initial value if available
        const initialValue = form.getValues(name);
        if (initialValue) {
          autocompleteElement.value = initialValue;
        }
      }
    };

    // Listen for the Google Maps API to be ready
    const handleGoogleMapsApiReady = () => {
      initializeAutocomplete();
    };

    if (window.google && window.google.maps && window.google.maps.places) {
      initializeAutocomplete();
    } else {
      window.addEventListener('google-maps-api-ready', handleGoogleMapsApiReady);
    }

    return () => {
      window.removeEventListener('google-maps-api-ready', handleGoogleMapsApiReady);
      // Clean up the custom element if it was created
      if (autocompleteRef.current && inputRef.current?.parentNode) {
        autocompleteRef.current.parentNode.replaceChild(inputRef.current, autocompleteRef.current);
      }
    };
  }, [form, name, addressName, stateName, placeholder, className]);

  return (
    <Input
      ref={inputRef}
      id={name}
      placeholder={placeholder}
      className={className}
      // The actual input will be replaced by the custom element, but we need a ref for initial setup
      // and to potentially put it back if the component unmounts.
      // We also need to ensure react-hook-form can still manage its value.
      {...form.register(name)} // Register with react-hook-form
    />
  );
};

export default GooglePlaceAutocomplete;