import { useEffect, lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { SessionContextProvider, useSession } from "@/components/SessionContextProvider";
import { supabase } from "@/integrations/supabase/client";
import Layout from "./components/Layout";
import ScrollToTop from "./components/ScrollToTop";
import HeaderV2 from "./components/v2/HeaderV2";
import Footer from "./components/Footer";
import ScrollToTopButton from "./components/ScrollToTopButton";
import ScrollProgress from "./components/ScrollProgress";

const EventsList = lazy(() => import("./pages/EventsList"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SubmitEvent = lazy(() => import("./pages/SubmitEvent"));
const Contact = lazy(() => import("./pages/Contact"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const MapPage = lazy(() => import("./pages/MapPage"));
const Login = lazy(() => import("./pages/Login"));
const EventEditPage = lazy(() => import("./pages/EventEditPage"));
const EventDetailPage = lazy(() => import("./pages/EventDetailPage"));
const About = lazy(() => import("./pages/About"));
const DevSpace = lazy(() => import("./pages/DevSpace"));
const CommunityGuidelines = lazy(() => import("./pages/CommunityGuidelines"));
const MyEvents = lazy(() => import("./pages/MyEvents"));
const MyBookmarks = lazy(() => import("./pages/MyBookmarks"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const EventsListV2 = lazy(() => import("./pages/v2/EventsListV2"));
const LoginV2 = lazy(() => import("./pages/v2/LoginV2"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));

const queryClient = new QueryClient();

// Persistent Layout for V2
const LayoutV2 = () => {
  const location = useLocation();
  const { user } = useSession();

  useEffect(() => {
    (async () => {
      const { error } = await supabase.from('page_visit_logs').insert([{
        user_id: user?.id || null,
        page_path: location.pathname,
        action_type: 'visit',
      }]);
      if (error) console.error('Error logging page view:', error);
    })();
  }, [location.pathname, user?.id]);

  return (
    <div className="min-h-screen flex flex-col items-center bg-background">
      <ScrollProgress />
      <HeaderV2 />
      <main className="flex-grow w-full px-2 flex flex-col items-center py-8">
        <Outlet />
      </main>
      <Footer />
      <ScrollToTopButton />
    </div>
  );
};

// Persistent Layout for Old pages
const LayoutOld = () => {
  return (
    <Layout>
      <Outlet />
    </Layout>
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
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          }>
            <Routes>
              {/* V2 Prototype Routes */}
              <Route element={<LayoutV2 />}>
                <Route path="/" element={<EventsListV2 />} />
                <Route path="/login" element={<LoginV2 />} />
                <Route path="/submit-event" element={<SubmitEvent />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/community-guidelines" element={<CommunityGuidelines />} />
                <Route path="/events/:id" element={<EventDetailPage />} />
                <Route path="/map" element={<MapPage />} />
                
                {/* Protected V2 Routes */}
                <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
                  <Route path="/my-events" element={<MyEvents />} />
                  <Route path="/my-bookmarks" element={<MyBookmarks />} />
                  <Route path="/account-settings" element={<AccountSettings />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/edit-event/:id" element={<EventEditPage />} />
                  <Route path="/duplicate-event/:id" element={<EventEditPage />} />
                </Route>

                {/* Admin V2 Routes */}
                <Route element={<ProtectedRoute requireAdmin><Outlet /></ProtectedRoute>}>
                  <Route path="/admin/panel" element={<AdminPanel />} />
                  <Route path="/dev-space" element={<DevSpace />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Route>

              {/* Original App Routes - under /old */}
              <Route path="/old" element={<LayoutOld />}>
                <Route index element={<EventsList />} />
                <Route path="events/:id" element={<EventDetailPage />} />
                <Route path="login" element={<Login />} />
                <Route path="map" element={<MapPage />} />
                
                <Route element={<ProtectedRoute requireAdmin><Outlet /></ProtectedRoute>}>
                  <Route path="dev-space" element={<DevSpace />} />
                </Route>
                
                <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
                  <Route path="edit-event/:id" element={<EventEditPage />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;