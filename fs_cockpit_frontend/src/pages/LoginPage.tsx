/**
 * @fileoverview Login Page Component
 *
 * Enterprise authentication page for FS Cockpit platform using Azure AD B2C.
 * Provides secure Microsoft authentication with popup-based MSAL flow.
 *
 * Features:
 * - Azure AD B2C authentication via MSAL popup
 * - Automatic redirect if already authenticated
 * - Enhanced error handling for popup blockers
 * - Token storage in localStorage (ID token + access token)
 * - User-friendly authentication state management
 * - Responsive gradient design with feature highlights
 * - Security disclaimer and terms of service
 *
 * Authentication Flow:
 * 1. Check existing auth state (MSAL accounts + localStorage tokens)
 * 2. Auto-redirect authenticated users to intended destination
 * 3. On sign-in click: Launch MSAL popup synchronously (prevents popup blocking)
 * 4. Store both ID token and access token on success
 * 5. Dispatch loginComplete event for app-wide auth updates
 * 6. Navigate to intended page (from location state or /home)
 *
 * Error Handling:
 * - Popup blocked: Instructs user to allow popups
 * - User cancelled: Friendly cancellation message
 * - Other errors: Detailed error display with retry option
 *
 * @component
 * @example
 * // Used as route in App.tsx:
 * <Route path="/login" element={<LoginPage />} />
 */

import { useMsal } from "@azure/msal-react";
import { ChevronRight } from "@components/icons";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { popupLoginRequest } from "@config/msalConfig";
import { Alert, AlertDescription } from "@ui/alert";
import { Button } from "@ui/button";
import { Card, CardContent } from "@ui/card";
import {
  IntelligentDiagnosticsIcon,
  RealTimeIcon,
  UnifiedITIcon,
} from "@components/icons";

/**
 * Platform features displayed on login page
 * Each feature includes an icon component and descriptive text
 */
const features = [
  {
    icon: IntelligentDiagnosticsIcon,
    text: "Intelligent Diagnostics",
  },
  {
    icon: RealTimeIcon,
    text: "Real-Time System Insights",
  },
  {
    icon: UnifiedITIcon,
    text: "Unified IT Operations",
  },
];

/**
 * LoginPage Component
 *
 * Renders the authentication page with Azure AD B2C integration.
 *
 * State Management:
 * - isLoading: Tracks authentication process status
 * - error: Stores authentication error messages
 * - isRedirecting: Prevents duplicate redirects during navigation
 *
 * Hooks Used:
 * - useMsal: Access MSAL instance and accounts for authentication
 * - useNavigate: Programmatic navigation after successful login
 * - useLocation: Retrieve intended destination from route state
 *
 * @returns {JSX.Element} Login page with authentication UI
 *
 * @example
 * // Automatically used by router:
 * <Route path="/login" element={<LoginPage />} />
 */
