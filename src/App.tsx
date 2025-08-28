import { Toaster } from "@/components/ui/sonner";
import { Layout } from "./components/Layout";
import { SessionContextProvider } from "./components/SessionContextProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { Index } from "./pages/Index";
import { About } from "./pages/About";
import { Contact } from "./pages/Contact";
import EventsList from "./pages/EventsList";
import EventForm from "./pages/EventForm";
import EventEdit from "./pages/EventEdit";
import AdminPanel from "./pages/AdminPanel";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import EventDetails from "./pages/EventDetails";
import NotFound from "./pages/NotFound"; // Import the NotFound component

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionContextProvider>
        <TooltipProvider>
          <Toaster />
          <Router>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Index />} />
                <Route path="about" element={<About />} />
                <Route path="contact" element={<Contact />} />
                <Route path="events" element={<EventsList />} />
                <Route path="submit-event" element={<EventForm />} />
                <Route path="edit-event/:id" element={<EventEdit />} />
                <Route path="admin" element={<AdminPanel />} />
                <Route path="login" element={<Login />} />
                <Route path="profile" element={<Profile />} />
                <Route path="events/:id" element={<EventDetails />} />
                <Route path="*" element={<NotFound />} /> {/* Catch-all route for 404 */}
              </Route>
            </Routes>
          </Router>
        </TooltipProvider>
      </SessionContextProvider>
    </QueryClientProvider>
  );
}

export default App;