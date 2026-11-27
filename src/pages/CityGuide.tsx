import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import EventsListV2 from '@/pages/v2/EventsListV2';
import { getCityGuide } from '@/lib/cities';

const CityGuide: React.FC = () => {
  // City routes are top-level slugs (`/melbourne`, `/sydney`, …), so the slug
  // comes from the pathname rather than a `:city` route param.
  const { pathname } = useLocation();
  const slug = pathname.split('/').filter(Boolean)[0];
  const guide = getCityGuide(slug);

  if (!guide) return <Navigate to="/" replace />;

  return (
    <EventsListV2
      initialState={guide.state}
      cityName={guide.name}
      cityDescription={guide.description}
      seoTitle={`Conscious events in ${guide.name} | SoulFlow`}
      seoDescription={guide.seoDescription}
      signupCity={guide.slug}
      signupSource={`city-${guide.slug}`}
    />
  );
};

export default CityGuide;
