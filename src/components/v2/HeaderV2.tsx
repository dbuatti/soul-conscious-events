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

const HeaderV2 = () => {
  const location = useLocation();
  const { user } = useSession();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error.message);
      toast.error('Failed to log out.');
    } else {
      toast.success('Logged out successfully!');
    }
  };

  const isAdminUser = user?.email === 'daniele.buatti@gmail.com';

  const navItems = user ? [
    { to: "/", label: "Home", icon: Home },
    { to: "/submit-event", label: "Create Event", icon: PlusCircle },
    { to: "/my-events", label: "My Events", icon: CalendarCheck },
    { to: "/my-bookmarks", label: "My Bookmarks", icon: Bookmark },
    { to: "/account-settings", label: "Settings", icon: Settings },
    { to: "/about", label: "About", icon: Info },
  ] : [
    { to: "/", label: "Home", icon: Home },
    { to: "/login", label: "Login / Sign Up", icon: LogIn },
    { to: "/about", label: "About", icon: Info },
  ];

  return (
    <header className="w-full py-6 px-4 md:px-8 flex justify-center sticky top-0 z-50">
      <div className="w-full max-w-6xl flex justify-between items-center floating-nav px-8 py-4 rounded-full">
        <Link to="/" className="flex flex-col items-start group">
          <span className="text-2xl font-bold leading-none font-heading tracking-tight text-primary group-hover:text-primary/80 transition-colors">SoulFlow</span>
          <span className="text-[10px] uppercase tracking-[0.4em] font-black text-muted-foreground/60 leading-none mt-1.5">Australia</span>
        </Link>

        <div className="hidden md:flex items-center gap-2">
          {navItems.slice(0, 3).map((item) => (
            <Link key={item.to} to={item.to}>
              <Button variant="ghost" className={cn(
                "rounded-full px-5 font-medium transition-all",
                location.pathname === item.to ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-primary"
              )}>
                {item.label}
              </Button>
            </Link>
          ))}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-primary/10 rounded-full h-10 w-10 ml-2">
                <Menu className="h-5 w-5 text-primary" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[240px] p-2 rounded-2xl shadow-2xl mt-4">
              <DropdownMenuLabel className="text-[10px] font-black text-muted-foreground/60 px-3 py-2 uppercase tracking-widest">Menu</DropdownMenuLabel>
              {navItems.map((item) => (
                <DropdownMenuItem key={item.to} asChild className="rounded-xl cursor-pointer">
                  <Link to={item.to} className="flex items-center py-2.5 px-3">
                    <item.icon className="mr-3 h-4 w-4 text-primary/60" /> {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
              {isAdminUser && (
                <>
                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuLabel className="text-[10px] font-black text-muted-foreground/60 px-3 py-2 uppercase tracking-widest">Admin</DropdownMenuLabel>
                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                    <Link to="/admin/panel" className="flex items-center py-2.5 px-3">
                      <UserCog className="mr-3 h-4 w-4 text-primary/60" /> Admin Panel
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              {user && (
                <>
                  <DropdownMenuSeparator className="my-2" />
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center py-2.5 px-3 text-destructive rounded-xl cursor-pointer">
                    <LogOut className="mr-3 h-4 w-4" /> Logout
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-primary/10 rounded-full h-10 w-10">
                <Menu className="h-5 w-5 text-primary" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[260px] p-2 rounded-2xl shadow-2xl mt-4">
              {navItems.map((item) => (
                <DropdownMenuItem key={item.to} asChild className="rounded-xl cursor-pointer">
                  <Link to={item.to} className="flex items-center py-3 px-3">
                    <item.icon className="mr-3 h-5 w-5 text-primary/60" /> {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default HeaderV2;