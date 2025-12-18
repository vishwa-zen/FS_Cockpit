/**
 * @fileoverview MSAL Authentication Configuration
 *
 * Configuration for Microsoft Authentication Library (MSAL) with Azure AD B2C.
 * Defines authentication settings, cache policies, and token request scopes.
 *
 * Authentication Flow: Popup-based (not redirect)
 * Identity Provider: Azure AD B2C
 * Token Storage: sessionStorage (auto-cleared on tab close)
 *
 * @module config/msalConfig
 * @requires @azure/msal-browser - MSAL browser library
 */

import { Configuration, LogLevel } from "@azure/msal-browser";

/**
 * MSAL Configuration Object
 *
 * Complete configuration for MSAL PublicClientApplication instance.
 * Configures Azure AD B2C authentication, caching, and logging.
 *
 * @constant {Configuration}
 * @property {Object} auth - Authentication configuration
 * @property {string} auth.clientId - Azure AD B2C application client ID
 * @property {string} auth.authority - Azure AD B2C tenant authority URL
 * @property {string} auth.redirectUri - OAuth redirect URI (dynamic based on environment)
 * @property {string} auth.postLogoutRedirectUri - Post-logout redirect URI
 * @property {string[]} auth.knownAuthorities - Trusted B2C login domains
 * @property {boolean} auth.navigateToLoginRequestUrl - Prevents auto-redirect after auth
 *
 * @property {Object} cache - Token caching configuration
 * @property {string} cache.cacheLocation - sessionStorage (cleared on tab close)
 * @property {boolean} cache.storeAuthStateInCookie - Fallback for IE11/Edge legacy
 *
 * @property {Object} system - System and logging configuration
 * @property {boolean} system.asyncPopups - Enables immediate popup (prevents blocking)
 * @property {Object} system.loggerOptions - MSAL logging configuration
 */
export const msalConfig: Configuration = {
  auth: {
    clientId: "64db8b2f-22ad-4ded-86b9-c91a43623f78",
    authority:
      "https://zenpoc.b2clogin.com/zenpoc.onmicrosoft.com/B2C_1_NTT_SIGNUP_SIGNIN",
    redirectUri:
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000",
    postLogoutRedirectUri:
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000",
    knownAuthorities: ["zenpoc.b2clogin.com"],
    navigateToLoginRequestUrl: false, // Critical: prevents redirect to login page after auth
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: true,
  },
  system: {
    allowNativeBroker: false,
    windowHashTimeout: 60000,
    iframeHashTimeout: 6000,
    loadFrameTimeout: 0,
    asyncPopups: true, // CRITICAL: Set to true to prevent popup blocking - opens popup immediately on user click
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
          default:
            return;
        }
      },
      logLevel: LogLevel.Info,
    },
  },
};

/**
 * Login Request Scopes
 *
 * Defines the OAuth 2.0 scopes requested during user authentication.
 * These scopes determine what user information is accessible.
 *
 * @constant {Object}
 * @property {string[]} scopes - Requested OAuth scopes
 *   - openid: User identifier
 *   - profile: Basic profile information (name, etc.)
 *   - email: User email address
 * @property {string} prompt - Forces account selection UI even if user is signed in
 */
export const loginRequest = {
  scopes: ["openid", "profile", "email"],
  prompt: "select_account",
};

/**
 * Popup Login Request Scopes
 *
 * Identical to loginRequest but explicitly named for popup-based authentication flows.
 * Used when calling acquireTokenPopup() method.
 *
 * @constant {Object}
 * @property {string[]} scopes - Requested OAuth scopes (openid, profile, email)
 * @property {string} prompt - Forces account selection during popup login
 */
export const popupLoginRequest = {
  scopes: ["openid", "profile", "email"],
  prompt: "select_account",
};

/**
 * API Access Token Request Scopes
 *
 * Scopes requested when acquiring access tokens for backend API calls.
 * Used with acquireTokenSilent() for token refresh.
 *
 * @constant {Object}
 * @property {string[]} scopes - Required OAuth scopes for API authentication
 */
export const apiRequest = {
  scopes: ["openid", "profile", "email"],
};
