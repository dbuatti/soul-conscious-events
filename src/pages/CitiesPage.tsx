import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, MapPin } from 'lucide-react';
import PageHeader from '@/components/v2/PageHeader';
import SEO from '@/components/SEO';
import { CITY_GUIDES } from '@/lib/cities';

/** Index of every local city guide — one calm, scannable entry point. */
const CitiesPage: React.FC = () => (
  <div className="w-full max-w-6xl px-4">
    <SEO
      title="City Guides | SoulFlow Australia"
      description="Explore conscious events by city — sound baths, meditation, workshops and community gatherings across Australia."
    />
    <PageHeader
      eyebrow="Explore locally"
      title="Find your city."
      description="Every gathering, close to home. Pick a city to see what's on near you."
    />

    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {CITY_GUIDES.map((city) => (
        <li key={city.slug}>
          <Link
            to={`/${city.slug}`}
            className="organic-card organic-card-hover group flex h-full flex-col gap-2.5 rounded-[1.25rem] p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="eyebrow flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {city.state}
              </span>
              <ArrowUpRight className="h-5 w-5 text-muted-foreground/50 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <h2 className="font-heading text-xl sm:text-2xl font-semibold text-foreground leading-tight">
              {city.name}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
              {city.description}
            </p>
          </Link>
        </li>
      ))}
    </ul>

    <p className="mt-10 text-center text-sm text-muted-foreground">
      Can't see your city?{' '}
      <Link to="/" className="font-medium text-primary hover:underline">
        Browse all events across Australia →
      </Link>
    </p>
  </div>
);

export default CitiesPage;
