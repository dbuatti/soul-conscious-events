export interface CityGuide {
  slug: string;
  name: string;
  state: string;
  description: string;
  seoDescription: string;
}

/** City pages are deliberately small: one clear local promise per URL. */
export const CITY_GUIDES: CityGuide[] = [
  {
    slug: 'melbourne',
    name: 'Melbourne',
    state: 'VIC',
    description: 'Sound baths, meditation, workshops and conscious community gatherings happening across Melbourne.',
    seoDescription: 'Find conscious and wellness events in Melbourne — sound baths, meditation, workshops, circles and community gatherings.',
  },
  {
    slug: 'sydney',
    name: 'Sydney',
    state: 'NSW',
    description: 'Discover soulful gatherings, breathwork, workshops and community events happening across Sydney.',
    seoDescription: 'Find conscious and wellness events in Sydney — meditation, sound baths, breathwork, workshops and community gatherings.',
  },
  {
    slug: 'brisbane',
    name: 'Brisbane',
    state: 'QLD',
    description: 'Find upcoming wellness events, sound journeys, workshops and community gatherings in Brisbane.',
    seoDescription: 'Find conscious and wellness events in Brisbane — meditation, sound baths, workshops and community gatherings.',
  },
  {
    slug: 'perth',
    name: 'Perth',
    state: 'WA',
    description: 'Explore conscious gatherings, sound baths, workshops and wellness events happening in Perth.',
    seoDescription: 'Find conscious and wellness events in Perth — meditation, sound baths, workshops and community gatherings.',
  },
  {
    slug: 'adelaide',
    name: 'Adelaide',
    state: 'SA',
    description: 'Discover meditation, sound healing, workshops and soulful community events in Adelaide.',
    seoDescription: 'Find conscious and wellness events in Adelaide — meditation, sound baths, workshops and community gatherings.',
  },
  {
    slug: 'hobart',
    name: 'Hobart',
    state: 'TAS',
    description: 'Find intimate workshops, sound journeys and conscious community gatherings in Hobart.',
    seoDescription: 'Find conscious and wellness events in Hobart — meditation, sound baths, workshops and community gatherings.',
  },
  {
    slug: 'canberra',
    name: 'Canberra',
    state: 'ACT',
    description: 'Explore upcoming wellness workshops, meditation and community gatherings in Canberra.',
    seoDescription: 'Find conscious and wellness events in Canberra — meditation, sound baths, workshops and community gatherings.',
  },
  {
    slug: 'darwin',
    name: 'Darwin',
    state: 'NT',
    description: 'Discover conscious community gatherings, workshops and soulful events in Darwin.',
    seoDescription: 'Find conscious and wellness events in Darwin — meditation, sound baths, workshops and community gatherings.',
  },
];

export const NEWSLETTER_CITIES = [
  { value: 'all', label: 'All Australia' },
  ...CITY_GUIDES.map((city) => ({ value: city.slug, label: city.name })),
];

export const getCityGuide = (slug?: string) =>
  CITY_GUIDES.find((city) => city.slug === slug?.toLowerCase());

export const getCitySlugForState = (state?: string | null) =>
  CITY_GUIDES.find((city) => city.state === state)?.slug ?? 'all';
