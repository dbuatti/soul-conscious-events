import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Event } from '@/types/event';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/components/SessionContextProvider';
import { toast } from 'sonner';
import { X, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface LocationPickerProps {
  event: Event;
  onLocationSaved: (lat: number, lng: number) => void;
  open?: boolean;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  event,
  onLocationSaved,
  open,
}) => {
  const { user } = useSession();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [lat, setLat] = useState<number | null>(event.latitude ?? null);
  const [lng, setLng] = useState<number | null>(event.longitude ?? null);
  const [saving, setSaving] = useState(false);

  // Initialise map when dialog opens
  useEffect(() => {
    if (!open || !mapRef.current || mapInstanceRef.current) return;

    const startLat = lat ?? -25.2744;
    const startLng = lng ?? 133.7751;

    const map = L.map(mapRef.current, {
      center: [startLat, startLng],
      zoom: lat && lng ? 15 : 4,
      scrollWheelZoom: false,
      dragging: true,
      touchZoom: true,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    // Add or move marker
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }

    if (lat && lng) {
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current = marker;

      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        setLat(pos.lat);
        setLng(pos.lng);
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        if (markerRef.current) {
          map.removeLayer(markerRef.current);
        }
        const newMarker = L.marker([e.latlng.lat, e.latlng.lng], {
          draggable: true,
        }).addTo(map);
        markerRef.current = newMarker;
        newMarker.on('dragend', (ev) => {
          const p = ev.target.getLatLng();
          setLat(p.lat);
          setLng(p.lng);
        });
        setLat(e.latlng.lat);
        setLng(e.latlng.lng);
      });
    }

    // Give Leaflet a frame to lay out
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      clusterCleanup();
    };
  }, [open, lat, lng]);

  const clusterCleanup = () => {
    markerRef.current = null;
  };

  const handleSave = async () => {
    if (!lat || !lng) return;
    if (!user) {
      toast.error('Please sign in to save a location.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({ latitude: lat, longitude: lng })
        .eq('id', event.id);

      if (error) throw error;

      toast.success('Location pinned on the map!');
      onLocationSaved(lat, lng);
    } catch (err) {
      console.error('Error saving location:', err);
      toast.error('Failed to save location.');
    } finally {
      setSaving(false);
    }
  };

  const isOpen = open ?? true;

  return (
    <Dialog open={isOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={!user}
          className="flex items-center gap-2"
        >
          <MapPin className="h-3.5 w-3.5" />
          {event.latitude && event.longitude ? 'Edit location on map' : 'Pin location on map'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0">
        <DialogHeader>
          <DialogTitle>Set map location</DialogTitle>
          <DialogDescription>
            Click on the map to place a pin, or drag the existing pin. This helps people find your event on the SoulFlow map.
          </DialogDescription>
        </DialogHeader>
        <div className="h-[400px]">
          <div ref={mapRef} className="w-full h-full" />
        </div>
        <div className="p-4 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium text-foreground">
              {lat?.toFixed(4) ?? '—'}, {lng?.toFixed(4) ?? '—'}
            </span>
            {!user && (
              <span className="text-xs text-muted-foreground">Sign in to save</span>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || !lat || !lng || !user}
            className="rounded-full"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />} Save location
          </Button>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full" aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LocationPicker;
