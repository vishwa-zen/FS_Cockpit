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

// Initialize MSAL and render app
msalInstance
  .initialize()
  .then(() => {
    // Handle redirect promise to process any redirect responses
    return msalInstance.handleRedirectPromise();
  })
  .then((response) => {
    // If we just completed a redirect login, handle the response
    if (response) {
      console.log("Authentication successful, processing response");
      console.log("[Auth] Response:", {
        account: response.account,
        idTokenClaims: response.idTokenClaims,
        accessToken: response.accessToken ? "present" : "missing",
      });

      // Store token and account if present
      if (response.accessToken) {
        localStorage.setItem("msal.token", response.accessToken);
      }

      if (response.account) {
        console.log("[Auth] Account:", response.account);
        console.log("[Auth] ID Token Claims:", response.idTokenClaims);

        // Store the full account data including idTokenClaims
        const accountWithClaims = {
          ...response.account,
          idTokenClaims: response.idTokenClaims,
        };

        localStorage.setItem("msal.account", JSON.stringify(accountWithClaims));

        // Set the active account
        msalInstance.setActiveAccount(response.account);

        console.log("[Auth] Stored account with claims:", accountWithClaims);
      }
    }

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
