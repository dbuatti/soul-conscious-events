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

    // Add missing Google Maps core classes
    class Map {
      constructor(mapDiv: HTMLElement, opts?: MapOptions);
      setCenter(latLng: LatLng | LatLngLiteral): void;
      setZoom(zoom: number): void;
      setMapTypeControl(control: boolean): void;
      setStreetViewControl(control: boolean): void;
      setFullscreenControl(control: boolean): void;
      // Add other methods/properties as needed
    }

    interface MapOptions {
      center?: LatLng | LatLngLiteral;
      zoom?: number;
      mapTypeControl?: boolean;
      streetViewControl?: boolean;
      fullscreenControl?: boolean;
      // Add other options as needed
    }

    class Geocoder {
      geocode(request: GeocoderRequest, callback: GeocoderCallback): void;
    }

    interface GeocoderRequest {
      address?: string;
      location?: LatLng | LatLngLiteral;
      placeId?: string;
      bounds?: LatLngBounds | LatLngBoundsLiteral;
      componentRestrictions?: GeocoderComponentRestrictions;
      region?: string;
    }

    interface GeocoderComponentRestrictions {
      route?: string;
      locality?: string;
      administrativeArea?: string;
      country?: string;
      postalCode?: string;
    }

    type GeocoderStatus = 'OK' | 'ZERO_RESULTS' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'INVALID_REQUEST' | 'UNKNOWN_ERROR';

    type GeocoderCallback = (results: GeocoderResult[] | null, status: GeocoderStatus) => void;

    interface GeocoderResult {
      address_components: GeocoderAddressComponent[];
      formatted_address: string;
      geometry: GeocoderGeometry;
      place_id: string;
      plus_code?: PlusCode;
      types: string[];
      postcode_localities?: string[];
    }

    interface GeocoderAddressComponent {
      long_name: string;
      short_name: string;
      types: string[];
    }

    interface GeocoderGeometry {
      location: LatLng;
      location_type: GeocoderLocationType;
      viewport: LatLngBounds;
      bounds?: LatLngBounds;
    }

    type GeocoderLocationType = 'ROOFTOP' | 'RANGE_INTERPOLATED' | 'GEOMETRIC_CENTER' | 'APPROXIMATE';

    interface PlusCode {
      compound_code: string;
      global_code: string;
    }

    class InfoWindow {
      constructor(opts?: InfoWindowOptions);
      open(map?: Map | StreetViewPanorama, anchor?: Marker | StreetViewPanorama): void;
      close(): void;
      setContent(content: string | Node): void;
      // Add other methods/properties as needed
    }

    interface InfoWindowOptions {
      content?: string | Node;
      pixelOffset?: Size;
      position?: LatLng | LatLngLiteral;
      maxWidth?: number;
      zIndex?: number;
      disableAutoPan?: boolean;
    }

    class Marker {
      constructor(opts?: MarkerOptions);
      setMap(map: Map | null): void;
      addListener(eventName: string, handler: Function): void;
      // Add other methods/properties as needed
    }

    interface MarkerOptions {
      position?: LatLng | LatLngLiteral;
      map?: Map | StreetViewPanorama;
      icon?: string | Icon | Symbol;
      title?: string;
      // Add other options as needed
    }

    interface Icon {
      url: string;
      anchor?: Point;
      scaledSize?: Size;
      size?: Size;
      origin?: Point;
    }

    interface Symbol {
      path: SymbolPath | string;
      anchor?: Point;
      fillColor?: string;
      fillOpacity?: number;
      scale?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      rotation?: number;
    }

    enum SymbolPath {
      CIRCLE = 0,
      FORWARD_CLOSED_ARROW = 1,
      FORWARD_OPEN_ARROW = 2,
      BACKWARD_CLOSED_ARROW = 3,
      BACKWARD_OPEN_ARROW = 4,
    }

    class Point {
      constructor(x: number, y: number);
      x: number;
      y: number;
      equals(other: Point): boolean;
      toString(): string;
    }

    class Size {
      constructor(width: number, height: number, widthUnit?: string, heightUnit?: string);
      width: number;
      height: number;
      equals(other: Size): boolean;
      toString(): string;
    }

    // Placeholder for StreetViewPanorama if needed, otherwise remove
    class StreetViewPanorama {}

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
        name?: string; // Added this line
        // Add other fields you might use, e.g., geometry, etc.
      }
    }
  }
}