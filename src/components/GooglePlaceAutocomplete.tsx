import React, { useRef, useEffect, useState } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null); // Ref for the container div
  const autocompleteElementRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const [isApiLoaded, setIsApiLoaded] = useState(false);

  useEffect(() => {
    const handleGoogleMapsApiReady = () => {
      setIsApiLoaded(true);
    };

    if (window.google && window.google.maps && window.google.maps.places) {
      setIsApiLoaded(true);
    } else {
      window.addEventListener('google-maps-api-ready', handleGoogleMapsApiReady);
    }

    return () => {
      window.removeEventListener('google-maps-api-ready', handleGoogleMapsApiReady);
    };
  }, []);

  useEffect(() => {
    if (containerRef.current && isApiLoaded && window.google && window.google.maps && window.google.maps.places) {
      // Clear any existing autocomplete element to prevent duplicates on re-render
      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }

      const autocompleteElement = document.createElement('google-maps-place-autocomplete') as google.maps.places.PlaceAutocompleteElement;
      autocompleteElement.setAttribute('placeholder', placeholder || '');
      autocompleteElement.setAttribute('class', className || ''); // Apply classes to the custom element
      autocompleteElement.setAttribute('id', name); // Ensure ID is set for accessibility/labels

      containerRef.current.appendChild(autocompleteElement);
      autocompleteElementRef.current = autocompleteElement;

      const melbourneBounds = new window.google.maps.LatLngBounds(
        new window.google.maps.LatLng(-38.2, 144.5),
        new window.google.maps.LatLng(-37.5, 145.5)
      );
      // Set bounds and component restrictions
      autocompleteElement.setAttribute('bounds', JSON.stringify(melbourneBounds.toJSON()));
      autocompleteElement.setAttribute('component-restrictions', JSON.stringify({ country: 'au' }));
      autocompleteElement.setAttribute('fields', 'formatted_address,name,id,displayName'); // Request necessary fields

      const handlePlaceSelect = async (event: CustomEvent<{ place: google.maps.places.PlaceResult }>) => {
        const place = event.detail.place;
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
      };

      autocompleteElement.addEventListener('gmp-placeselect', handlePlaceSelect);

      // Set initial value from form state
      const initialValue = form.getValues(name);
      if (initialValue) {
        autocompleteElement.value = initialValue;
      }

      return () => {
        autocompleteElement.removeEventListener('gmp-placeselect', handlePlaceSelect);
        if (containerRef.current && autocompleteElementRef.current) {
          containerRef.current.removeChild(autocompleteElementRef.current);
        }
      };
    }
  }, [containerRef, isApiLoaded, form, name, addressName, stateName, placeholder, className]);

  return (
    <div ref={containerRef} className="w-full">
      {/* The custom element will be appended here */}
    </div>
  );
};

export default GooglePlaceAutocomplete;