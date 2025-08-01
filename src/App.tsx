import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CalendarView from "./pages/Home"; // Renamed for clarity, this is the old Home.tsx
import Home from "./pages/EventsList"; // Renamed for clarity, this is the old Index.tsx
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
import EventEditPage from "./pages/EventEditPage"; // Renamed import
import About from "./pages/About";

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
              <Route path="/" element={<Home />} /> {/* New Home is EventsList */}
              <Route path="/calendar" element={<CalendarView />} /> {/* Calendar is now at /calendar */}
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
                path="/edit-event/:id"
                element={
                  <ProtectedRoute>
                    <EventEditPage /> {/* Updated component name */}
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