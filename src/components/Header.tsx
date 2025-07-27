import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Header = () => {
  return (
    <header className="w-full bg-white shadow-sm py-4 px-6 md:px-8 flex justify-center">
      <div className="w-full max-w-4xl flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-purple-700 hover:text-purple-800 transition-colors">
          SoulFlow
        </Link>
        <nav className="space-x-4">
          <Link to="/">
            <Button variant="ghost" className="text-gray-700 hover:text-purple-700">
              Events
            </Button>
          </Link>
          <Link to="/events-map"> {/* New Events Map link */}
            <Button variant="ghost" className="text-gray-700 hover:text-purple-700">
              Map
            </Button>
          </Link>
          <Link to="/submit-event">
            <Button variant="ghost" className="text-gray-700 hover:text-purple-700">
              Add Event
            </Button>
          </Link>
          <Link to="/contact">
            <Button variant="ghost" className="text-gray-700 hover:text-purple-700">
              Contact
            </Button>
          </Link>
          <Link to="/admin/submissions">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Admin
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;