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

const queryClient = new QueryClient();

// New Layout for V2 to use HeaderV2
const LayoutV2: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col items-center bg-background">
      <HeaderV2 />
      <main className="flex-grow w-full px-2 flex flex-col items-center py-8">
        {children}
      </main>
      {/* You can reuse the existing Footer or create a new one for V2 */}
      {/* <Footer /> */}
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
            {/* Original App Routes */}
            <Route path="/" element={<Layout><EventsList /></Layout>} />
            <Route path="/events/:id" element={<Layout><EventDetailPage /></Layout>} />
            <Route path="/submit-event" element={<Layout><SubmitEvent /></Layout>} />
            <Route path="/contact" element={<Layout><Contact /></Layout>} />
            <Route path="/about" element={<Layout><About /></Layout>} />
            <Route path="/community-guidelines" element={<Layout><CommunityGuidelines /></Layout>} />
            <Route path="/login" element={<Layout><Login /></Layout>} />
            <Route
              path="/my-events"
              element={
                <ProtectedRoute>
                  <Layout><MyEvents /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-bookmarks"
              element={
                <ProtectedRoute>
                  <Layout><MyBookmarks /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/panel"
              element={
                <ProtectedRoute allowedEmail="daniele.buatti@gmail.com">
                  <Layout><AdminPanel /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dev-space"
              element={
                <ProtectedRoute allowedEmail="daniele.buatti@gmail.com">
                  <Layout><DevSpace /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit-event/:id"
              element={
                <ProtectedRoute>
                  <Layout><EventEditPage /></Layout>
                </ProtectedRoute>
              }
            />
            <Route path="/map" element={<Layout><MapPage /></Layout>} />

            {/* V2 Prototype Routes */}
            <Route path="/v2" element={<LayoutV2><EventsListV2 /></LayoutV2>} />
            <Route path="/v2/login" element={<LayoutV2><LoginV2 /></LayoutV2>} />
            {/* Add other V2 specific routes here if needed */}

            <Route path="*" element={<Layout><NotFound /></Layout>} />
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;