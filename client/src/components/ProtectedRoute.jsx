import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { hasAllowedRole } from "../lib/access.js";

export default function ProtectedRoute({ roles }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading)
    return (
      <div className="route-wait" role="status">
        Checking your session…
      </div>
    );
  if (!user)
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  if (!hasAllowedRole(user, roles)) return <Navigate to="/app" replace />;
  return <Outlet />;
}
