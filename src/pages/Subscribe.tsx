import React from 'react';
import WeeklyPicksSignup from '@/components/WeeklyPicksSignup';
import SEO from '@/components/SEO';

const Subscribe: React.FC = () => {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-12 sm:py-16">
      <SEO
        title="Subscribe to SoulFlow daily picks | Melbourne"
        description="Get five hand-picked conscious events in Melbourne delivered to your inbox every morning at 9am. Free, no spam, unsubscribe any time."
      />

      <div className="text-center mb-8">
        <p className="eyebrow mb-3">SoulFlow Melbourne</p>
        <h1 className="text-3xl sm:text-4xl font-heading font-semibold text-foreground">
          Five soulful things to do, every morning.
        </h1>
        <p className="mt-4 text-base text-muted-foreground max-w-md mx-auto">
          A short daily email with five hand-picked conscious events in Melbourne, with direct booking links. Free, no noise, unsubscribe any time.
        </p>
      </div>

      <WeeklyPicksSignup defaultCity="melbourne" source="subscribe-page" />
    </div>
  );
};

export default Subscribe;
