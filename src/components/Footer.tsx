import React from 'react';
import { Link } from 'react-router-dom';
import { Coffee } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-gray-800 text-gray-300 py-8 px-6 md:px-8 shadow-inner dark:bg-background dark:text-muted-foreground">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 border-b border-gray-700 pb-8 mb-8 dark:border-border">
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white dark:text-foreground">SoulFlow</h3>
          <p className="text-sm leading-relaxed">
            Discover and connect with soul-nourishing events across Australia.
            Your hub for personal growth and community connection.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white dark:text-foreground">Quick Links</h3>
          <nav className="flex flex-col space-y-2">
            <Link to="/" className="hover:text-primary transition-colors text-sm">Events</Link>
            <Link to="/submit-event" className="hover:text-primary transition-colors text-sm">Add Event</Link>
            <Link to="/map" className="hover:text-primary transition-colors text-sm">Map</Link>
            <Link to="/contact" className="hover:text-primary transition-colors text-sm">Contact</Link>
            <Link to="/about" className="hover:text-primary transition-colors text-sm">About</Link>
            <Link to="/community-guidelines" className="hover:text-primary transition-colors text-sm">Community Guidelines</Link> {/* New link */}
            <Link to="/admin/panel" className="hover:text-primary transition-colors text-sm">Admin Panel</Link>
          </nav>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white dark:text-foreground">Support Us</h3>
          <a
            href="https://buymeacoffee.com/danielebuatti"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm hover:text-primary transition-colors"
          >
            <img src="/buy-me-a-coffee.png" alt="Buy Me a Coffee" className="h-8 w-auto" />
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center text-sm text-gray-400 dark:text-muted-foreground">
        <p>&copy; {currentYear} SoulFlow. All rights reserved.</p>
        <a
          href="https://www.dyad.sh/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors mt-2 md:mt-0"
        >
          Made with Dyad
        </a>
      </div>
    </footer>
  );
};

export default Footer;