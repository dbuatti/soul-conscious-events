import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Menu, LogOut } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ThemeToggle } from './ThemeToggle'; // Import ThemeToggle

const Header = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useSession();

  const getButtonClass = (path: string) => {
    return cn(
      "text-foreground hover:text-purple-700 transition-all duration-300 ease-in-out transform hover:scale-105",
      location.pathname === path && "font-bold text-purple-700"
    );
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error.message);
      toast.error('Failed to log out. Please try again.');
    } else {
      toast.success('Logged out successfully!');
    }
  };

  const mainNavLinks = (
    <>
      <Link to="/"> {/* Now points to the Events List */}
        <Button variant="ghost" className={getButtonClass("/")}>
          Events
        </Button>
      </Link>
      <Link to="/calendar"> {/* Calendar is now at /calendar */}
        <Button variant="ghost" className={getButtonClass("/calendar")}>
          Calendar
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
      <Link to="/about">
        <Button variant="ghost" className={getButtonClass("/about")}>
          About
        </Button>
      </Link>
    </>
  );

  return (
    <header className="w-full bg-white shadow-lg border-b border-gray-200 py-5 px-6 md:px-8 flex justify-center dark:bg-background dark:border-gray-800">
      <div className="w-full max-w-4xl flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-purple-700 hover:text-purple-800 transition-colors dark:text-primary dark:hover:text-primary/80">
          SoulFlow
        </Link>
        {isMobile ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[250px] sm:w-[300px] p-6 dark:bg-sidebar-background dark:border-sidebar-border">
              <nav className="flex flex-col space-y-4 mt-8">
                {React.Children.map(mainNavLinks, (child) => (
                  <SheetClose asChild key={child.key}>
                    {child}
                  </SheetClose>
                ))}
                {/* Mobile Auth Button */}
                {user ? (
                  <SheetClose asChild>
                    <Button variant="ghost" onClick={handleLogout} className="text-red-600 hover:text-red-700 transition-all duration-300 ease-in-out transform hover:scale-105 dark:text-destructive dark:hover:text-destructive/80">
                      <LogOut className="mr-2 h-4 w-4" /> Logout
                    </Button>
                  </SheetClose>
                ) : (
                  <SheetClose asChild>
                    <Link to="/login">
                      <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white transition-all duration-300 ease-in-out transform hover:scale-105 dark:bg-primary dark:hover:bg-primary/80">
                        Login
                      </Button>
                    </Link>
                  </SheetClose>
                )}
                <div className="mt-4">
                  <ThemeToggle />
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        ) : (
          <nav className="space-x-4 hidden md:flex items-center">
            {mainNavLinks}
            {user ? (
              <Button variant="ghost" onClick={handleLogout} className="text-red-600 hover:text-red-700 transition-all duration-300 ease-in-out transform hover:scale-105 dark:text-destructive dark:hover:text-destructive/80">
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            ) : (
              <Link to="/login">
                <Button className="bg-purple-600 hover:bg-purple-700 text-white transition-all duration-300 ease-in-out transform hover:scale-105 dark:bg-primary dark:hover:bg-primary/80">
                  Login
                </Button>
              </Link>
            )}
            <ThemeToggle />
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;