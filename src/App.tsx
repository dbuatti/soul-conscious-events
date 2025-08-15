import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import EventsList from "./pages/EventsList";
import NotFound from "./pages/NotFound";
import SubmitEvent from "./pages/SubmitEvent";
import Contact from "./pages/Contact";
import AdminPanel from "./pages/AdminPanel";
import MapPage from "./pages/MapPage";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import { SessionContextProvider } from "./components/SessionContextProvider";
import Layout from "./components/Layout";
import ScrollToTop from "./components/ScrollToTop";
import EventEditPage from "./pages/EventEditPage";
import EventDetailPage from "./pages/EventDetailPage"; // Import the new EventDetailPage
import About from "./pages/About";
import DevSpace from "./pages/DevSpace";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <SessionContextProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<EventsList />} />
              <Route path="/events/:id" element={<EventDetailPage />} /> {/* New route for event details */}
              <Route path="/submit-event" element={<SubmitEvent />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/about" element={<About />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/admin/panel"
                element={
                  <ProtectedRoute allowedEmail="daniele.buatti@gmail.com">
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dev-space"
                element={
                  <ProtectedRoute allowedEmail="daniele.buatti@gmail.com">
                    <DevSpace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/edit-event/:id"
                element={
                  <ProtectedRoute>
                    <EventEditPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/map" element={<MapPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;