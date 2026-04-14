import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import EventsList from "./pages/EventsList";
import NotFound from "./pages/NotFound";
import SubmitEvent from "./pages/SubmitEvent";
import Contact from "./pages/Contact";
import AdminPanel from "./pages/AdminPanel";
import MapPage from "./pages/MapPage";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import { SessionContextProvider } from "@/components/SessionContextProvider";
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
import HeaderV2 from "./components/v2/HeaderV2";
import AccountSettings from "./pages/AccountSettings";
import Footer from "./components/Footer";
import ScrollToTopButton from "./components/ScrollToTopButton";
import ScrollProgress from "./components/ScrollProgress";

const queryClient = new QueryClient();

// Persistent Layout for V2
const LayoutV2 = () => {
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
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;