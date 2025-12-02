import { Configuration, PopupRequest, LogLevel } from "@azure/msal-browser";

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
    navigateToLoginRequestUrl: true,
    knownAuthorities: ["zenpoc.b2clogin.com"],
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    allowNativeBroker: false,
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
            // console.info(message);
            return;
          case LogLevel.Verbose:
            // console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
          default:
            return;
        }
      },
      logLevel: LogLevel.Warning,
    },
  },
};

/**
 * Scopes for login request
 */
export const loginRequest: PopupRequest = {
  scopes: ["openid", "profile", "email"],
};

/**
 * Scopes for API token request
 */
export const apiRequest = {
  scopes: ["openid", "profile", "email"],
};
