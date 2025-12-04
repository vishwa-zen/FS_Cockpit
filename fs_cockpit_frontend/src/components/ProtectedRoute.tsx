import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Check authentication after component mounts
    const checkAuth = () => {
      const token = localStorage.getItem("msal.token");
      const account = localStorage.getItem("msal.account");

      console.log("[ProtectedRoute] Checking auth for:", location.pathname, {
        hasToken: !!token,
        hasAccount: !!account,
      });

      if (token && account) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }

      setIsChecking(false);
    };

    // Small delay to ensure localStorage is loaded in production
    const timer = setTimeout(checkAuth, 100);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#155cfb]"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated, preserve the intended destination
  if (!isAuthenticated) {
    console.log("[ProtectedRoute] Not authenticated, redirecting to login");
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};
