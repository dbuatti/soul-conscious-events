import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import EventsListV2 from '@/pages/v2/EventsListV2';
import { getCityGuide } from '@/lib/cities';

const CityGuide: React.FC = () => {
  const { city } = useParams<{ city: string }>();
  const guide = getCityGuide(city);

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
