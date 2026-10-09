import { Link, NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Menu, LogOut, UserCog, CalendarCheck, Bookmark, LogIn, Plus, Settings, Info, Home, LayoutDashboard, Map as MapIcon, Mail } from 'lucide-react';
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

export const SoulFlowMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
    <circle cx="16" cy="18" r="9" className="fill-primary" />
    <circle cx="16" cy="18" r="13.5" className="fill-none stroke-accent" strokeWidth="1.5" strokeDasharray="2 3.2" />
    <rect x="0" y="22" width="32" height="10" className="fill-background" />
    <path d="M3 22.5h26" className="stroke-foreground/70" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const desktopLinks = [
  { to: '/', label: 'Events', end: true },
  { to: '/map', label: 'Map' },
  { to: '/about', label: 'About' },
];

const HeaderV2 = () => {
  const { user, isAdmin } = useSession();

  const handleCreateEventClick = async () => {
    const { error } = await supabase.from('page_visit_logs').insert([{
      user_id: user?.id || null,
      page_path: '/submit-event',
      action_type: 'click_add_event_button',
    }]);
    if (error) console.error('Error logging add event button click:', error);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error.message);
      toast.error('Failed to log out.');
    } else {
      toast.success('Logged out successfully!');
    }
  };

  const menuItems = user ? [
    { to: '/', label: 'Events', icon: Home },
    { to: '/map', label: 'Map', icon: MapIcon },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/my-events', label: 'My Events', icon: CalendarCheck },
    { to: '/my-bookmarks', label: 'Saved Events', icon: Bookmark },
    { to: '/account-settings', label: 'Settings', icon: Settings },
    { to: '/about', label: 'About', icon: Info },
    { to: '/contact', label: 'Contact', icon: Mail },
  ] : [
    { to: '/', label: 'Events', icon: Home },
    { to: '/map', label: 'Map', icon: MapIcon },
    { to: '/about', label: 'About', icon: Info },
    { to: '/contact', label: 'Contact', icon: Mail },
    { to: '/login', label: 'Sign in / Sign up', icon: LogIn },
  ];

  const initials = (user?.user_metadata?.first_name?.[0] || user?.email?.[0] || '?').toUpperCase();

  return (
    <header className="w-full sticky top-0 z-50 floating-nav">
      <div className="mx-auto w-full max-w-6xl flex items-center justify-between gap-4 px-4 sm:px-6 h-16">
        <Link to="/" className="flex items-center gap-2.5 group" aria-label="SoulFlow home">
          <SoulFlowMark className="h-8 w-8 transition-transform duration-500 group-hover:-translate-y-0.5" />
          <span className="flex flex-col">
            <span className="text-[1.6rem] font-semibold leading-none font-heading tracking-tight text-foreground">SoulFlow</span>
            <span className="text-[9px] uppercase tracking-[0.35em] font-semibold text-muted-foreground leading-none mt-1">Australia</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="Main">
          {desktopLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn(
                'relative px-4 py-2 text-sm font-medium rounded-full transition-colors',
                isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  <span className={cn(
                    'absolute left-4 right-4 -bottom-0.5 h-0.5 rounded-full bg-primary transition-transform origin-left',
                    isActive ? 'scale-x-100' : 'scale-x-0'
                  )} />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild className="rounded-full h-10 px-4 sm:px-5 shadow-sm shadow-primary/20 font-semibold">
            <Link to="/submit-event" onClick={handleCreateEventClick}>
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">List your event</span>
            </Link>
          </Button>

          {!user && (
            <Button asChild variant="ghost" className="hidden md:inline-flex rounded-full h-10 px-4 text-sm font-medium text-muted-foreground hover:text-foreground">
              <Link to="/login">Sign in</Link>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open menu"
                className={cn('rounded-full h-10 w-10', user ? 'bg-secondary hover:bg-secondary/70' : 'md:hidden hover:bg-secondary')}
              >
                {user ? (
                  <span className="text-sm font-semibold text-primary">{initials}</span>
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 p-2 rounded-2xl shadow-xl mt-2">
              {user && (
                <DropdownMenuLabel className="px-3 py-2 font-normal">
                  <span className="block text-xs text-muted-foreground">Signed in as</span>
                  <span className="block text-sm font-medium truncate">{user.email}</span>
                </DropdownMenuLabel>
              )}
              {user && <DropdownMenuSeparator className="my-1" />}
              {menuItems.map((item) => (
                <DropdownMenuItem key={item.to} asChild className="rounded-xl cursor-pointer">
                  <Link to={item.to} className="flex items-center py-2.5 px-3">
                    <item.icon className="mr-3 h-4 w-4 text-muted-foreground" /> {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
              {isAdmin && (
                <>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                    <Link to="/admin/panel" className="flex items-center py-2.5 px-3">
                      <UserCog className="mr-3 h-4 w-4 text-muted-foreground" /> Admin Panel
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              {user && (
                <>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center py-2.5 px-3 text-destructive rounded-xl cursor-pointer">
                    <LogOut className="mr-3 h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default HeaderV2;
