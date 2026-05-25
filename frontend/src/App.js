import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { PermissionProvider, usePermissions } from './context/PermissionContext';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyLogin from './pages/VerifyLogin';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import DashboardRedirectGuard from './components/DashboardRedirectGuard';
import Schedule from './pages/Schedule';
import Reports from './pages/Reports';
import Tickets from './pages/Tickets';
import TicketDetail from './pages/TicketDetail';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import Sites from './pages/Sites';
import SiteDetail from './pages/SiteDetail';
import StarlinkManagement from './pages/StarlinkManagement';
import AccountManagement from './pages/AccountManagement';
import Activity from './pages/Activity';
import Categories from './pages/Categories';
import DepartmentManagement from './pages/DepartmentManagement';
import TTB from './pages/TTB';
import Statistics from './pages/Statistics';
import VersionUpdates from './pages/VersionUpdates';
import Configuration from './pages/Configuration';
import FiberzoneDashboard from './pages/FiberzoneDashboard';
import WorkOrders from './pages/WorkOrders';
import FiberzoneClients from './pages/FiberzoneClients';
import FiberzoneSchedule from './pages/FiberzoneSchedule';
import WorkOrderDetail from './pages/WorkOrderDetail';
import Projects from './pages/Projects';
import ProjectConfiguration from './pages/ProjectConfiguration';
import AccessControl from './pages/AccessControl';
import ProjectWorkspace from './components/projects/ProjectWorkspace';
import Layout from './components/Layout';
import { Toaster } from './components/ui/sonner';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

/**
 * Checks RBAC can_view for a given menu key.
 * If the user's department doesn't have view access, redirect to home.
 * permissionsLoading state is handled — we wait before redirecting to avoid flash.
 */
const PermissionGuard = ({ menuKey, children }) => {
  const { canView, permissionsLoading } = usePermissions();

  if (permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-400"></div>
      </div>
    );
  }

  if (!canView(menuKey)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <PermissionProvider>
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-login" element={<VerifyLogin />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<ProtectedRoute><DashboardRedirectGuard><Dashboard /></DashboardRedirectGuard></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirectGuard><Dashboard /></DashboardRedirectGuard></ProtectedRoute>} />

              {/* RBAC-guarded routes */}
              <Route path="/activity" element={<ProtectedRoute><PermissionGuard menuKey="activity"><Activity /></PermissionGuard></ProtectedRoute>} />
              <Route path="/scheduler" element={<ProtectedRoute><PermissionGuard menuKey="scheduler"><Schedule /></PermissionGuard></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><PermissionGuard menuKey="reports"><Reports /></PermissionGuard></ProtectedRoute>} />
              <Route path="/tickets" element={<ProtectedRoute><PermissionGuard menuKey="tickets"><Tickets /></PermissionGuard></ProtectedRoute>} />
              <Route path="/tickets/:ticketId" element={<ProtectedRoute><PermissionGuard menuKey="tickets"><TicketDetail /></PermissionGuard></ProtectedRoute>} />
              <Route path="/ttb" element={<ProtectedRoute><PermissionGuard menuKey="ttb"><TTB /></PermissionGuard></ProtectedRoute>} />
              <Route path="/sites" element={<ProtectedRoute><PermissionGuard menuKey="sites"><Sites /></PermissionGuard></ProtectedRoute>} />
              <Route path="/sites/:siteId" element={<ProtectedRoute><PermissionGuard menuKey="sites"><SiteDetail /></PermissionGuard></ProtectedRoute>} />
              <Route path="/projects" element={<ProtectedRoute><PermissionGuard menuKey="projects"><Projects /></PermissionGuard></ProtectedRoute>} />
              <Route path="/projects/configuration" element={<ProtectedRoute><PermissionGuard menuKey="projects"><ProjectConfiguration /></PermissionGuard></ProtectedRoute>} />
              <Route path="/projects/:projectId/*" element={<ProtectedRoute><PermissionGuard menuKey="projects"><ProjectWorkspace /></PermissionGuard></ProtectedRoute>} />
              <Route path="/fiberzone" element={<ProtectedRoute><PermissionGuard menuKey="fiberzone"><FiberzoneDashboard /></PermissionGuard></ProtectedRoute>} />
              <Route path="/fiberzone/work-orders" element={<ProtectedRoute><PermissionGuard menuKey="fiberzone"><WorkOrders /></PermissionGuard></ProtectedRoute>} />
              <Route path="/fiberzone/work-orders/:woId" element={<ProtectedRoute><PermissionGuard menuKey="fiberzone"><WorkOrderDetail /></PermissionGuard></ProtectedRoute>} />
              <Route path="/fiberzone/clients" element={<ProtectedRoute><PermissionGuard menuKey="fiberzone"><FiberzoneClients /></PermissionGuard></ProtectedRoute>} />
              <Route path="/fiberzone/schedule" element={<ProtectedRoute><PermissionGuard menuKey="fiberzone"><FiberzoneSchedule /></PermissionGuard></ProtectedRoute>} />
              <Route path="/fiberzone/sites/:siteId" element={<ProtectedRoute><PermissionGuard menuKey="fiberzone"><SiteDetail /></PermissionGuard></ProtectedRoute>} />

              {/* Non-menu routes — no RBAC guard */}
              <Route path="/statistics" element={<ProtectedRoute><Statistics /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/profile/:userId" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
              <Route path="/starlink" element={<ProtectedRoute><StarlinkManagement /></ProtectedRoute>} />
              <Route path="/accounts" element={<ProtectedRoute><AccountManagement /></ProtectedRoute>} />
              <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
              <Route path="/departments" element={<ProtectedRoute><DepartmentManagement /></ProtectedRoute>} />
              <Route path="/updates" element={<ProtectedRoute><VersionUpdates /></ProtectedRoute>} />
              <Route path="/configuration" element={<ProtectedRoute><Configuration /></ProtectedRoute>} />
              <Route path="/access-control" element={<ProtectedRoute><AccessControl /></ProtectedRoute>} />
            </Routes>
            <Toaster />
          </BrowserRouter>
        </NotificationProvider>
      </PermissionProvider>
    </AuthProvider>
  );
}

export default App;
