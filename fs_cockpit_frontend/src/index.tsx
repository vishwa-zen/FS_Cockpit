import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { msalConfig } from "./config/msalConfig";
import { TicketsProvider } from "./context";
import { ProtectedRoute } from "./components/auth";

// Lazy load route components for code splitting
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((module) => ({
    default: module.LoginPage,
  }))
);
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  }))
);
const SearchPage = lazy(() =>
  import("./pages/SearchPage").then((module) => ({
    default: module.SearchPage,
  }))
);
const TicketDetailsPage = lazy(() =>
  import("./pages/TicketDetailsPage").then((module) => ({
    default: module.TicketDetailsPage,
  }))
);

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen w-screen bg-[#F8FAFCFF]">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3B82F6]"></div>
      <p className="text-[#61738D] text-sm">Loading...</p>
    </div>
  </div>
);

const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL and render app (popup mode only - no redirect handling)
msalInstance
  .initialize()
  .then(() => {
    const rootElement = document.getElementById("app");
    if (!rootElement) {
      throw new Error("Root element not found");
    }

    createRoot(rootElement).render(
      <StrictMode>
        <MsalProvider instance={msalInstance}>
          <TicketsProvider>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route
                    path="/home"
                    element={
                      <ProtectedRoute>
                        <DashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/home/:id"
                    element={
                      <ProtectedRoute>
                        <DashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/search"
                    element={
                      <ProtectedRoute>
                        <SearchPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/issue/:id"
                    element={
                      <ProtectedRoute>
                        <TicketDetailsPage />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TicketsProvider>
        </MsalProvider>
      </StrictMode>
    );
  })
  .catch((error) => {
    console.error("Failed to initialize MSAL:", error);
  });
