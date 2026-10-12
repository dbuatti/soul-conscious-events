import { Link } from 'react-router-dom';
import { ArrowRight, Instagram } from 'lucide-react';
import { SoulFlowMark } from '@/components/v2/HeaderV2';

const linkGroups = [
  {
    title: 'Discover',
    links: [
      { to: '/', label: 'All events' },
      { to: '/map', label: 'Event map' },
      { to: '/my-bookmarks', label: 'Saved events' },
    ],
  },
  {
    title: 'Hosts',
    links: [
      { to: '/submit-event', label: 'List your event' },
      { to: '/my-events', label: 'Manage listings' },
      { to: '/community-guidelines', label: 'Community guidelines' },
    ],
  },
  {
    title: 'SoulFlow',
    links: [
      { to: '/about', label: 'About' },
      { to: '/contact', label: 'Contact' },
      { to: '/link', label: 'All our links' },
    ],
  },
];

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full night-band mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10 lg:gap-12">
          <div className="space-y-5 max-w-sm">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <SoulFlowMark className="h-9 w-9 [&_rect]:fill-ink [&_path]:stroke-ink-foreground/70" />
              <span className="text-3xl font-semibold font-heading text-ink-foreground">SoulFlow</span>
            </Link>
            <p className="text-sm leading-relaxed text-ink-foreground/70">
              A community guide to sound baths, breathwork, ecstatic dance, circles and
              workshops across Australia. Made with care, for the people who hold the space.
            </p>
            <Link
              to="/submit-event"
              className="group inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
            >
              Hosting something? List it free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {linkGroups.map((group) => (
            <div key={group.title} className="space-y-4">
              <h3 className="text-xs font-sans font-semibold uppercase tracking-[0.2em] text-ink-foreground/50">{group.title}</h3>
              <nav className="flex flex-col gap-2.5" aria-label={group.title}>
                {group.links.map((link) => (
                  <Link key={link.to} to={link.to} className="text-sm text-ink-foreground/80 hover:text-ink-foreground transition-colors w-fit">
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-ink-foreground/10 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center text-xs text-ink-foreground/50">
          <p>&copy; {currentYear} SoulFlow. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a
              href="https://www.instagram.com/soulflowau"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-ink-foreground transition-colors"
            >
              <Instagram className="h-3.5 w-3.5" /> @soulflowau
            </a>
            <a
              href="https://www.instagram.com/heartbeatslive"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-ink-foreground transition-colors"
            >
              <Instagram className="h-3.5 w-3.5" /> HeartBeats
            </a>
            <a
              href="https://buymeacoffee.com/danielebuatti"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-ink-foreground/15 px-3 py-1.5 hover:border-accent hover:text-accent transition-colors"
            >
              ☕ Buy me a coffee
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
