import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Menu, LogOut, UserCog, CalendarCheck, Bookmark, LogIn, PlusCircle, Settings, Info, Home } from 'lucide-react';
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
    { to: "/admin/panel", label: "Admin Panel", icon: UserCog },
    { to: "/dev-space", label: "Dev Space", icon: UserCog },
    { to: "/map", label: "Map", icon: UserCog },
  ];

  const isAdminUser = user?.email === 'daniele.buatti@gmail.com';

  return (
    <header className="w-full bg-primary py-4 px-4 md:px-8 flex justify-center sticky top-0 z-50 shadow-md">
      <div className="w-full max-w-2xl flex justify-between items-center">
        <Link to="/" className="flex flex-col items-start text-primary-foreground hover:opacity-90 transition-opacity">
          <span className="text-3xl font-bold leading-none font-heading tracking-tight">SoulFlow</span>
          <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-primary-foreground/60 leading-none mt-1.5">Australia</span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10 rounded-full h-10 w-10">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[220px] p-2 dark:bg-card dark:border-border shadow-xl rounded-xl">
            {user ? (
              <>
                <DropdownMenuLabel className="text-xs font-bold text-muted-foreground px-2 py-1.5 uppercase tracking-wider">Menu</DropdownMenuLabel>
                {authenticatedNavItems.map((item) => {
                  const isActive = location.pathname === item.to || (item.to === "/" && location.pathname === "/");
                  return (
                    <DropdownMenuItem key={item.to} asChild className="rounded-lg cursor-pointer">
                      <Link to={item.to} className={cn("flex items-center py-2", isActive && "bg-primary/10 text-primary font-bold")}>
                        <item.icon className={cn("mr-3 h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} /> {item.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
                {isAdminUser && (
                  <>
                    <DropdownMenuSeparator className="my-2" />
                    <DropdownMenuLabel className="text-xs font-bold text-muted-foreground px-2 py-1.5 uppercase tracking-wider">Admin</DropdownMenuLabel>
                    {adminNavItems.map((item) => {
                      const isActive = location.pathname === item.to;
                      return (
                        <DropdownMenuItem key={item.to} asChild className="rounded-lg cursor-pointer">
                          <Link to={item.to} className={cn("flex items-center py-2", isActive && "bg-primary/10 text-primary font-bold")}>
                            <item.icon className={cn("mr-3 h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} /> {item.label}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </>
                )}
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center py-2 text-destructive hover:text-destructive/80 rounded-lg cursor-pointer">
                  <LogOut className="mr-3 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </>
            ) : (
              unauthenticatedNavItems.map((item) => {
                const isActive = location.pathname === item.to || (item.to === "/" && location.pathname === "/");
                return (
                  <DropdownMenuItem key={item.to} asChild className="rounded-lg cursor-pointer">
                    <Link to={item.to} className={cn("flex items-center py-2", isActive && "bg-primary/10 text-primary font-bold")}>
                      <item.icon className={cn("mr-3 h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} /> {item.label}
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