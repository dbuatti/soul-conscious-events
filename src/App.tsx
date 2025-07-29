import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SubmitEvent from "./pages/SubmitEvent";
import Contact from "./pages/Contact";
import AdminPanel from "./pages/AdminPanel"; // Updated import
import EventDetail from "./pages/EventDetail";
import MapPage from "./pages/MapPage";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import { SessionContextProvider } from "./components/SessionContextProvider";
import Layout from "./components/Layout";
import ScrollToTop from "./components/ScrollToTop";
import EditEvent from "./pages/EditEvent"; // New import

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
              <Route path="/" element={<Index />} />
              <Route path="/submit-event" element={<SubmitEvent />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/admin/panel" // Updated route path
                element={
                  <ProtectedRoute allowedEmail="daniele.buatti@gmail.com">
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/edit-event/:id"
                element={
                  <ProtectedRoute> {/* Protected for any logged-in user, component handles creator check */}
                    <EditEvent />
                  </ProtectedRoute>
                }
              />
              <Route path="/events/:id" element={<EventDetail />} />
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