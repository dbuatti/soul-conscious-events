import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Menu, LogOut, UserCog, CalendarCheck, Bookmark, LogIn, PlusCircle, Settings, Info } from 'lucide-react';
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

  const getButtonClass = (path: string) => {
    const isActive = location.pathname === path || (path === "/" && location.pathname === "/"); // Special handling for root path
    return cn(
      "w-full justify-start text-foreground hover:text-primary transition-colors duration-300 ease-in-out transform hover:scale-105",
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
    { to: "/account-settings", label: "Account Settings", icon: Settings },
    { to: "/about", label: "About", icon: Info },
  ];

  const unauthenticatedNavItems: NavItem[] = [
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
    <header className="w-full bg-white shadow-lg border-b border-gray-200 py-3 px-4 md:px-8 flex justify-center dark:bg-background dark:border-gray-800 sticky top-0 z-50">
      <div className="w-full max-w-2xl flex justify-between items-center">
        <Link to="/" className="flex flex-col items-start text-primary hover:text-primary/80 transition-colors dark:text-primary dark:hover:text-primary/80">
          <span className="text-2xl font-bold leading-none">SoulFlow 2.0</span>
          <span className="text-xs font-medium text-muted-foreground leading-none mt-1">Australia</span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px] p-2 dark:bg-card dark:border-border">
            {user ? (
              <>
                {authenticatedNavItems.map((item) => (
                  <DropdownMenuItem key={item.to} asChild>
                    <Link to={item.to} className={cn(getButtonClass(item.to), "flex items-center")}>
                      <item.icon className="mr-2 h-4 w-4" /> {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                {isAdminUser && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-sm font-semibold text-muted-foreground">Admin</DropdownMenuLabel>
                    {adminNavItems.map((item) => (
                      <DropdownMenuItem key={item.to} asChild>
                        <Link to={item.to} className={cn(getButtonClass(item.to), "flex items-center")}>
                          <item.icon className="mr-2 h-4 w-4" /> {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className={cn(getButtonClass("#"), "flex items-center text-destructive hover:text-destructive/80")}>
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </>
            ) : (
              unauthenticatedNavItems.map((item) => (
                <DropdownMenuItem key={item.to} asChild>
                  <Link to={item.to} className={cn(getButtonClass(item.to), "flex items-center")}>
                    <item.icon className="mr-2 h-4 w-4" /> {item.label}
                  </Link>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default HeaderV2;