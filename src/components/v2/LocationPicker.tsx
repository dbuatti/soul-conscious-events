import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Event } from '@/types/event';
import { supabase } from '@/integrations/supabase/client';
import { getBaseEventId } from '@/utils/event-utils';
import { toast } from 'sonner';
import { MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface LocationPickerProps {
  event: Event;
  onLocationSaved: (lat: number, lng: number) => void;
}

const AUSTRALIA_CENTRE: L.LatLngTuple = [-25.2744, 133.7751];

/**
 * "Pin location on map" button + dialog for the event's owner or an admin.
 * Closed until clicked; the caller decides who may see it.
 */
const LocationPicker: React.FC<LocationPickerProps> = ({ event, onLocationSaved }) => {
  const [open, setOpen] = useState(false);
  const [lat, setLat] = useState<number | null>(event.latitude ?? null);
  const [lng, setLng] = useState<number | null>(event.longitude ?? null);
  const [saving, setSaving] = useState(false);
  const [mapEl, setMapEl] = useState<HTMLDivElement | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Reset the draft to the saved position whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setLat(event.latitude ?? null);
      setLng(event.longitude ?? null);
    }
  }, [open, event.latitude, event.longitude]);

  // Build the map once the dialog's map container is mounted.
  useEffect(() => {
    if (!open || !mapEl) return;
    const hasPin = event.latitude != null && event.longitude != null;
    const map = L.map(mapEl, {
      center: hasPin ? [event.latitude!, event.longitude!] : AUSTRALIA_CENTRE,
      zoom: hasPin ? 15 : 4,
      scrollWheelZoom: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const placeMarker = (pos: L.LatLngExpression) => {
      if (markerRef.current) {
        markerRef.current.setLatLng(pos);
      } else {
        markerRef.current = L.marker(pos, { draggable: true }).addTo(map);
        markerRef.current.on('dragend', (e) => {
          const p = (e.target as L.Marker).getLatLng();
          setLat(p.lat);
          setLng(p.lng);
        });
      }
    };
    if (hasPin) placeMarker([event.latitude!, event.longitude!]);
    map.on('click', (e: L.LeafletMouseEvent) => {
      placeMarker(e.latlng);
      setLat(e.latlng.lat);
      setLng(e.latlng.lng);
    });

    // The dialog animates in; let Leaflet measure the final size.
    const t = window.setTimeout(() => map.invalidateSize(), 150);
    return () => {
      window.clearTimeout(t);
      map.remove();
      markerRef.current = null;
    };
  }, [open, mapEl, event.latitude, event.longitude]);

  const handleSave = async () => {
    if (lat == null || lng == null) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({ latitude: lat, longitude: lng, geocode_failed_at: null })
        .eq('id', getBaseEventId(event.id));
      if (error) throw error;
      toast.success('Location pinned on the map!');
      onLocationSaved(lat, lng);
      setOpen(false);
    } catch (err) {
      console.error('Error saving location:', err);
      toast.error('Failed to save location.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full gap-2">
          <MapPin className="h-3.5 w-3.5" />
          {event.latitude != null && event.longitude != null ? 'Edit location on map' : 'Pin location on map'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>Set map location</DialogTitle>
          <DialogDescription>
            Tap the map to place a pin, or drag the existing pin. This puts the event on the SoulFlow map.
          </DialogDescription>
        </DialogHeader>
        <div className="h-[360px]">
          <div ref={setMapEl} className="w-full h-full" />
        </div>
        <div className="px-5 pb-5 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-muted-foreground tabular-nums">
            {lat != null && lng != null ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'No pin yet'}
          </span>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button variant="outline" className="rounded-full">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving || lat == null || lng == null} className="rounded-full">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
              Save location
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LocationPicker;
