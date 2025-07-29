import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SubmitEvent from "./pages/SubmitEvent";
import Contact from "./pages/Contact";
import AdminContactSubmissions from "./pages/AdminContactSubmissions";
import { SessionContextProvider } from "./components/SessionContextProvider";
import Layout from "./components/Layout";
import ScrollToTop from "./components/ScrollToTop"; // Import the new ScrollToTop component

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop /> {/* Add ScrollToTop here */}
        <SessionContextProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/submit-event" element={<SubmitEvent />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/admin/submissions" element={<AdminContactSubmissions />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;