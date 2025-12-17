import { Configuration, LogLevel } from "@azure/msal-browser";

/**
 * Configuration object to be passed to MSAL instance on creation.
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
 * Scopes for login request
 */
export const loginRequest = {
  scopes: ["openid", "profile", "email"],
  prompt: "select_account",
};

/**
 * Login request specifically for popup flow
 */
export const popupLoginRequest = {
  scopes: ["openid", "profile", "email"],
  prompt: "select_account",
};

/**
 * Scopes for API token request
 */
export const apiRequest = {
  scopes: ["openid", "profile", "email"],
};
