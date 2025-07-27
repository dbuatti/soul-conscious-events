import { MadeWithDyad } from "@/components/made-with-dyad";
// Removed useSession import as it's no longer needed for conditional rendering
// Removed Button and Link imports as they are no longer used for auth actions
// Removed supabase import as sign-out is no longer an option

const Index = () => {
  // Removed isLoading and user state as login is temporarily disabled

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 via-blue-100 to-green-100 p-4">
      <div className="text-center bg-white p-8 rounded-lg shadow-xl border border-gray-200 max-w-2xl w-full">
        <h1 className="text-4xl font-bold mb-4 text-gray-800">Welcome to SoulFlow</h1>
        <p className="text-xl text-gray-600 mb-6">
          Connect with soulful events in your community.
        </p>
        {/* Removed conditional rendering for user and login/logout buttons */}
        {/* Removed event submission/browsing links */}
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;