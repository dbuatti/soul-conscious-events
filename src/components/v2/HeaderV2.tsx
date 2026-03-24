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
    { to: "/my-bookmarks", label: "My Bookmarks", icon: Bookmark },
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
    <header className="w-full py-6 px-4 md:px-8 flex justify-center sticky top-0 z-50">
      <div className="w-full max-w-5xl flex justify-between items-center glass px-6 py-3 rounded-full shadow-2xl border border-white/30 dark:border-white/10">
        <Link to="/" className="flex flex-col items-start group">
          <span className="text-2xl font-bold leading-none font-heading tracking-tight text-primary group-hover:text-primary/80 transition-colors">SoulFlow</span>
          <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-muted-foreground leading-none mt-1">Australia</span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-primary/10 rounded-full h-10 w-10 transition-all duration-300">
              <Menu className="h-5 w-5 text-primary" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[240px] p-2 glass shadow-2xl rounded-2xl border-white/20 mt-2">
            {user ? (
              <>
                <DropdownMenuLabel className="text-[10px] font-black text-muted-foreground/60 px-3 py-2 uppercase tracking-[0.2em]">Navigation</DropdownMenuLabel>
                {authenticatedNavItems.map((item) => {
                  const isActive = location.pathname === item.to || (item.to === "/" && location.pathname === "/");
                  return (
                    <DropdownMenuItem key={item.to} asChild className="rounded-xl cursor-pointer focus:bg-primary/10 focus:text-primary">
                      <Link to={item.to} className={cn("flex items-center py-2.5 px-3 transition-all", isActive && "bg-primary/10 text-primary font-bold")}>
                        <item.icon className={cn("mr-3 h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} /> {item.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
                {isAdminUser && (
                  <>
                    <DropdownMenuSeparator className="my-2 opacity-20" />
                    <DropdownMenuLabel className="text-[10px] font-black text-muted-foreground/60 px-3 py-2 uppercase tracking-[0.2em]">Admin</DropdownMenuLabel>
                    {adminNavItems.map((item) => {
                      const isActive = location.pathname === item.to;
                      return (
                        <DropdownMenuItem key={item.to} asChild className="rounded-xl cursor-pointer focus:bg-primary/10 focus:text-primary">
                          <Link to={item.to} className={cn("flex items-center py-2.5 px-3 transition-all", isActive && "bg-primary/10 text-primary font-bold")}>
                            <item.icon className={cn("mr-3 h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} /> {item.label}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </>
                )}
                <DropdownMenuSeparator className="my-2 opacity-20" />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center py-2.5 px-3 text-destructive hover:text-destructive/80 rounded-xl cursor-pointer focus:bg-destructive/10">
                  <LogOut className="mr-3 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </>
            ) : (
              unauthenticatedNavItems.map((item) => {
                const isActive = location.pathname === item.to || (item.to === "/" && location.pathname === "/");
                return (
                  <DropdownMenuItem key={item.to} asChild className="rounded-xl cursor-pointer focus:bg-primary/10 focus:text-primary">
                    <Link to={item.to} className={cn("flex items-center py-2.5 px-3 transition-all", isActive && "bg-primary/10 text-primary font-bold")}>
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