import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { msalConfig } from "./config/msalConfig";
import { TicketsProvider } from "./screens/Frame/sections/shared/TicketsContext";
import { SignInSection } from "./screens/Frame/sections/SignInSection";
import { HomeSearchSection } from "./screens/Frame/sections/HomeSearchSection";
import { IssueSearchSection } from "./screens/Frame/sections/IssueSearchSection";
import { IssueDetailsSection } from "./screens/Frame/sections/IssueDetailsSection";
import { ProtectedRoute } from "./components/ProtectedRoute";

const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL and render app (popup mode only - no redirect handling)
msalInstance
  .initialize()
  .then(() => {
    console.log("[Auth] MSAL initialized in popup-only mode");

    const rootElement = document.getElementById("app");
    if (!rootElement) {
      throw new Error("Root element not found");
    }

    createRoot(rootElement).render(
      <StrictMode>
        <MsalProvider instance={msalInstance}>
          <TicketsProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<SignInSection />} />
                <Route
                  path="/home"
                  element={
                    <ProtectedRoute>
                      <HomeSearchSection />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/home/:id"
                  element={
                    <ProtectedRoute>
                      <HomeSearchSection />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/search"
                  element={
                    <ProtectedRoute>
                      <IssueSearchSection />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/issue/:id"
                  element={
                    <ProtectedRoute>
                      <IssueDetailsSection />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </BrowserRouter>
          </TicketsProvider>
        </MsalProvider>
      </StrictMode>
    );
  })
  .catch((error) => {
    console.error("Failed to initialize MSAL:", error);
  });