export const LoginPage = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const { instance, accounts } = useMsal();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Get the intended destination from location state
  // On mobile, always go to /home (ticket list) instead of /home/:id
  const isMobile = window.innerWidth < 768;
  const requestedPath = (location.state as any)?.from || "/home";
  const from =
    isMobile && requestedPath.startsWith("/home/") ? "/home" : requestedPath;

  /**
   * Auto-redirect effect for already authenticated users
   *
   * Checks both MSAL accounts and localStorage for existing authentication.
   * If authenticated, immediately redirects to intended destination.
   *
   * Guards against:
   * - Duplicate redirects (isRedirecting flag)
   * - Interrupting active login flows (isLoading flag)
   */
  useEffect(() => {
    // Don't check if already redirecting or loading
    if (isRedirecting || isLoading) return;

    // Check both MSAL accounts and localStorage for authentication
    const hasToken = localStorage.getItem("msal.token");
    const hasAccount = localStorage.getItem("msal.account");

    if (accounts.length > 0 || (hasToken && hasAccount)) {
      setIsRedirecting(true);
      navigate(from, { replace: true });
    }
  }, [accounts, navigate, isRedirecting, isLoading, from]);

  /**
   * Handle Azure AD B2C authentication via MSAL popup
   *
   * CRITICAL: This function MUST NOT be async. Making it async will cause
   * the popup to be blocked by browsers since it's not in the direct
   * call stack of the user click event.
   *
   * Authentication Flow:
   * 1. Set loading state and clear errors
   * 2. Call loginPopup synchronously with popupLoginRequest config
   * 3. On success:
   *    - Store both access token and ID token in localStorage
   *    - Store full account data including idTokenClaims
   *    - Set active account in MSAL instance
   *    - Store login timestamp for debugging 401 errors
   *    - Dispatch loginComplete event for app components
   *    - Navigate to intended destination
   * 4. On error:
   *    - Detect popup blocked errors and show user-friendly message
   *    - Detect user cancellation and show cancellation message
   *    - Show generic error message for other failures
   *
   * Error Types:
   * - popup_window_error: Popup was blocked by browser
   * - user_cancelled: User closed the popup or cancelled auth
   * - Other: Network errors, auth failures, etc.
   *
   * @example
   * // Called by sign-in button click:
   * <Button onClick={handleSignIn} disabled={isLoading}>Sign in</Button>
   */
  const handleSignIn = () => {
    // DO NOT use async here - it breaks popup flow
    setIsLoading(true);
    setError(null);

    // CRITICAL: Call loginPopup synchronously from user click event
    // Any async/await here will cause popup blocker to trigger
    instance
      .loginPopup(popupLoginRequest)
      .then((response) => {
        // Store both tokens - backend might need ID token instead of access token
        if (response.accessToken) {
          // Store access token as main token for API requests
          localStorage.setItem("msal.token", response.accessToken);
          localStorage.setItem("msal.accessToken", response.accessToken);
        }
        if (response.idToken) {
          localStorage.setItem("msal.idToken", response.idToken);
          localStorage.setItem("msal.token", response.idToken);
        }

        if (response.account) {
          // Store the full account data including idTokenClaims
          const accountWithClaims = {
            ...response.account,
            idTokenClaims: response.idTokenClaims,
          };

          localStorage.setItem(
            "msal.account",
            JSON.stringify(accountWithClaims)
          );
          instance.setActiveAccount(response.account);

          // Store login timestamp to help detect immediate 401s after login
          sessionStorage.setItem("last_login_time", Date.now().toString());
        }

        // Small delay to ensure localStorage is written
        setTimeout(() => {
          // Dispatch custom event to notify app that login completed
          window.dispatchEvent(
            new CustomEvent("loginComplete", {
              detail: { timestamp: Date.now() },
            })
          );

          // Set redirecting flag and navigate to intended destination
          setIsRedirecting(true);
          navigate(from, { replace: true });
          setIsLoading(false);
        }, 100);
      })
      .catch((err: any) => {
        // Check if popup was blocked
        if (
          err?.errorCode === "popup_window_error" ||
          err?.errorCode === "empty_window_error" ||
          err?.errorCode === "monitor_window_timeout" ||
          err?.errorMessage?.includes("popup") ||
          err?.errorMessage?.includes("window")
        ) {
          setError(
            "Popup blocked! Please allow popups for this site in your browser settings and try again."
          );
        }
        // Check if user cancelled
        else if (
          err?.errorCode === "user_cancelled" ||
          err?.message?.includes("user_cancelled")
        ) {
          setError("Login cancelled. Please try again.");
        } else {
          setError(`Login failed: ${err?.message || "Unknown error"}`);
        }
        setIsLoading(false);
      });
  };

  return (
    <section className="relative w-full min-h-screen bg-white">
      <div className="flex w-full min-h-screen items-center justify-center bg-gradient-to-br from-[#0F172B] via-[#1C398E] to-[#312C85] px-4 md:px-6 lg:px-8 py-8 md:py-12">
        <div className="relative w-full max-w-[1024px] xl:max-w-[1200px] 2xl:max-w-[1400px] grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-center">
          <div className="relative flex flex-col gap-4 md:gap-6">
            <div className="flex flex-col">
              <svg
                className="w-32 h-32 md:w-40 md:h-40 -mb-8 -ml-2"
                viewBox="38 0 118 156"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g filter="url(#filter0_d_1_26)">
                  <path
                    d="M38 29C38 20.1634 45.1634 13 54 13H102C110.837 13 118 20.1634 118 29V77C118 85.8366 110.837 93 102 93H54C45.1634 93 38 85.8366 38 77V29Z"
                    fill="url(#paint0_linear_1_26)"
                    shapeRendering="crispEdges"
                  />
                  <path
                    d="M72 35V39M84 35V39M72 67V71M84 67V71M64 47H60M64 59H60M96 47H92M96 59H92M68 67H88C89.0609 67 90.0783 66.5786 90.8284 65.8284C91.5786 65.0783 92 64.0609 92 63V43C92 41.9391 91.5786 40.9217 90.8284 40.1716C90.0783 39.4214 89.0609 39 88 39H68C66.9391 39 65.9217 39.4214 65.1716 40.1716C64.4214 40.9217 64 41.9391 64 43V63C64 64.0609 64.4214 65.0783 65.1716 65.8284C65.9217 66.5786 66.9391 67 68 67ZM72 47H84V59H72V47Z"
                    stroke="white"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
                <defs>
                  <filter
                    id="filter0_d_1_26"
                    x="0"
                    y="0"
                    width="156"
                    height="156"
                    filterUnits="userSpaceOnUse"
                    colorInterpolationFilters="sRGB"
                  >
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix
                      in="SourceAlpha"
                      type="matrix"
                      values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                      result="hardAlpha"
                    />
                    <feMorphology
                      radius="12"
                      operator="erode"
                      in="SourceAlpha"
                      result="effect1_dropShadow_1_26"
                    />
                    <feOffset dy="25" />
                    <feGaussianBlur stdDeviation="25" />
                    <feComposite in2="hardAlpha" operator="out" />
                    <feColorMatrix
                      type="matrix"
                      values="0 0 0 0 0.169333 0 0 0 0 0.498049 0 0 0 0 1 0 0 0 0.5 0"
                    />
                    <feBlend
                      mode="normal"
                      in2="BackgroundImageFix"
                      result="effect1_dropShadow_1_26"
                    />
                    <feBlend
                      mode="normal"
                      in="SourceGraphic"
                      in2="effect1_dropShadow_1_26"
                      result="shape"
                    />
                  </filter>
                  <linearGradient
                    id="paint0_linear_1_26"
                    x1="38"
                    y1="13"
                    x2="118"
                    y2="93"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#2B7FFF" />
                    <stop offset="1" stopColor="#4F39F6" />
                  </linearGradient>
                </defs>
              </svg>
              <h1 className="font-['Arial'] font-normal text-white text-[48px] tracking-[0] leading-[48px]">
                FS Cockpit
              </h1>

              <p className="font-['Arial'] font-normal text-blue-200 text-[18px] tracking-[0] leading-[28px] mt-[15px]">
                Unified Diagnostics Platform for IT Excellence
              </p>
            </div>

            <div className="flex flex-col gap-3 md:gap-4">
              {features.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <div key={index} className="flex items-center gap-3">
                    <IconComponent />
                    <span className="font-['Arial'] font-normal text-white/90 text-sm tracking-[0] leading-5">
                      {feature.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <Card className="bg-white rounded-xl md:rounded-2xl shadow-[0px_25px_50px_-12px_#00000040] border-0">
            <CardContent className="flex flex-col gap-4 md:gap-6 p-6 md:p-8">
              <header className="flex flex-col gap-1">
                <h2 className="font-['Arial'] font-normal text-gray-900 text-base tracking-[0] leading-6">
                  Welcome Back
                </h2>
                <p className="font-['Arial'] font-normal text-gray-500 text-sm tracking-[0] leading-5">
                  Sign in to access your diagnostic workspace
                </p>
              </header>

              {error && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="button"
                onClick={handleSignIn}
                disabled={isLoading}
                className="h-12 md:h-14 bg-brand-primary hover:bg-brand-primary-hover rounded-lg justify-start gap-2 md:gap-3 px-3 transition-colors disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clipPath="url(#clip0_1_66)">
                      <path
                        d="M0 0H7.65217V7.65217H0V0ZM8.34783 0H16V7.65217H8.34783V0ZM0 8.34783H7.65217V16H0V8.34783ZM8.34783 8.34783H16V16H8.34783V8.34783Z"
                        fill="#155DFC"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_1_66">
                        <rect width="16" height="16" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </div>
                <div className="flex flex-col items-start flex-1">
                  <span className="font-['Arial'] font-normal text-white text-sm tracking-[0] leading-5">
                    {isLoading ? "Signing in..." : "Sign in with"}
                  </span>
                  <span className="font-['Arial'] font-normal text-white text-xs tracking-[0] leading-4 opacity-90">
                    Microsoft Azure AD B2C
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-white" />
              </Button>

              <Alert className="bg-blue-50 border-blue-200 rounded-[10px]">
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M16.6667 10.8335C16.6667 15.0002 13.75 17.0835 10.2833 18.2919C10.1018 18.3534 9.90462 18.3505 9.725 18.2835C6.25 17.0835 3.33334 15.0002 3.33334 10.8335V5.00021C3.33334 4.7792 3.42113 4.56724 3.57741 4.41096C3.73369 4.25468 3.94566 4.16688 4.16667 4.16688C5.83334 4.16688 7.91667 3.16688 9.36667 1.90021C9.54321 1.74938 9.7678 1.6665 10 1.6665C10.2322 1.6665 10.4568 1.74938 10.6333 1.90021C12.0917 3.17521 14.1667 4.16688 15.8333 4.16688C16.0543 4.16688 16.2663 4.25468 16.4226 4.41096C16.5789 4.56724 16.6667 4.7792 16.6667 5.00021V10.8335Z"
                    stroke="#155DFC"
                    strokeWidth="1.66667"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <AlertDescription className="flex flex-col gap-1 ml-2">
                  <span className="font-['Arial'] font-normal text-blue-800 text-sm tracking-[0] leading-5">
                    Secure Enterprise Access
                  </span>
                  <span className="font-['Arial'] font-normal text-blue-700 text-xs tracking-[0] leading-4">
                    Authentication is handled through your organization's
                    Microsoft Active Directory. Your credentials are never
                    stored by FS Cockpit.
                  </span>
                </AlertDescription>
              </Alert>

              <p className="font-['Arial'] font-normal text-gray-400 text-xs text-center tracking-[0] leading-4">
                By signing in, you agree to our Terms of Service and Privacy
                Policy
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
