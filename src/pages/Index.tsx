import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button"; // Import Button
import { Link } from "react-router-dom"; // Import Link

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 via-blue-100 to-green-100 p-4">
      <div className="text-center bg-white p-8 rounded-lg shadow-xl border border-gray-200 max-w-2xl w-full">
        <h1 className="text-4xl font-bold mb-4 text-gray-800">Welcome to SoulFlow</h1>
        <p className="text-xl text-gray-600 mb-6">
          Connect with soulful events in your community.
        </p>
        <Link to="/submit-event">
          <Button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105">
            Add New Event
          </Button>
        </Link>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;