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
import { ThemeToggle } from './ThemeToggle';

const Header = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useSession();

  const getButtonClass = (path: string) => {
    return cn(
      "text-foreground hover:text-primary transition-all duration-300 ease-in-out transform hover:scale-105",
      location.pathname === path && "font-bold text-primary"
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

  const navItems = [
    { to: "/", label: "Events" },
    { to: "/submit-event", label: "Add Event" },
    { to: "/map", label: "Map", badge: "Beta" },
    { to: "/contact", label: "Contact" },
    { to: "/about", label: "About" },
  ];

  return (
    <header className="w-full bg-white shadow-lg border-b border-gray-200 py-5 px-6 md:px-8 flex justify-center dark:bg-background dark:border-gray-800">
      <div className="w-full max-w-screen-lg flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-primary hover:text-primary/80 transition-colors dark:text-primary dark:hover:text-primary/80 md:mr-6">
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
                    <Button variant="ghost" className={cn(getButtonClass(item.to), item.badge && "flex items-center")} asChild>
                      <Link to={item.to}>
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
                {user?.email === 'daniele.buatti@gmail.com' && (
                  <SheetClose asChild>
                    <Button variant="ghost" className={getButtonClass("/admin/panel")} asChild>
                      <Link to="/admin/panel">
                        Admin
                      </Link>
                    </Button>
                  </SheetClose>
                )}
                {user ? (
                  <SheetClose asChild>
                    <Button variant="ghost" onClick={handleLogout} className="text-destructive hover:text-destructive/80 transition-all duration-300 ease-in-out transform hover:scale-105 dark:text-destructive dark:hover:text-destructive/80">
                      <LogOut className="mr-2 h-4 w-4" /> Logout
                    </Button>
                  </SheetClose>
                ) : (
                  <SheetClose asChild>
                    <Button className="w-full bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105 dark:bg-primary dark:hover:bg-primary/80" asChild>
                      <Link to="/login">
                        Login
                      </Link>
                    </Button>
                  </SheetClose>
                )}
                <ThemeToggle />
              </nav>
            </SheetContent>
          </Sheet>
        ) : (
          <nav className="hidden md:flex items-center w-full">
            <div className="flex items-center space-x-4">
              {navItems.map((item) => (
                <Link to={item.to} key={item.to}>
                  <Button variant="ghost" className={cn(getButtonClass(item.to), item.badge && "flex items-center")}>
                    {item.label}
                    {item.badge && (
                      <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold">
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                </Link>
              ))}
            </div>
            <div className="flex items-center space-x-4 ml-auto">
              {user?.email === 'daniele.buatti@gmail.com' && (
                <Link to="/admin/panel">
                  <Button variant="ghost" className={getButtonClass("/admin/panel")}>
                    Admin
                  </Button>
                </Link>
              )}
              {user ? (
                <Button variant="ghost" onClick={handleLogout} className="text-destructive hover:text-destructive/80 transition-all duration-300 ease-in-out transform hover:scale-105 dark:text-destructive dark:hover:text-destructive/80">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>
              ) : (
                <Link to="/login">
                  <Button className="bg-primary hover:bg-primary/80 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105 dark:bg-primary dark:hover:bg-primary/80">
                    Login
                  </Button>
                </Link>
              )}
              <ThemeToggle />
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;