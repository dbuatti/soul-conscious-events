import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Menu, LogOut } from 'lucide-react'; // Removed Eye, EyeOff
import { useIsMobile } from '@/hooks/use-mobile';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Header = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useSession(); // Removed isViewingAsPublic, toggleViewAsPublic

  const isAdmin = user?.email === 'daniele.buatti@gmail.com';

  const getButtonClass = (path: string) => {
    return cn(
      "text-gray-700 hover:text-purple-700",
      location.pathname === path && "font-bold text-purple-700"
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

  const navLinks = (
    <>
      <Link to="/">
        <Button variant="ghost" className={getButtonClass("/")}>
          Events
        </Button>
      </Link>
      <Link to="/submit-event">
        <Button variant="ghost" className={getButtonClass("/submit-event")}>
          Add Event
        </Button>
      </Link>
      <Link to="/map">
        <Button variant="ghost" className={cn(getButtonClass("/map"), "flex items-center")}>
          Map
          <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 text-xs font-semibold">
            Beta
          </Badge>
        </Button>
      </Link>
      <Link to="/contact">
        <Button variant="ghost" className={getButtonClass("/contact")}>
          Contact
        </Button>
      </Link>
      {/* Admin button is always visible, ProtectedRoute handles access */}
      <Link to="/admin/panel">
        <Button className={cn("bg-blue-600 hover:bg-blue-700 text-white", location.pathname.startsWith("/admin") && "bg-blue-700")}>
          Admin
        </Button>
      </Link>
      {/* Removed View as Public/Admin toggle
      {isAdmin && (
        <Button
          variant="outline"
          onClick={toggleViewAsPublic}
          className={cn(
            "flex items-center",
            isViewingAsPublic ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-purple-50 text-purple-700 hover:bg-purple-100"
          )}
        >
          {isViewingAsPublic ? (
            <>
              <EyeOff className="mr-2 h-4 w-4" /> View as Admin
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" /> View as Public
            </>
          )}
        </Button>
      )}
      */}
      {user ? (
        <Button variant="ghost" onClick={handleLogout} className="text-red-600 hover:text-red-700">
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
      ) : null}
    </>
  );

  return (
    <header className="w-full bg-white shadow-sm py-4 px-6 md:px-8 flex justify-center">
      <div className="w-full max-w-4xl flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-purple-700 hover:text-purple-800 transition-colors">
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
            <SheetContent side="right" className="w-[250px] sm:w-[300px] p-6">
              <nav className="flex flex-col space-y-4 mt-8">
                {React.Children.map(navLinks, (child) => (
                  <SheetClose asChild key={child.key}>
                    {child}
                  </SheetClose>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        ) : (
          <nav className="space-x-4 hidden md:flex">
            {navLinks}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;