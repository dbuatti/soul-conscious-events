import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 via-blue-100 to-green-100 p-4">
      <div className="text-center bg-white p-8 rounded-lg shadow-xl border border-gray-200 max-w-2xl w-full">
        <h1 className="text-4xl font-bold mb-4 text-gray-800">Welcome to SoulFlow</h1>
        <p className="text-xl text-gray-600 mb-6">
          Connect with soulful events in your community.
        </p>
        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <Link to="/submit-event">
            <Button className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105">
              Add New Event
            </Button>
          </Link>
          <Link to="/events">
            <Button variant="outline" className="w-full sm:w-auto border-purple-600 text-purple-600 hover:bg-purple-50 hover:text-purple-700 font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105">
              Browse Events
            </Button>
          </Link>
        </div>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;