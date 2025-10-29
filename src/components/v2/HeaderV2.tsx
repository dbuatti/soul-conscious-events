import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Menu, LogOut, UserCog, CalendarCheck, Bookmark, LogIn, PlusCircle, Settings } from 'lucide-react'; // Added PlusCircle and Settings
import { useIsMobile } from '@/hooks/use-mobile';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';
// Removed FilterDropdownsV2 import as it's no longer needed in the header

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType; // Added icon property
  onClick?: () => Promise<void> | void;
}

const HeaderV2 = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useSession();

  // Removed filters state and handleFilterChange as filters are no longer in the header menu

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

  const authenticatedNavItems: NavItem[] = [
    { to: "/submit-event", label: "Create Event", icon: PlusCircle },
    { to: "/my-events", label: "My Events", icon: CalendarCheck },
    { to: "/v2/account-settings", label: "Account Settings", icon: Settings },
    { to: "#", label: "Logout", icon: LogOut, onClick: handleLogout }, // Use '#' for logout as it's an action
  ];

  const unauthenticatedNavItems: NavItem[] = [
    { to: "/v2/login", label: "Login / Sign Up", icon: LogIn },
  ];

  const adminNavItems: NavItem[] = [
    { to: "/admin/panel", label: "Admin Panel", icon: UserCog },
    { to: "/dev-space", label: "Dev Space", icon: UserCog }, // Reusing UserCog for dev space
    { to: "/map", label: "Map", icon: UserCog }, // Reusing UserCog for map
  ];

  const isAdminUser = user?.email === 'daniele.buatti@gmail.com';

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
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[250px] sm:w-[300px] p-6 dark:bg-sidebar-background dark:border-sidebar-border">
            <nav className="flex flex-col space-y-4 mt-8">
              {user ? (
                <>
                  {authenticatedNavItems.map((item) => (
                    <SheetClose asChild key={item.to}>
                      <Button variant="ghost" className={cn(getButtonClass(item.to), "justify-start")} asChild={item.to !== '#'}>
                        {item.to === '#' ? ( // Handle logout as a direct button click
                          <span onClick={item.onClick} className="flex items-center w-full">
                            <item.icon className="mr-2 h-4 w-4" /> {item.label}
                          </span>
                        ) : (
                          <Link to={item.to} onClick={item.onClick} className="flex items-center w-full">
                            <item.icon className="mr-2 h-4 w-4" /> {item.label}
                          </Link>
                        )}
                      </Button>
                    </SheetClose>
                  ))}
                  {isAdminUser && (
                    <>
                      <div className="border-t border-border my-2"></div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                        Admin
                      </h3>
                      {adminNavItems.map((item) => (
                        <SheetClose asChild key={item.to}>
                          <Button variant="ghost" className={cn(getButtonClass(item.to), "justify-start")} asChild>
                            <Link to={item.to} className="flex items-center w-full">
                              <item.icon className="mr-2 h-4 w-4" /> {item.label}
                            </Link>
                          </Button>
                        </SheetClose>
                      ))}
                    </>
                  )}
                </>
              ) : (
                unauthenticatedNavItems.map((item) => (
                  <SheetClose asChild key={item.to}>
                    <Button variant="ghost" className={cn(getButtonClass(item.to), "justify-start")} asChild>
                      <Link to={item.to} className="flex items-center w-full">
                        <item.icon className="mr-2 h-4 w-4" /> {item.label}
                      </Link>
                    </Button>
                  </SheetClose>
                ))
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