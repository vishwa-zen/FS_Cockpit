import { useMsal } from "@azure/msal-react";
import { EventType } from "@azure/msal-browser";
import { useEffect, useState } from "react";

export const useAuth = () => {
  const { instance, accounts } = useMsal();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check for demo mode first
    const isDemoMode = localStorage.getItem("demo.mode") === "true";
    const storedAccount = localStorage.getItem("msal.account");

    if (isDemoMode && storedAccount) {
      try {
        const demoUser = JSON.parse(storedAccount);
        setIsAuthenticated(true);
        setUser(demoUser);
        return;
      } catch (e) {
        console.error("Failed to parse demo user", e);
      }
    }

    const setUserFromMsalAccount = (msalAccountLocal: any) => {
      if (!msalAccountLocal) return;
      const accountLocal = msalAccountLocal as any;
      const idTokenClaimsLocal = accountLocal.idTokenClaims || {};

      console.log("[useAuth] Setting user from MSAL account");
      console.log("[useAuth] Account object:", accountLocal);
      console.log("[useAuth] ID Token Claims:", idTokenClaimsLocal);

      const normalizedUserLocal = {
        ...accountLocal,
        username:
          accountLocal.username ||
          idTokenClaimsLocal.email ||
          idTokenClaimsLocal.upn ||
          idTokenClaimsLocal.preferred_username ||
          idTokenClaimsLocal.mail ||
          (Array.isArray(idTokenClaimsLocal.emails) &&
            idTokenClaimsLocal.emails[0]) ||
          null,
        name:
          accountLocal.name ||
          idTokenClaimsLocal.name ||
          idTokenClaimsLocal.given_name ||
          idTokenClaimsLocal.family_name ||
          null,
        email:
          idTokenClaimsLocal.email ||
          idTokenClaimsLocal.mail ||
          (Array.isArray(idTokenClaimsLocal.emails) &&
            idTokenClaimsLocal.emails[0]) ||
          accountLocal.username ||
          idTokenClaimsLocal.preferred_username ||
          null,
      } as any;

      console.log("[useAuth] Normalized user:", normalizedUserLocal);
      console.log("[useAuth] User email:", normalizedUserLocal.email);
      console.log("[useAuth] User name:", normalizedUserLocal.name);

      setIsAuthenticated(true);
      setUser(normalizedUserLocal);
    };

    // Prefer an explicit active account if available, otherwise accounts
    const active = instance?.getActiveAccount?.();
    const msalAccount =
      active || (accounts && accounts.length > 0 ? accounts[0] : null);

    // Log in dev and normalize
    if (msalAccount) {
      if (
        typeof window !== "undefined" &&
        (import.meta as any).env?.MODE !== "production"
      ) {
        // eslint-disable-next-line no-console
        console.debug("[useAuth] msalAccount:", msalAccount);
        // eslint-disable-next-line no-console
        console.debug(
          "[useAuth] idTokenClaims:",
          msalAccount.idTokenClaims || {}
        );
      }
      setUserFromMsalAccount(msalAccount);
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }

    // Fallback: check localStorage if MSAL doesn't expose accounts (e.g., timing issues)
    if (!msalAccount) {
      const stored = localStorage.getItem("msal.account");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const fallbackNormalized = {
            ...parsed,
            username:
              parsed.username ||
              parsed.email ||
              parsed.preferred_username ||
              null,
            name: parsed.name || parsed.given_name || null,
            email:
              parsed.email ||
              parsed.preferred_username ||
              parsed.username ||
              null,
          } as any;
          setIsAuthenticated(true);
          setUser(fallbackNormalized);
        } catch (e) {
          // ignore parse error
        }
      }
    }

    // Register MSAL event callback to update user on login success and token events
    const callbackId = instance?.addEventCallback((message: any) => {
      if (
        message.eventType === EventType.LOGIN_SUCCESS ||
        message.eventType === EventType.ACQUIRE_TOKEN_SUCCESS
      ) {
        const localActive = instance.getActiveAccount?.();
        if (localActive) {
          setUserFromMsalAccount(localActive);
        }
      }
    });

    return () => {
      try {
        if (callbackId && instance) {
          instance.removeEventCallback(callbackId);
        }
      } catch (e) {
        // ignore
      }
    };
  }, [accounts, instance]);

  const logout = async () => {
    console.log("[useAuth] Logout initiated");

    try {
      const isDemoMode = localStorage.getItem("demo.mode") === "true";

      if (isDemoMode) {
        console.log("[useAuth] Demo mode logout - clearing storage");
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/login";
        return;
      }

      console.log("[useAuth] MSAL logout - clearing storage and redirecting");

      // Clear all storage first
      localStorage.clear();
      sessionStorage.clear();

      // Set auth state to false
      setIsAuthenticated(false);
      setUser(null);

      // Skip MSAL popup logout - just redirect immediately
      console.log("[useAuth] Redirecting to login...");
      window.location.href = "/login";
    } catch (error) {
      console.error("[useAuth] Logout failed with error:", error);
      // Force logout even if anything fails
      localStorage.clear();
      sessionStorage.clear();
      setIsAuthenticated(false);
      setUser(null);
      window.location.href = "/login";
    }
  };

  return {
    isAuthenticated,
    user,
    logout,
  };
};
