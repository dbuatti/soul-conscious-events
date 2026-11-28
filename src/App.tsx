import { useEffect, lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { SessionContextProvider, useSession } from "@/components/SessionContextProvider";
import { supabase } from "@/integrations/supabase/client";
import ScrollToTop from "./components/ScrollToTop";
import HeaderV2 from "./components/v2/HeaderV2";
import MobileTabBar from "./components/v2/MobileTabBar";
import InstallPrompt from "./components/InstallPrompt";
import Footer from "./components/Footer";
import ScrollToTopButton from "./components/ScrollToTopButton";
import ScrollProgress from "./components/ScrollProgress";
import { CITY_GUIDES } from "@/lib/cities";
import { getVisitActionType } from "@/lib/growth";

const NotFound = lazy(() => import("./pages/NotFound"));
const SubmitEvent = lazy(() => import("./pages/SubmitEvent"));
const Contact = lazy(() => import("./pages/Contact"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const AdminBusiness = lazy(() => import("./pages/admin/BusinessView"));
const EventEditPage = lazy(() => import("./pages/EventEditPage"));
const EventDetailPage = lazy(() => import("./pages/EventDetailPage"));
const About = lazy(() => import("./pages/About"));
const DevSpace = lazy(() => import("./pages/DevSpace"));
const CommunityGuidelines = lazy(() => import("./pages/CommunityGuidelines"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const MyEvents = lazy(() => import("./pages/MyEvents"));
const MyBookmarks = lazy(() => import("./pages/MyBookmarks"));
// /dashboard was folded into the Account hub; keep the old URL working.
const DashboardRedirect = () => <Navigate to="/account-settings" replace />;
const EventsListV2 = lazy(() => import("./pages/v2/EventsListV2"));
const LoginV2 = lazy(() => import("./pages/v2/LoginV2"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const LinkInBio = lazy(() => import("./pages/LinkInBio"));
const CityGuide = lazy(() => import("./pages/CityGuide"));
const CitiesPage = lazy(() => import("./pages/CitiesPage"));
const Subscribe = lazy(() => import("./pages/Subscribe"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Keep the old booking/anchor URLs working after the pages were consolidated.
const BusinessRedirect = () => {
  const location = useLocation();
  return (
    <Navigate
      to={{ pathname: '/admin/business', search: location.search, hash: location.hash }}
      replace
    />
  );
};

// Persistent Layout for V2
const LayoutV2 = () => {
  const location = useLocation();
  const { user } = useSession();

  useEffect(() => {
    (async () => {
      const { error } = await supabase.from('page_visit_logs').insert([{
        user_id: user?.id || null,
        page_path: location.pathname,
        action_type: getVisitActionType(location.search),
      }]);
      if (error) console.error('Error logging page view:', error);
    })();
  }, [location.pathname, location.search, user?.id]);

  return (
    <div className="min-h-screen flex flex-col items-center bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to content
      </a>
      <ScrollProgress />
      <HeaderV2 />
      <main id="main-content" tabIndex={-1} className="flex-grow w-full px-2 flex flex-col items-center pt-4 sm:pt-6 pb-24 md:pb-8 outline-none">
        <Outlet />
      </main>
      <Footer />
      <ScrollToTopButton />
      <MobileTabBar />
      <InstallPrompt />
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
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          }>
            <Routes>
              {/* Standalone link-in-bio page — the destination of the Instagram bio link. */}
              <Route path="/link" element={<LinkInBio />} />
              <Route path="/subscribe" element={<Subscribe />} />

              {/* V2 Prototype Routes */}
              <Route element={<LayoutV2 />}>
                <Route path="/" element={<EventsListV2 signupCity="melbourne" signupSource="homepage" />} />
                <Route path="/cities" element={<CitiesPage />} />
                {CITY_GUIDES.map((city) => (
                  <Route key={city.slug} path={`/${city.slug}`} element={<CityGuide />} />
                ))}
                <Route path="/login" element={<LoginV2 />} />
                {/* The events insert policy is auth.uid() = user_id, so a guest
                    can never save a submission. Gate the form up front rather
                    than let them type it all in and be refused on submit. */}
                <Route path="/submit-event" element={<ProtectedRoute message="Sign in to submit your event — it's free, and you'll be taken straight back to your form."><SubmitEvent /></ProtectedRoute>} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/community-guidelines" element={<CommunityGuidelines />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/events/:id" element={<EventDetailPage />} />
                <Route path="/map" element={<Navigate to="/?view=map" replace />} />
                
                {/* Protected V2 Routes */}
                <Route element={<ProtectedRoute><Outlet /></ProtectedRoute>}>
                  <Route path="/my-events" element={<MyEvents />} />
                  <Route path="/my-bookmarks" element={<MyBookmarks />} />
                  <Route path="/account-settings" element={<AccountSettings />} />
                  <Route path="/dashboard" element={<DashboardRedirect />} />
                  <Route path="/edit-event/:id" element={<EventEditPage />} />
                  <Route path="/duplicate-event/:id" element={<EventEditPage />} />
                </Route>

                {/* Admin V2 Routes */}
                <Route element={<ProtectedRoute requireAdmin><Outlet /></ProtectedRoute>}>
                  <Route path="/admin/panel" element={<AdminPanel />} />
                  <Route path="/admin/business" element={<AdminBusiness />} />
                  <Route path="/admin/how-it-works" element={<BusinessRedirect />} />
                  <Route path="/dev-space" element={<DevSpace />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Route>

            </Routes>
          </Suspense>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;