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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 via-blue-100 to-green-100">
        <p className="text-lg text-gray-700">Loading authentication...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-xl border border-gray-200">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Sign In to SoulFlow</h2>
        <Auth
          supabaseClient={supabase}
          providers={['google']}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(252 96% 50%)', // A purple shade
                  brandAccent: 'hsl(252 96% 40%)', // A darker purple shade
                },
              },
            },
          }}
          theme="light"
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