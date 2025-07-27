import { MadeWithDyad } from "@/components/made-with-dyad";
import { useSession } from "@/components/SessionContextProvider";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 via-blue-100 to-green-100">
        <div className="text-center text-gray-700">
          <div className="animate-pulse text-4xl">✨</div>
          <p className="mt-4 text-xl">Loading SoulFlow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 via-blue-100 to-green-100 p-4">
      <div className="text-center bg-white p-8 rounded-lg shadow-xl border border-gray-200 max-w-2xl w-full">
        <h1 className="text-4xl font-bold mb-4 text-gray-800">Welcome to SoulFlow</h1>
        <p className="text-xl text-gray-600 mb-6">
          {user ? `Hello, ${user.email}! Connect with soulful events.` : "Connect with soulful events in your community."}
        </p>
        {user ? (
          <div className="space-y-4">
            <Button asChild className="w-full max-w-xs bg-purple-600 hover:bg-purple-700 text-white">
              <Link to="/submit-event">Submit a New Event</Link>
            </Button>
            <Button asChild variant="outline" className="w-full max-w-xs border-purple-600 text-purple-600 hover:bg-purple-50">
              <Link to="/events">Browse Events</Link>
            </Button>
            <Button onClick={() => supabase.auth.signOut()} variant="ghost" className="w-full max-w-xs text-gray-600 hover:text-gray-800">
              Sign Out
            </Button>
          </div>
        ) : (
          <Button asChild className="w-full max-w-xs bg-purple-600 hover:bg-purple-700 text-white">
            <Link to="/login">Login / Sign Up</Link>
          </Button>
        )}
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;