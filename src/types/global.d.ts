interface Window {
  google: typeof google;
}

declare namespace google {
  namespace maps {
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