import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = localStorage.getItem("msal.token");
  const account = localStorage.getItem("msal.account");

  if (!token || !account) {
    console.log("[ProtectedRoute] No auth found, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
