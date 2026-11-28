import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { consumeReturnTo, getRedirectUrl } from '@/lib/utils';
import { Bookmark, CalendarCheck, PlusCircle, Link2, Wand2, Send } from 'lucide-react';
import SEO from '@/components/SEO';

const LoginV2 = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useSession();
  const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '';
  // Organisers bounced here from "List your event" get host-specific copy.
  const isHost = fromPath.startsWith('/submit-event');
  const perks = isHost
    ? [
        { icon: Link2, title: 'Paste a link or flyer', text: 'Humanitix, Eventbrite, Instagram post or flyer text — anything works.' },
        { icon: Wand2, title: 'We fill in the details', text: 'Date, time, venue, price and cover image, ready for you to check.' },
        { icon: Send, title: 'Publish & share', text: 'Your event appears in the guide and on the map, with a share kit for your audience.' },
      ]
    : [
        { icon: Bookmark, title: 'Save events', text: 'Bookmark gatherings you love and build your own soulful calendar.' },
        { icon: PlusCircle, title: 'List your own events', text: 'Share your workshops, circles and gatherings with people nearby — free.' },
        { icon: CalendarCheck, title: 'Manage with ease', text: 'Keep your listings up to date from one place.' },
      ];

  // ProtectedRoute stores where the visitor was heading in state.from. Sending
  // everyone to "/" instead dumped people who had been bounced here mid-task --
  // an organiser part-way through listing an event lost everything they had typed.
  useEffect(() => {
    if (!isLoading && user) {
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(from ?? consumeReturnTo() ?? '/', { replace: true });
    }
  }, [user, isLoading, navigate, location.state]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-foreground">Loading authentication...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse lg:flex-row items-center justify-center min-h-auth px-4 py-8 sm:py-12 gap-10 lg:gap-16 max-w-6xl mx-auto">
      <SEO 
        title="Login & Sign Up | SoulFlow Australia"
        description="Sign in or create a free account on SoulFlow to bookmark events, submit your own conscious gatherings, and manage your listings."
      />
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl font-semibold font-heading tracking-tight text-foreground leading-tight">
            {isHost ? (
              <>List your event <br /><span className="text-primary italic font-normal">free, in a few steps</span></>
            ) : (
              <>Your soulful <br /><span className="text-primary italic font-normal">journey awaits</span></>
            )}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {isHost
              ? 'Sign in or create a free account and you’ll go straight to your event form.'
              : 'A free account lets you save events and list your own gatherings.'}
          </p>
        </div>
        <div className="space-y-6">
          {perks.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-4">
              <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{title}</h3>
                <p className="text-muted-foreground text-sm">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="w-full max-w-md organic-card p-6 sm:p-10 rounded-[1.75rem] shadow-2xl animate-in fade-in slide-in-from-right-8 duration-1000">
        <h2 className="text-3xl font-bold text-foreground text-center mb-6 font-heading">{isHost ? 'Sign in to list your event' : 'Sign in'}</h2>
        <Auth
          supabaseClient={supabase}
          providers={['google']}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary))',
                  brandAccent: 'hsl(var(--primary-foreground))',
                  inputBackground: 'transparent',
                  inputBorder: 'hsl(var(--border))',
                  inputPlaceholder: 'hsl(var(--muted-foreground))',
                  messageText: 'hsl(var(--foreground))',
                  messageBackground: 'hsl(var(--secondary))',
                  defaultButtonBackground: 'hsl(var(--primary))',
                  defaultButtonBorder: 'hsl(var(--primary))',
                  defaultButtonBackgroundHover: 'hsl(var(--primary)/80%)',
                  defaultButtonText: 'hsl(var(--primary-foreground))',
                },
                radii: {
                  borderRadiusButton: '1rem',
                  inputBorderRadius: '1rem',
                },
              },
            },
          }}
          theme="light"
          redirectTo={getRedirectUrl()}
          localization={{
            variables: {
              sign_in: {
                email_label: 'Email address',
                password_label: 'Your Password',
                email_input_placeholder: 'Your email address',
                password_input_placeholder: 'Your Password',
                button_label: 'Sign In',
                social_provider_text: 'Sign in with {{provider}}',
                link_text: 'Already have an account? Sign In',
              },
              sign_up: {
                email_label: 'Email address',
                password_label: 'Create a Password',
                email_input_placeholder: 'Your email address',
                password_input_placeholder: 'Create a Password',
                button_label: 'Sign Up',
                social_provider_text: 'Sign up with {{provider}}',
                link_text: 'Don\'t have an account? Sign Up',
              },
              forgotten_password: {
                link_text: 'Forgot your password?',
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default LoginV2;