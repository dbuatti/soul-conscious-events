import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Menu, LogOut, UserCog, CalendarCheck, Bookmark } from 'lucide-react'; // Import Bookmark icon
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

  const handleAddEventClick = async () => {
    const { error } = await supabase.from('page_visit_logs').insert([
      {
        user_id: user?.id || null,
        page_path: '/submit-event',
        action_type: 'click_add_event_button',
      },
    ]);
    if (error) {
      console.error('Error logging add event button click:', error);
    }
  };

  const navItems = [
    { to: "/", label: "Events" },
    { to: "/submit-event", label: "Add Event", onClick: handleAddEventClick },
    { to: "/map", label: "Map", badge: "Beta" },
    { to: "/contact", label: "Contact" },
    { to: "/about", label: "About" },
  ];

  const adminNavItems = [
    { to: "/admin/panel", label: "Admin Panel" },
    { to: "/dev-space", label: "Dev Space" },
  ];

  const isAdminPage = location.pathname.startsWith('/admin') || location.pathname.startsWith('/dev-space');

  return (
    <header className="w-full bg-white shadow-lg border-b border-gray-200 py-5 px-6 md:px-8 flex justify-center dark:bg-background dark:border-gray-800">
      <div className="w-full max-w-screen-lg flex justify-between items-center relative">
        <Link to="/" className="text-2xl font-bold text-primary hover:text-primary/80 transition-colors dark:text-primary dark:hover:text-primary/80">
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
                {navItems.map((item) => (
                  <SheetClose asChild key={item.to}>
                    <Button variant="ghost" className={cn(getButtonClass(item.to), "justify-start")} asChild>
                      <Link to={item.to} onClick={item.onClick}>
                        {item.label}
                        {item.badge && (
                          <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    </Button>
                  </SheetClose>
                ))}
                {user && ( // Show "My Events" and "My Bookmarks" only if logged in
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
                  </>
                )}
                {user?.email === 'daniele.buatti@gmail.com' && (
                  <>
                    <div className="border-t border-border my-2"></div>
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
                {user ? (
                  <SheetClose asChild>
                    <Button variant="ghost" onClick={handleLogout} className="text-destructive hover:text-destructive/80 justify-start">
                      <LogOut className="mr-2 h-4 w-4" /> Logout
                    </Button>
                  </SheetClose>
                ) : (
                  <SheetClose asChild>
                    <Button className="w-full bg-primary hover:bg-primary/80 text-primary-foreground" asChild>
                      <Link to="/login">
                        Login
                      </Link>
                    </Button>
                  </SheetClose>
                )}
                <div className="pt-4">
                  <ThemeToggle />
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        ) : (
          <>
            <nav className="hidden md:flex items-center space-x-2 absolute left-1/2 -translate-x-1/2">
              {navItems.map((item) => (
                <Link to={item.to} key={item.to}>
                  <Button variant="ghost" className={cn(getButtonClass(item.to), item.badge && "flex items-center")} onClick={item.onClick}>
                    {item.label}
                    {item.badge && (
                      <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold">
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                </Link>
              ))}
              {user && ( // Show "My Events" and "My Bookmarks" only if logged in
                <>
                  <Link to="/my-events">
                    <Button variant="ghost" className={cn(getButtonClass("/my-events"), "flex items-center")}>
                      <CalendarCheck className="mr-2 h-4 w-4" /> My Events
                    </Button>
                  </Link>
                  <Link to="/my-bookmarks">
                    <Button variant="ghost" className={cn(getButtonClass("/my-bookmarks"), "flex items-center")}>
                      <Bookmark className="mr-2 h-4 w-4" /> My Bookmarks
                    </Button>
                  </Link>
                </>
              )}
            </nav>
            <div className="hidden md:flex items-center space-x-4">
              {user?.email === 'daniele.buatti@gmail.com' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className={cn("text-foreground hover:text-primary transition-all", isAdminPage && "font-bold text-primary")}>
                      Admin <UserCog className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="dark:bg-card dark:border-border">
                    {adminNavItems.map((item) => (
                      <DropdownMenuItem key={item.to} asChild>
                        <Link to={item.to} className={cn("w-full", getButtonClass(item.to))}>
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {user ? (
                <Button variant="ghost" onClick={handleLogout} className="text-destructive hover:text-destructive/80">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>
              ) : (
                <Link to="/login">
                  <Button className="bg-primary hover:bg-primary/80 text-primary-foreground">
                    Login
                  </Button>
                </Link>
              )}
              <ThemeToggle />
            </div>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;