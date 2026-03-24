import React from 'react';
import { Link } from 'react-router-dom';
import { Coffee } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-card text-muted-foreground py-12 px-4 shadow-inner border-t border-border">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 border-b border-border pb-12 mb-8">
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-foreground font-heading">SoulFlow</h3>
          <p className="text-sm leading-relaxed">
            Discover and connect with soul-nourishing events across Australia.
            Your hub for personal growth and community connection.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Quick Links</h3>
          <nav className="flex flex-col space-y-2">
            <Link to="/" className="hover:text-primary transition-colors text-sm">Events</Link>
            <Link to="/submit-event" className="hover:text-primary transition-colors text-sm">Add Event</Link>
            <Link to="/contact" className="hover:text-primary transition-colors text-sm">Contact</Link>
            <Link to="/about" className="hover:text-primary transition-colors text-sm">About</Link>
            <Link to="/community-guidelines" className="hover:text-primary transition-colors text-sm">Community Guidelines</Link>
          </nav>
        </div>

        <div className="space-y-4 flex flex-col items-center md:items-start">
          <h3 className="text-lg font-semibold text-foreground">Support Us</h3>
          <a
            href="https://buymeacoffee.com/danielebuatti"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm hover:text-primary transition-colors"
          >
            <img src="/buy-me-a-coffee.png" alt="Buy Me a Coffee" className="h-10 w-auto" />
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
        <p>&copy; {currentYear} SoulFlow. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;