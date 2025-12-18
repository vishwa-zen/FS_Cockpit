/**
 * @fileoverview Authentication Hook
 *
 * Custom React hook for managing user authentication state across the application.
 * Integrates with MSAL for Azure AD B2C authentication and supports demo mode fallback.
 *
 * Features:
 * - Automatic authentication state synchronization
 * - MSAL event subscription for token updates
 * - Demo mode support for offline testing
 * - localStorage fallback for session persistence
 * - Normalized user data extraction from ID token claims
 *
 * @module hooks/useAuth
 * @requires @azure/msal-react - MSAL React hooks
 * @requires @azure/msal-browser - MSAL browser events
 */

import { useMsal } from "@azure/msal-react";
import { EventType } from "@azure/msal-browser";
import { useEffect, useState } from "react";

/**
 * Authentication Hook
 *
 * Manages authentication state and user information for the application.
 * Automatically syncs with MSAL authentication events and handles demo mode.
 *
 * @hook
 * @returns {Object} Authentication state and methods
 * @returns {boolean} returns.isAuthenticated - Whether user is authenticated
 * @returns {Object|null} returns.user - Normalized user object with email, name, username
 * @returns {Function} returns.logout - Async function to log out user
 *
 * @example
 * const { isAuthenticated, user, logout } = useAuth();
 *
 * if (isAuthenticated) {
 *   console.log('User email:', user.email);
 *   // Render authenticated content
 * }
 *
 * @example
 * // Logout handler
 * const handleLogout = async () => {
 *   await logout();
 *   navigate('/login');
 * };
 */
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

    /**
     * Extract and Normalize User Data from MSAL Account
     *
     * Internal helper function that extracts user information from MSAL account object
     * and normalizes various ID token claim formats into a consistent user object.
     *
     * @inner
     * @param {any} msalAccountLocal - MSAL account object with idTokenClaims
     * @returns {void} Updates component state via setUser and setIsAuthenticated
     */
    const setUserFromMsalAccount = (msalAccountLocal: any) => {
      if (!msalAccountLocal) return;
      const accountLocal = msalAccountLocal as any;
      const idTokenClaimsLocal = accountLocal.idTokenClaims || {};

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

      setIsAuthenticated(true);
      setUser(normalizedUserLocal);
    };

    // Prefer an explicit active account if available, otherwise accounts
    const active = instance?.getActiveAccount?.();
    const msalAccount =
      active || (accounts && accounts.length > 0 ? accounts[0] : null);

    // Normalize MSAL account
    if (msalAccount) {
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

  /**
   * Logout User
   *
   * Logs out the current user and clears all authentication state.
   * Handles both demo mode and MSAL authentication.
   *
   * Flow:
   * 1. Check if in demo mode
   * 2. Clear localStorage and sessionStorage
   * 3. Reset authentication state
   * 4. Redirect to login page
   *
   * @async
   * @function logout
   * @returns {Promise<void>}
   * @throws {Error} Catches and handles all errors gracefully with forced logout
   *
   * @example
   * await logout();
   * // User is logged out and redirected to /login
   */
  const logout = async () => {
    try {
      const isDemoMode = localStorage.getItem("demo.mode") === "true";

      if (isDemoMode) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "/login";
        return;
      }

      // Clear all storage first
      localStorage.clear();
      sessionStorage.clear();

      // Set auth state to false
      setIsAuthenticated(false);
      setUser(null);

      // Skip MSAL popup logout - just redirect immediately
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
