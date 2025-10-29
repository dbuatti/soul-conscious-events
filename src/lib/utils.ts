import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { australianStates } from '@/lib/constants';
import { Capacitor } from '@capacitor/core'; // Import Capacitor

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Refined helper function to extract Australian state from address
export const extractAustralianState = (address: string): string | null => {
  if (!address) {
    return null;
  }
  const upperCaseAddress = address.toUpperCase();
  // Regex to find a 2-letter state abbreviation followed by a space and 4 digits (postcode)
  // or just a 2-letter state abbreviation at a word boundary
  const stateRegex = new RegExp(`\\b(${australianStates.join('|')})\\b(?:\\s+\\d{4})?`, 'i');
  const match = upperCaseAddress.match(stateRegex);

  if (match && match[1]) {
    return match[1];
  }

  return null;
};

export const getRedirectUrl = (): string => {
  if (Capacitor.isNativePlatform()) {
    // For Capacitor, use the custom URL scheme defined in capacitor.config.ts
    // The appId is 'com.example.soulconsciousevents'
    return 'com.example.soulconsciousevents://';
  }
  // For web, use the current origin
  return window.location.origin;
};