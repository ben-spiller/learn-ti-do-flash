import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import SettingsView from "./pages/Settings";
import PracticeView from "./pages/Practice";
import PracticeHistory from "./pages/History";
import SolfegeKeyboardPage from "./pages/SolfegeKeyboardPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Derive router basename from Vite's BASE_URL when it's an absolute path
// (e.g. '/learn-ti-do-flash/'). If BASE_URL is relative (like './') or '/'
// we leave basename undefined so BrowserRouter behaves normally in dev.
const App = () => {
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <Routes>
          <Route path="/" element={<SettingsView />} />
          <Route path="/practice" element={<PracticeView />} />
          <Route path="/history" element={<PracticeHistory />} />
          <Route path="/keyboard" element={<SolfegeKeyboardPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
