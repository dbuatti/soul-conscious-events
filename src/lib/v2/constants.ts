import { australianStates, eventTypes } from '@/lib/constants';

// Must match the categories events are saved with (EventForm, admin table, AI parser).
export const v2EventCategories = eventTypes.filter((type) => type !== 'All');

export const v2PriceOptions = [
  'Free',
  'Paid',
  'Donation',
];

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

export const v2States = australianStates;

export const v2DateOptions = [
  'Today',
  'Tomorrow',
  'This Weekend',
  'This Week',
  'This Month',
  'All Upcoming',
];