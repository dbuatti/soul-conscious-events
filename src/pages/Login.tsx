import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { MadeWithDyad } from '@/components/made-with-dyad';

const Login = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 via-blue-100 to-green-100 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-xl border border-gray-200">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">Welcome to SoulFlow</h2>
        <p className="text-center text-gray-600 mb-8">Connect with soulful events in your community.</p>
        <Auth
          supabaseClient={supabase}
          providers={['google']} // Added Google as a provider
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(240 5.3% 26.1%)', // Primary color for buttons/links
                  brandAccent: 'hsl(240 5.9% 10%)', // Hover color
                },
              },
            },
          }}
          theme="light"
          redirectTo={window.location.origin} // Redirect to home after login
        />
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Login;