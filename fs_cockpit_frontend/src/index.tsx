/**
 * @fileoverview Application Entry Point
 *
 * Main entry point for the FS Cockpit React application.
 * Handles MSAL initialization, routing configuration, and app rendering.
 *
 * Key Features:
 * - Azure AD B2C authentication via MSAL
 * - Code splitting with lazy-loaded routes
 * - Protected route authentication guards
 * - Global state management via TicketsProvider
 * - Suspense-based loading states
 *
 * @module index
 * @requires @azure/msal-react - Microsoft Authentication Library for React
 * @requires @azure/msal-browser - MSAL browser client
 * @requires react - React library
 * @requires react-dom/client - React DOM rendering
 * @requires react-router-dom - Client-side routing
 */

import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { msalConfig } from "./config/msalConfig";
import { TicketsProvider } from "./context";
import { ProtectedRoute } from "./components/auth";

/**
 * Lazy-loaded Login Page Component
 * Displays Azure AD B2C login interface
 * @lazy
 */
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((module) => ({
    default: module.LoginPage,
  }))
);

/**
 * Lazy-loaded Dashboard Page Component
 * Main ticket management interface with list/detail views
 * @lazy
 */
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  }))
);

/**
 * Lazy-loaded Search Page Component
 * Advanced ticket search interface with filters
 * @lazy
 */
const SearchPage = lazy(() =>
  import("./pages/SearchPage").then((module) => ({
    default: module.SearchPage,
  }))
);

/**
 * Lazy-loaded Ticket Details Page Component
 * Full-screen ticket details view with diagnostics
 * @lazy
 */
const TicketDetailsPage = lazy(() =>
  import("./pages/TicketDetailsPage").then((module) => ({
    default: module.TicketDetailsPage,
  }))
);

/**
 * Loading Fallback Component
 *
 * Displays animated spinner while lazy-loaded routes are being fetched.
 * Used as Suspense fallback during code-split chunk loading.
 *
 * @component
 * @returns {JSX.Element} Centered loading spinner with text
 */
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen w-screen bg-[#F8FAFCFF]">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3B82F6] mb-4"></div>
      <p className="[font-family:'Arial-Regular',Helvetica] text-[#61738D] text-sm">
        Loading...
      </p>
    </div>
  </div>
);

/**
 * MSAL Public Client Application Instance
 *
 * Singleton instance of MSAL PublicClientApplication configured for
 * Azure AD B2C authentication. Handles token acquisition, caching,
 * and authentication state management.
 *
 * @constant {PublicClientApplication}
 */
const msalInstance = new PublicClientApplication(msalConfig);

/**
 * Application Initialization
 *
 * Initializes MSAL authentication library and renders the React application.
 * Uses popup-based authentication flow (no redirect handling).
 *
 * Initialization Flow:
 * 1. Initialize MSAL PublicClientApplication
 * 2. Locate DOM root element
 * 3. Render React app with providers:
 *    - StrictMode for development checks
 *    - MsalProvider for authentication context
 *    - TicketsProvider for global ticket state
 *    - BrowserRouter for client-side routing
 *    - Suspense for lazy-loaded route components
 *
 * @async
 * @throws {Error} If root element 'app' is not found in DOM
 */
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
