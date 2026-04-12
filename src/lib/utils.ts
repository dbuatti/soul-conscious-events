import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { australianStates } from '@/lib/constants';
import { Capacitor } from '@capacitor/core';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const extractAustralianState = (address: string): string | null => {
  if (!address) return null;
  const upperCaseAddress = address.toUpperCase();
  const stateRegex = new RegExp(`\\b(${australianStates.join('|')})\\b(?:\\s+\\d{4})?`, 'i');
  const match = upperCaseAddress.match(stateRegex);
  return match ? match[1] : null;
};

export const getRedirectUrl = (): string => {
  if (Capacitor.isNativePlatform()) {
    return 'com.example.soulconsciousevents://';
  }
  return window.location.origin;
};

export const getStaticMapUrl = (address: string): string => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey || !address) return '';
  const encodedAddress = encodeURIComponent(address);
  // Using a custom style to match the app's warm/organic aesthetic
  return `https://maps.googleapis.com/maps/api/staticmap?center=${encodedAddress}&zoom=15&size=800x400&maptype=roadmap&markers=color:0xB34629%7C${encodedAddress}&key=${apiKey}&style=feature:all|element:all|saturation:-20|lightness:10`;
};

export const openInMaps = (address: string) => {
  if (!address) return;
  const encodedAddress = encodeURIComponent(address);
  const url = Capacitor.isNativePlatform() 
    ? `maps://maps.apple.com/?q=${encodedAddress}` // iOS/Android native maps
    : `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`; // Web
  window.open(url, '_blank');
};