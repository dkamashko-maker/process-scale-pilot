import { useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { EventsProvider } from "@/contexts/EventsContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { SplashScreen } from "@/components/SplashScreen";
import OverviewPage from "./pages/OverviewPage";
import RunMonitorPage from "./pages/RunMonitorPage";
import RunsListPage from "./pages/RunsListPage";
import RunDetailPage from "./pages/RunDetailPage";
import EventLogPage from "./pages/EventLogPage";
import AdminPage from "./pages/AdminPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import DataStoragePage from "./pages/DataStoragePage";
import MetadataConstructorPage from "./pages/MetadataConstructorPage";
import AIPage from "./pages/AIPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AuthGuard() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <EventsProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route element={<AuthGuard />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<OverviewPage />} />
                  <Route path="/run/:runId" element={<RunMonitorPage />} />
                  <Route path="/experiments" element={<RunsListPage />} />
                  <Route path="/experiments/:runId" element={<RunDetailPage />} />
                  <Route path="/events" element={<EventLogPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/data-storage" element={<DataStoragePage />} />
                  <Route path="/metadata" element={<MetadataConstructorPage />} />
                  <Route path="/ai" element={<AIPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </EventsProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
