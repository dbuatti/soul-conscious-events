import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge'; // Import Badge component

const Header = () => {
  const location = useLocation();

  const getButtonClass = (path: string) => {
    return cn(
      "text-gray-700 hover:text-purple-700",
      location.pathname === path && "font-bold text-purple-700"
    );
  };

  return (
    <header className="w-full bg-white shadow-sm py-4 px-6 md:px-8 flex justify-center">
      <div className="w-full max-w-4xl flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-purple-700 hover:text-purple-800 transition-colors">
          SoulFlow
        </Link>
        <nav className="space-x-4">
          <Link to="/">
            <Button variant="ghost" className={getButtonClass("/")}>
              Events
            </Button>
          </Link>
          <Link to="/submit-event">
            <Button variant="ghost" className={getButtonClass("/submit-event")}>
              Add Event
            </Button>
          </Link>
          <Link to="/map">
            <Button variant="ghost" className={cn(getButtonClass("/map"), "flex items-center")}>
              Map
              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 text-xs font-semibold">
                Beta
              </Badge>
            </Button>
          </Link>
          <Link to="/contact">
            <Button variant="ghost" className={getButtonClass("/contact")}>
              Contact
            </Button>
          </Link>
          <Link to="/admin/submissions">
            <Button className={cn("bg-blue-600 hover:bg-blue-700 text-white", location.pathname.startsWith("/admin") && "bg-blue-700")}>
              Admin
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;