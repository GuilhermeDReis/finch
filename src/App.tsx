import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Layout } from "./components/Layout";
import { AuthProvider } from "./contexts/AuthContext";
import { ChartProvider } from "./contexts/ChartContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { FullPageLoader } from "./components/LoadingSpinner";

// Lazy load pages for code splitting
const Home = lazy(() => import("./pages/Home"));
const TransactionManagement = lazy(() => import("./pages/TransactionManagement"));
const ImportExtract = lazy(() => import("./pages/ImportExtract"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const UserProfile = lazy(() => import("./pages/UserProfile").then(module => ({ default: module.UserProfile })));
const CreditCards = lazy(() => import("./pages/CreditCards"));
const CreditCardBill = lazy(() => import("./pages/CreditCardBill"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <ChartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<FullPageLoader />}>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Layout>
                        <Home />
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
                  <Route path="/credit-cards/:cardId/bill" element={
                    <ProtectedRoute>
                      <Layout>
                        <CreditCardBill />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </ChartProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
