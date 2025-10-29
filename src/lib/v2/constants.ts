import { australianStates } from '@/lib/constants'; // Import australianStates

export const v2EventCategories = [
  'Wellness',
  'Dance & Movement',
  'Consciousness & Spirituality',
  'Arts & Creativity',
  'Community & Social',
  'Music',
  'Food & Drink',
  'Relationships & Connection',
  'Talks & Learning',
  'Local Culture',
  'Nature & Outdoors',
  'Other',
];

export const v2PriceOptions = [
  'Free',
  'Paid',
  'Donation',
];

// Placeholder for venues - these would typically be dynamically loaded from your database
// For now, we'll use a generic list.
export const v2Venues = [
  'Community Hall',
  'Yoga Studio',
  'Art Gallery',
  'Cafe & Eatery',
  'Outdoor Park',
  'Healing Centre',
  'Workshop Space',
  'Music Venue',
  'Online Event',
  'Other Venue',
];

// Using imported australianStates for the state filter
export const v2States = australianStates;

export const v2DateOptions = [
  'Today',
  'Tomorrow',
  'This Week',
  'This Month',
  'All Upcoming',
];