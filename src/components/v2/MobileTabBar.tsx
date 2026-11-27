import { NavLink, useLocation } from 'react-router-dom';
import { Home, Map as MapIcon, Bookmark, Plus, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from '@/components/SessionContextProvider';

/**
 * Native-feel bottom navigation for phones. Hidden on desktop (md+) where the
 * header nav takes over, and on the event detail route where the fixed ticket
 * bar already owns the bottom of the screen.
 */
const tabs = [
  { to: '/', label: 'Events', icon: Home, end: true },
  { to: '/map', label: 'Map', icon: MapIcon },
  { to: '/my-bookmarks', label: 'Saved', icon: Bookmark },
];

const MobileTabBar = () => {
  const location = useLocation();
  const { user } = useSession();

  // Event detail pages have the fixed booking bar; the login page is a
  // focused flow. Keep the tab bar out of the way on both.
  if (location.pathname.startsWith('/events/') || location.pathname === '/login') {
    return null;
  }

  const initials = (user?.user_metadata?.first_name?.[0] || user?.email?.[0] || '?').toUpperCase();

  return (
    <nav
      aria-label="Mobile"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 floating-nav border-t border-border/60 pb-[max(0.5rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom-4 duration-300"
    >
      <ul className="mx-auto max-w-md flex items-stretch justify-around px-2 pt-1.5">
        {tabs.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.end}
              className={({ isActive }) => cn(
                'flex flex-col items-center justify-center gap-1 min-h-[3rem] rounded-2xl text-[10px] font-semibold tracking-wide transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <tab.icon className="h-5 w-5" strokeWidth={2.2} />
              {tab.label}
            </NavLink>
          </li>
        ))}
        <li className="flex-1">
          <NavLink
            to="/submit-event"
            className={({ isActive }) => cn(
              'flex flex-col items-center justify-center gap-1 min-h-[3rem] rounded-2xl text-[10px] font-semibold tracking-wide transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground shadow-sm shadow-primary/30">
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </span>
            List event
          </NavLink>
        </li>
        <li className="flex-1">
          <NavLink
            to="/account-settings"
            className={({ isActive }) => cn(
              'flex flex-col items-center justify-center gap-1 min-h-[3rem] rounded-2xl text-[10px] font-semibold tracking-wide transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            {user ? (
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-secondary text-primary text-[10px] font-semibold">
                {initials}
              </span>
            ) : (
              <User className="h-5 w-5" strokeWidth={2.2} />
            )}
            Account
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default MobileTabBar;
