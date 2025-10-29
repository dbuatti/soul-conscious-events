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
import EventDetailPage from "./pages/EventDetailPage";
import About from "./pages/About";
import DevSpace from "./pages/DevSpace";
import CommunityGuidelines from "./pages/CommunityGuidelines";
import MyEvents from "./pages/MyEvents";
import MyBookmarks from "./pages/MyBookmarks";
// V2 Imports
import EventsListV2 from "./pages/v2/EventsListV2";
import LoginV2 from "./pages/v2/LoginV2";
import HeaderV2 from "./components/v2/HeaderV2"; // Import HeaderV2
import AccountSettings from "./pages/AccountSettings"; // Import new AccountSettings page
import Footer from "./components/Footer"; // Import Footer
import ScrollToTopButton from "./components/ScrollToTopButton"; // Import ScrollToTopButton

const queryClient = new QueryClient();

// New Layout for V2 to use HeaderV2
const LayoutV2: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col items-center bg-background">
      <HeaderV2 />
      <main className="flex-grow w-full px-2 flex flex-col items-center py-8">
        {children}
      </main>
      <Footer /> {/* Reusing existing Footer */}
      <ScrollToTopButton /> {/* Add the new button here */}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <SessionContextProvider>
          <Routes>
            {/* V2 Prototype Routes - now the main routes */}
            <Route path="/" element={<LayoutV2><EventsListV2 /></LayoutV2>} />
            <Route path="/login" element={<LayoutV2><LoginV2 /></LayoutV2>} />
            <Route path="/submit-event" element={<LayoutV2><SubmitEvent /></LayoutV2>} />
            <Route path="/about" element={<LayoutV2><About /></LayoutV2>} />
            <Route
              path="/my-events"
              element={
                <ProtectedRoute>
                  <LayoutV2><MyEvents /></LayoutV2>
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-bookmarks"
              element={
                <ProtectedRoute>
                  <LayoutV2><MyBookmarks /></LayoutV2>
                </ProtectedRoute>
              }
            />
            <Route
              path="/account-settings"
              element={
                <ProtectedRoute>
                  <LayoutV2><AccountSettings /></LayoutV2>
                </ProtectedRoute>
              }
            />
            {/* Event Detail and Edit pages for V2 */}
            <Route path="/events/:id" element={<LayoutV2><EventDetailPage /></LayoutV2>} />
            <Route
              path="/edit-event/:id"
              element={
                <ProtectedRoute>
                  <LayoutV2><EventEditPage /></LayoutV2>
                </ProtectedRoute>
              }
            />

            {/* Global pages now using LayoutV2 */}
            <Route path="/contact" element={<LayoutV2><Contact /></LayoutV2>} />
            <Route path="/community-guidelines" element={<LayoutV2><CommunityGuidelines /></LayoutV2>} />
            <Route
              path="/admin/panel" // Changed path to be under V2 layout
              element={
                <ProtectedRoute allowedEmail="daniele.buatti@gmail.com">
                  <LayoutV2><AdminPanel /></LayoutV2>
                </ProtectedRoute>
              }
            />

            {/* Original App Routes - now under /old */}
            <Route path="/old" element={<Layout><EventsList /></Layout>} />
            <Route path="/old/events/:id" element={<Layout><EventDetailPage /></Layout>} />
            <Route path="/old/login" element={<Layout><Login /></Layout>} />
            <Route
              path="/old/dev-space"
              element={
                <ProtectedRoute allowedEmail="daniele.buatti@gmail.com">
                  <Layout><DevSpace /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/old/edit-event/:id"
              element={
                <ProtectedRoute>
                  <Layout><EventEditPage /></Layout>
                </ProtectedRoute>
              }
            />
            <Route path="/old/map" element={<Layout><MapPage /></Layout>} />

            <Route path="*" element={<LayoutV2><NotFound /></LayoutV2>} /> {/* NotFound also uses V2 layout */}
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;