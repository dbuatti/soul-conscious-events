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
  
  // Use the current origin and ensure no trailing slash
  // This must match exactly what is in the Supabase Redirect URLs allowlist
  // For localhost:32113, this returns "http://localhost:32113"
  return window.location.origin.replace(/\/$/, '');
};

export const getStaticMapUrl = (address: string): string => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey || !address) return '';
  const encodedAddress = encodeURIComponent(address);
  return `https://maps.googleapis.com/maps/api/staticmap?center=${encodedAddress}&zoom=15&size=800x400&maptype=roadmap&markers=color:0xB34629%7C${encodedAddress}&key=${apiKey}&style=feature:all|element:all|saturation:-20|lightness:10`;
};

export const openInMaps = (address: string) => {
  if (!address) return;
  const encodedAddress = encodeURIComponent(address);
  const url = Capacitor.isNativePlatform() 
    ? `maps://maps.apple.com/?q=${encodedAddress}` 
    : `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  window.open(url, '_blank');
};

// Router state is dropped by a full-page redirect, and Google sign-in is one.
// ProtectedRoute remembers the path it bounced from so the login screen can
// send the visitor back to it -- an organiser part-way through listing an event
// should not have to find the form again and retype it. Expires so a stale
// entry cannot hijack a later, unrelated sign-in.
const RETURN_TO_KEY = 'soulflow.returnTo';
const RETURN_TO_TTL_MS = 15 * 60 * 1000;

export function rememberReturnTo(pathname: string): void {
  try {
    sessionStorage.setItem(RETURN_TO_KEY, JSON.stringify({ pathname, at: Date.now() }));
  } catch { /* private mode, disabled storage */ }
}

export function consumeReturnTo(): string | null {
  try {
    const raw = sessionStorage.getItem(RETURN_TO_KEY);
    sessionStorage.removeItem(RETURN_TO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { pathname?: unknown; at?: unknown };
    if (typeof parsed.pathname !== 'string' || !parsed.pathname.startsWith('/')) return null;
    if (typeof parsed.at !== 'number' || Date.now() - parsed.at > RETURN_TO_TTL_MS) return null;
    return parsed.pathname;
  } catch {
    return null;
  }
}
