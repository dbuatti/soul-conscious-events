import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, MapPin, CalendarDays, PlusCircle, Mail, Compass, ArrowRight } from 'lucide-react';

const LOGO_URL =
  'https://tbyjdhxpbfvqsrzzdjwi.supabase.co/storage/v1/object/public/ig-weekly-slides/2026-10-07/logo-trans.png';

const INSTAGRAM_URL = 'https://www.instagram.com/soulflowau';

interface BioLink {
  label: string;
  description: string;
  to?: string;
  href?: string;
  icon: React.ElementType;
}

const LINKS: BioLink[] = [
  { label: 'Browse events', description: 'Everything coming up, all in one place', to: '/', icon: CalendarDays },
  { label: 'Explore the map', description: 'Find gatherings near you', to: '/map', icon: MapPin },
  { label: 'Submit an event', description: 'List yours — it’s free', to: '/submit-event', icon: PlusCircle },
  { label: 'About SoulFlow', description: 'Who we are and why we do this', to: '/about', icon: Compass },
  { label: 'Contact us', description: 'Questions, ideas or a hand', to: '/contact', icon: Mail },
  { label: 'Follow on Instagram', description: '@soulflowau', href: INSTAGRAM_URL, icon: Instagram },
];

const LinkInBio: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center px-5 py-12">
      <div className="w-full max-w-md flex flex-col items-center">
        <img src={LOGO_URL} alt="SoulFlow" className="h-24 w-24 object-contain" />
        <h1 className="mt-4 text-3xl font-heading font-semibold tracking-tight">SoulFlow</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Australia's home for conscious &amp; wellness events 🌿
        </p>

        <div className="mt-8 w-full space-y-3">
          {LINKS.map((link) => {
            const Icon = link.icon;
            const inner = (
              <div className="organic-card flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-foreground">{link.label}</span>
                  <span className="block text-xs text-muted-foreground">{link.description}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            );
            return link.href ? (
              <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="block">
                {inner}
              </a>
            ) : (
              <Link key={link.label} to={link.to!} className="block">
                {inner}
              </Link>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Made with care for the Australian conscious community.
        </p>
      </div>
    </div>
  );
};

export default LinkInBio;
