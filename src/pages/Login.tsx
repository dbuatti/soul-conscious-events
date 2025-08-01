import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { toast } from 'sonner';

const Login = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading && user) {
      // If user is already logged in, redirect to home
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 dark:from-background dark:to-background">
        <p className="text-lg text-foreground">Loading authentication...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8 bg-gradient-to-br from-primary/10 to-secondary/10 dark:from-background dark:to-background">
      <div className="w-full max-w-md bg-white p-4 rounded-xl shadow-lg border border-gray-200 dark:bg-card dark:border-border">
        <h2 className="text-3xl font-bold text-foreground text-center mb-6">Sign In to SoulFlow</h2>
        <Auth
          supabaseClient={supabase}
          providers={['google']}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary))', // A purple shade
                  brandAccent: 'hsl(var(--primary-foreground))', // A darker purple shade
                  inputBackground: 'hsl(var(--input))',
                  inputBorder: 'hsl(var(--border))',
                  inputPlaceholder: 'hsl(var(--muted-foreground))',
                  messageText: 'hsl(var(--foreground))',
                  messageBackground: 'hsl(var(--secondary))',
                  defaultButtonBackground: 'hsl(var(--primary))', // Fixed property name
                  defaultButtonBorder: 'hsl(var(--primary))', // Fixed property name
                  defaultButtonBackgroundHover: 'hsl(var(--primary)/80%)',
                  defaultButtonText: 'hsl(var(--primary-foreground))', // Fixed property name
                },
              },
            },
          }}
          theme="dark" // Set default theme to dark for Auth UI
          redirectTo={window.location.origin} // Redirect to home after login
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

export default Login;