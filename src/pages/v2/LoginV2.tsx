import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { getRedirectUrl } from '@/lib/utils';
import { Bookmark, CalendarCheck, PlusCircle } from 'lucide-react';

const LoginV2 = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-foreground">Loading authentication...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center min-h-[calc(100vh-120px)] px-4 py-12 gap-16 max-w-6xl mx-auto">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
        <div className="space-y-4">
          <h1 className="text-5xl font-black font-heading tracking-tight text-foreground leading-tight">
            Your Soulful <br />
            <span className="text-primary italic font-normal">Journey Awaits</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Create an account to unlock the full SoulFlow experience and connect with the community.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Bookmark className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Personalized Bookmarks</h3>
              <p className="text-muted-foreground text-sm">Save events you're interested in and build your own soulful calendar.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <PlusCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Share Your Magic</h3>
              <p className="text-muted-foreground text-sm">Submit your own workshops, circles, or gatherings to reach a wider audience.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <CalendarCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Manage with Ease</h3>
              <p className="text-muted-foreground text-sm">Keep your event listings up to date with our simple management tools.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md glass-card p-8 sm:p-10 rounded-[2.5rem] shadow-2xl animate-in fade-in slide-in-from-right-8 duration-1000">
        <h2 className="text-3xl font-bold text-foreground text-center mb-8 font-heading">Sign In</h2>
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