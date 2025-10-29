import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Menu, LogOut, UserCog, CalendarCheck, Bookmark, LogIn } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile'; // Keeping for potential internal component logic, though not for Sheet conditional rendering
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';
import FilterDropdownsV2, { FilterDropdownsV2Props } from './FilterDropdownsV2';

interface NavItem {
  to: string;
  label: string;
  onClick?: () => Promise<void> | void;
}

const HeaderV2 = () => {
  const location = useLocation();
  const isMobile = useIsMobile(); // Still useful for internal logic if needed
  const { user } = useSession();

  // This state is specifically for the mobile filter dropdowns within the sheet
  const [filters, setFilters] = useState<FilterDropdownsV2Props['currentFilters']>({
    date: 'Today',
    category: ['All'],
    venue: ['All'],
    price: ['All'],
    area: ['All'],
  });

  const handleFilterChange = (newFilters: FilterDropdownsV2Props['currentFilters']) => {
    setFilters(newFilters);
    // In a real app, this would trigger a re-fetch of events in EventsListV2
    console.log('Applied mobile filters:', newFilters);
  };

  const getButtonClass = (path: string) => {
    const isActive = location.pathname === path || (path !== "/" && location.pathname.startsWith(path));
    return cn(
      "text-foreground hover:text-primary transition-colors duration-300 ease-in-out transform hover:scale-105",
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

  const adminNavItems: NavItem[] = [
    { to: "/admin/panel", label: "Admin Panel" },
    { to: "/dev-space", label: "Dev Space" },
    { to: "/map", label: "Map" },
  ];

  const isAdminPage = location.pathname.startsWith('/admin') || location.pathname.startsWith('/dev-space') || location.pathname.startsWith('/map');

  return (
    <header className="w-full bg-white shadow-lg border-b border-gray-200 py-3 px-4 md:px-8 flex justify-center dark:bg-background dark:border-gray-800 sticky top-0 z-50">
      <div className="w-full max-w-2xl flex justify-between items-center">
        {/* Logo only */}
        <Link to="/v2" className="text-2xl font-bold text-primary hover:text-primary/80 transition-colors dark:text-primary dark:hover:text-primary/80">
          SoulFlow V2
        </Link>

        {/* Hamburger Menu for ALL navigation */}
        <Sheet>
          <SheetTrigger asChild>
            {/* Removed md:hidden so the hamburger icon is always visible */}
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[250px] sm:w-[300px] p-6 dark:bg-sidebar-background dark:border-sidebar-border">
            <nav className="flex flex-col space-y-4 mt-8">
              {/* Mobile filter dropdowns - keeping as is for now */}
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Filters</h3>
              <FilterDropdownsV2 currentFilters={filters} onFilterChange={handleFilterChange} isMobile={true} />

              <div className="border-t border-border my-2"></div>

              {user ? (
                <>
                  <SheetClose asChild>
                    <Button variant="ghost" className={cn(getButtonClass("/my-events"), "justify-start")} asChild>
                      <Link to="/my-events">
                        <CalendarCheck className="mr-2 h-4 w-4" /> My Events
                      </Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button variant="ghost" className={cn(getButtonClass("/my-bookmarks"), "justify-start")} asChild>
                      <Link to="/my-bookmarks">
                        <Bookmark className="mr-2 h-4 w-4" /> My Bookmarks
                      </Link>
                    </Button>
                  </SheetClose>
                  {user?.email === 'daniele.buatti@gmail.com' && (
                    <>
                      <div className="border-t border-border my-2"></div>
                      <h3 className={cn("text-sm font-semibold text-muted-foreground mb-2", isAdminPage && "text-primary")}>
                        Admin
                      </h3>
                      {adminNavItems.map((item) => (
                        <SheetClose asChild key={item.to}>
                          <Button variant="ghost" className={cn(getButtonClass(item.to), "justify-start")} asChild>
                            <Link to={item.to}>{item.label}</Link>
                          </Button>
                        </SheetClose>
                      ))}
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
                    <Button variant="ghost" className={cn(getButtonClass("/v2/login"), "justify-start")} asChild>
                      <Link to="/v2/login">
                        <LogIn className="mr-2 h-4 w-4" /> Login / Sign Up
                      </Link>
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
      </div>
    </header>
  );
};

export default HeaderV2;