import React from 'react';
import WeeklyPicksSignup from '@/components/WeeklyPicksSignup';
import SEO from '@/components/SEO';

const Subscribe: React.FC = () => {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-12 sm:py-16">
      <a
        href="/melbourne"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground mb-6"
      >
        ← Back to Melbourne events
      </a>
      <SEO
        title="Subscribe to SoulFlow daily picks | Melbourne"
        description="Get every conscious event happening today in Melbourne, delivered to your inbox each morning at 9am. Up to 10 events with direct booking links. Free, no spam, unsubscribe any time."
      />

      <div className="text-center mb-8">
        <p className="eyebrow mb-3">SoulFlow Melbourne</p>
        <h1 className="text-3xl sm:text-4xl font-heading font-semibold text-foreground">
          Everything soulful on today, every morning.
        </h1>
        <p className="mt-4 text-base text-muted-foreground max-w-md mx-auto">
          A short daily email with every conscious event happening today in Melbourne, up to 10 with direct booking links and a link to the full list online. Free, no noise, unsubscribe any time.
        </p>
      </div>

      <WeeklyPicksSignup defaultCity="melbourne" source="subscribe-page" />
    </div>
  );
};

export default Subscribe;
