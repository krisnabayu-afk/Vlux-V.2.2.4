import { Navigate } from 'react-router-dom';
import { useIsEnterpriseSolution } from '../hooks/useIsEnterpriseSolution';
import { useAuth } from '../context/AuthContext';

/**
 * Route guard component that redirects Enterprise Solution users from main dashboard to Fiberzone Dashboard.
 * This prevents access loops and ensures proper redirection on login or direct URL access.
 */
const DashboardRedirectGuard = ({ children }) => {
  const { loading } = useAuth();
  const isEnterpriseSolution = useIsEnterpriseSolution();

  // Wait for user data to load before checking
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect Enterprise Solution users to Fiberzone Dashboard
  if (isEnterpriseSolution) {
    return <Navigate to="/fiberzone" replace />;
  }

  return children;
};

export default DashboardRedirectGuard;
