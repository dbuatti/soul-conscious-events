interface Window {
  google: typeof google;
}

declare namespace google {
  namespace maps {
    // Add LatLng and LatLngBounds types
    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }

    class LatLngBounds {
      constructor(sw?: LatLng | LatLngLiteral, ne?: LatLng | LatLngLiteral);
      extend(latLng: LatLng | LatLngLiteral): LatLngBounds;
      getCenter(): LatLng;
      getNorthEast(): LatLng;
      getSouthWest(): LatLng;
      contains(latLng: LatLng | LatLngLiteral): boolean;
      intersects(other: LatLngBounds | LatLngBoundsLiteral): boolean;
      isEmpty(): boolean;
      union(other: LatLngBounds | LatLngBoundsLiteral): LatLngBounds;
      toUrlValue(precision?: number): string;
      equals(other: LatLngBounds | LatLngBoundsLiteral): boolean;
      toString(): string;
      toLiteral(): LatLngBoundsLiteral;
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    interface LatLngBoundsLiteral {
      east: number;
      north: number;
      south: number;
      west: number;
    }

    namespace places {
      class Autocomplete {
        constructor(inputField: HTMLInputElement, options?: AutocompleteOptions);
        addListener(eventName: string, handler: Function): void;
        getPlace(): PlaceResult;
      }

      interface AutocompleteOptions {
        bounds?: LatLngBounds | LatLngBoundsLiteral;
        componentRestrictions?: ComponentRestrictions;
        fields?: string[];
        strictBounds?: boolean;
        types?: string[];
      }

      interface ComponentRestrictions {
        country?: string | string[];
      }

      interface PlaceResult {
        formatted_address?: string;
        // Add other fields you might use, e.g., geometry, name, etc.
      }
    }
  }
}