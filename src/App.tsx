import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AuthProvider } from "./contexts/AuthContext";
import { ChartProvider } from "./contexts/ChartContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import TransactionManagement from "./pages/TransactionManagement";
import ImportExtract from "./pages/ImportExtract";
import DashboardPage from "./pages/DashboardPage";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { UserProfile } from "./pages/UserProfile";
import CreditCards from "./pages/CreditCards";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ChartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout>
                    <Index />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Layout>
                    <DashboardPage />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/transactions" element={
                <ProtectedRoute>
                  <Layout>
                    <TransactionManagement />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/import" element={
                <ProtectedRoute>
                  <Layout>
                    <ImportExtract />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Layout>
                    <UserProfile />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/credit-cards" element={
                <ProtectedRoute>
                  <Layout>
                    <CreditCards />
                  </Layout>
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ChartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
