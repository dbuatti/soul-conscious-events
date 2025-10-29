import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button'; // Import Button for custom styling

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-lg text-foreground">Loading authentication...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8 bg-background">
      <div className="w-full max-w-md bg-card p-8 rounded-xl shadow-lg border border-border">
        <h2 className="text-3xl font-bold text-foreground text-center mb-6">Log In</h2>
        <p className="text-center text-muted-foreground mb-8">Log In for Access to the Hottest Events in your area</p>
        <Auth
          supabaseClient={supabase}
          providers={['google']} // Only Google provider for now as per image
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary))',
                  brandAccent: 'hsl(var(--primary-foreground))',
                  inputBackground: 'hsl(var(--input))',
                  inputBorder: 'hsl(var(--border))',
                  inputPlaceholder: 'hsl(var(--muted-foreground))',
                  messageText: 'hsl(var(--foreground))',
                  messageBackground: 'hsl(var(--secondary))',
                  defaultButtonBackground: 'hsl(var(--primary))',
                  defaultButtonBorder: 'hsl(var(--primary))',
                  defaultButtonBackgroundHover: 'hsl(var(--primary)/80%)',
                  defaultButtonText: 'hsl(var(--primary-foreground))',
                  // Customizing social buttons to match the image
                  // For Google button, we'll rely on default Auth UI styling or override with CSS if needed
                },
              },
            },
          }}
          theme="dark" // Force dark theme for Auth UI as per image
          redirectTo={window.location.origin}
          localization={{
            variables: {
              sign_in: {
                email_label: 'Email address',
                password_label: 'Your Password',
                email_input_placeholder: 'Your email address',
                password_input_placeholder: 'Your Password',
                button_label: 'Log In With Your Email', // Changed button text
                social_provider_text: 'Sign up with {{provider}}',
                link_text: 'Already have an account? Sign In',
              },
              sign_up: {
                email_label: 'Email address',
                password_label: 'Create a Password',
                email_input_placeholder: 'Your email address',
                password_input_placeholder: 'Create a Password',
                button_label: 'Sign Up With Your Email', // Changed button text
                social_provider_text: 'Sign up with {{provider}}',
                link_text: 'Don\'t have an account? Create an Account',
              },
              forgotten_password: {
                link_text: 'Forgot your password?',
              },
            },
          }}
        />
        {/* Custom "Create an Account" link to match image */}
        <p className="text-center text-muted-foreground mt-4">
          New to todo.today?{' '}
          <Button variant="link" className="p-0 h-auto text-primary hover:underline" onClick={() => navigate('/login?action=signup')}>
            Create an Account
          </Button>
        </p>
      </div>
    </div>
  );
};

export default Login;