import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SettingsView from "./pages/Settings";
import PracticeView from "./pages/Practice";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Derive router basename from Vite's BASE_URL when it's an absolute path
// (e.g. '/learn-ti-do-flash/'). If BASE_URL is relative (like './') or '/'
// we leave basename undefined so BrowserRouter behaves normally in dev.
const App = () => {
  const base = import.meta.env.BASE_URL as string;
  // If BASE_URL is an absolute path like '/repo/', use that (trim trailing slash).
  // If it's './' (relative), try to infer the repo prefix from the current
  // location (e.g. '/<repo>/...') so routes still match when deployed under a
  // project site. If we can't infer, leave basename undefined.
  let basename: string | undefined;
  if (base && base.startsWith('/') && base !== '/') {
    basename = base.replace(/\/$/, '');
  } else if (base === './') {
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      basename = `/${parts[0]}`;
    } else {
      basename = undefined;
    }
  } else {
    basename = undefined;
  }

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={basename}>
        <Routes>
          <Route path="/" element={<SettingsView />} />
          <Route path="/practice" element={<PracticeView />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
