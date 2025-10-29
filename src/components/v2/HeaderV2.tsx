import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Menu, LogOut, UserCog, CalendarCheck, Bookmark, LogIn, PlusCircle, Settings, Info, Home } from 'lucide-react'; // Added Home icon
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  onClick?: () => Promise<void> | void;
}

const HeaderV2 = () => {
  const location = useLocation();
  const { user } = useSession();

  // Removed getButtonClass as it was causing issues with dropdown menu item text color.
  // Active state styling will be applied directly to the Link components.

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
    { to: "/", label: "Home", icon: Home },
    { to: "/submit-event", label: "Create Event", icon: PlusCircle },
    { to: "/my-events", label: "My Events", icon: CalendarCheck },
    { to: "/account-settings", label: "Account Settings", icon: Settings },
    { to: "/about", label: "About", icon: Info },
  ];

  const unauthenticatedNavItems: NavItem[] = [
    { to: "/", label: "Home", icon: Home },
    { to: "/login", label: "Login / Sign Up", icon: LogIn },
    { to: "/about", label: "About", icon: Info },
  ];

  const adminNavItems: NavItem[] = [
    { to: "/old/admin/panel", label: "Admin Panel (Old)", icon: UserCog },
    { to: "/old/dev-space", label: "Dev Space (Old)", icon: UserCog },
    { to: "/old/map", label: "Map (Old)", icon: UserCog },
  ];

  const isAdminUser = user?.email === 'daniele.buatti@gmail.com';

  return (
    <header className="w-full bg-primary py-3 px-4 md:px-8 flex justify-center sticky top-0 z-50">
      <div className="w-full max-w-2xl flex justify-between items-center">
        <Link to="/" className="flex flex-col items-start text-primary-foreground hover:text-primary-foreground/80 transition-colors">
          <span className="text-2xl font-bold leading-none">SoulFlow 2.0</span>
          <span className="text-xs font-medium text-primary-foreground/70 leading-none mt-1">Australia</span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px] p-2 dark:bg-card dark:border-border">
            {user ? (
              <>
                {authenticatedNavItems.map((item) => {
                  const isActive = location.pathname === item.to || (item.to === "/" && location.pathname === "/");
                  return (
                    <DropdownMenuItem key={item.to} asChild>
                      <Link to={item.to} className={cn("flex items-center", isActive && "font-bold text-primary")}>
                        <item.icon className="mr-2 h-4 w-4" /> {item.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
                {isAdminUser && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-sm font-semibold text-foreground dark:text-muted-foreground">Admin</DropdownMenuLabel>
                    {adminNavItems.map((item) => {
                      const isActive = location.pathname === item.to;
                      return (
                        <DropdownMenuItem key={item.to} asChild>
                          <Link to={item.to} className={cn("flex items-center", isActive && "font-bold text-primary")}>
                            <item.icon className="mr-2 h-4 w-4" /> {item.label}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center text-destructive hover:text-destructive/80">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </>
            ) : (
              unauthenticatedNavItems.map((item) => {
                const isActive = location.pathname === item.to || (item.to === "/" && location.pathname === "/");
                return (
                  <DropdownMenuItem key={item.to} asChild>
                    <Link to={item.to} className={cn("flex items-center", isActive && "font-bold text-primary")}>
                      <item.icon className="mr-2 h-4 w-4" /> {item.label}
                    </Link>
                  </DropdownMenuItem>
                );
              })
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default HeaderV2;