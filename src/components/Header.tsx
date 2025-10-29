import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Menu, LogOut, UserCog, CalendarCheck, Bookmark, User as UserIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ThemeToggle } from './ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavItem {
  to: string;
  label: string;
  onClick?: () => Promise<void> | void;
  badge?: string; // Optional badge property
}

const Header = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useSession();

  const getButtonClass = (path: string) => {
    const isActive = location.pathname === path || (path !== "/" && location.pathname.startsWith(path));
    return cn(
      "text-foreground hover:text-primary transition-all duration-300 ease-in-out transform hover:scale-105",
      isActive && "font-bold text-primary"
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

  // New V2 prototype navigation items (simplified)
  const v2NavItems = [
    { label: "Today's Highlights", to: "#", disabled: true },
    { label: "Venue", to: "#", disabled: true },
    { label: "Price", to: "#", disabled: true },
    { label: "Area", to: "#", disabled: true },
  ];

  return (
    <header className="w-full bg-white shadow-lg border-b border-gray-200 py-3 px-4 md:px-8 flex justify-center dark:bg-background dark:border-gray-800">
      <div className="w-full max-w-screen-lg flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-foreground hover:text-primary/80 transition-colors dark:text-foreground dark:hover:text-primary/80">
          TODO.TODAY
        </Link>

        {/* Desktop Navigation & Filters */}
        <nav className="hidden md:flex items-center space-x-4">
          {v2NavItems.map((item) => (
            <Button key={item.label} variant="ghost" disabled={item.disabled} className="text-foreground hover:text-primary transition-all duration-300 ease-in-out transform hover:scale-105">
              {item.label}
            </Button>
          ))}
          <div className="border-l border-border h-6 mx-2"></div> {/* Separator */}
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="transition-all duration-300 ease-in-out transform hover:scale-105">
                <UserIcon className="h-5 w-5" />
                <span className="sr-only">User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="dark:bg-card dark:border-border">
              {user ? (
                <>
                  <DropdownMenuItem asChild>
                    <Link to="/my-events">My Events</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-bookmarks">My Bookmarks</Link>
                  </DropdownMenuItem>
                  {user.email === 'daniele.buatti@gmail.com' && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/admin/panel">Admin Panel</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/dev-space">Dev Space</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/map">Map</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={handleLogout}>
                    Logout
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild>
                    <Link to="/login">Login</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/login">Register</Link> {/* Register also goes to login for now */}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Mobile Navigation */}
        {isMobile && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[250px] sm:w-[300px] p-6 dark:bg-sidebar-background dark:border-sidebar-border">
              <nav className="flex flex-col space-y-4 mt-8">
                {v2NavItems.map((item) => (
                  <SheetClose asChild key={item.label}>
                    <Button variant="ghost" className="justify-start" disabled={item.disabled}>
                      {item.label}
                    </Button>
                  </SheetClose>
                ))}
                <div className="border-t border-border my-2"></div>
                {user ? (
                  <>
                    <SheetClose asChild>
                      <Button variant="ghost" className="justify-start" asChild>
                        <Link to="/my-events">
                          <CalendarCheck className="mr-2 h-4 w-4" /> My Events
                        </Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button variant="ghost" className="justify-start" asChild>
                        <Link to="/my-bookmarks">
                          <Bookmark className="mr-2 h-4 w-4" /> My Bookmarks
                        </Link>
                      </Button>
                    </SheetClose>
                    {user.email === 'daniele.buatti@gmail.com' && (
                      <>
                        <SheetClose asChild>
                          <Button variant="ghost" className="justify-start" asChild>
                            <Link to="/admin/panel">Admin Panel</Link>
                          </Button>
                        </SheetClose>
                        <SheetClose asChild>
                          <Button variant="ghost" className="justify-start" asChild>
                            <Link to="/dev-space">Dev Space</Link>
                          </Button>
                        </SheetClose>
                        <SheetClose asChild>
                          <Button variant="ghost" className="justify-start" asChild>
                            <Link to="/map">Map</Link>
                          </Button>
                        </SheetClose>
                      </>
                    )}
                    <div className="border-t border-border my-2"></div>
                    <SheetClose asChild>
                      <Button variant="ghost" onClick={handleLogout} className="text-destructive hover:text-destructive/80 justify-start">
                        <LogOut className="mr-2 h-4 w-4" /> Logout
                      </Button>
                    </SheetClose>
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Button className="w-full bg-primary hover:bg-primary/80 text-primary-foreground" asChild>
                        <Link to="/login">Login</Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground" asChild>
                        <Link to="/login">Register</Link>
                      </Button>
                    </SheetClose>
                  </>
                )}
                <div className="pt-4">
                  <ThemeToggle />
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </header>
  );
};

export default Header;