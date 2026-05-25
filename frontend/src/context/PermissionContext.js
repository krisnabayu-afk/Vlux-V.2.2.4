import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const PermissionContext = createContext();

const API = `${process.env.REACT_APP_API_URL}/api`;

// Roles that bypass all permission checks
const UNRESTRICTED_ROLES = ['SuperUser'];

/**
 * Default permission when no row is configured for a menu key.
 * Full access by default — restrictions must be explicitly set by SuperUser.
 */
const DEFAULT_PERM = { can_view: true, can_edit: true, report_visibility: 'all' };

export const PermissionProvider = ({ children }) => {
  const { user } = useAuth();
  // permissions: { [menuKey]: { can_view, can_edit, report_visibility } }
  const [permissions, setPermissions] = useState({});
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    // Unrestricted roles skip the API call entirely
    if (!user || UNRESTRICTED_ROLES.includes(user.role)) {
      setPermissions({});
      setPermissionsLoading(false);
      return;
    }
    try {
      const response = await axios.get(`${API}/permissions/my`);
      setPermissions(response.data || {});
    } catch (err) {
      console.error('Failed to load permissions:', err);
      setPermissions({});
    } finally {
      setPermissionsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setPermissionsLoading(true);
      fetchPermissions();
    } else {
      setPermissions({});
      setPermissionsLoading(false);
    }
  }, [user, fetchPermissions]);

  /**
   * Returns true if the current user can VIEW this menu/feature.
   * Always true for SuperUser.
   * Defaults to true if no permission row is configured.
   */
  const canView = useCallback(
    (menuKey) => {
      if (!user || UNRESTRICTED_ROLES.includes(user.role)) return true;
      const perm = permissions[menuKey];
      if (!perm) return DEFAULT_PERM.can_view; // no row = full access
      return perm.can_view !== false;
    },
    [user, permissions]
  );

  /**
   * Returns true if the current user can EDIT in this menu/feature.
   * Always true for SuperUser.
   * Defaults to true if no permission row is configured.
   */
  const canEdit = useCallback(
    (menuKey) => {
      if (!user || UNRESTRICTED_ROLES.includes(user.role)) return true;
      const perm = permissions[menuKey];
      if (!perm) return DEFAULT_PERM.can_edit;
      return perm.can_edit !== false;
    },
    [user, permissions]
  );

  /**
   * Returns 'all' or 'final_only' for the reports menu.
   * Always 'all' for SuperUser.
   */
  const reportVisibility = useCallback(() => {
    if (!user || UNRESTRICTED_ROLES.includes(user.role)) return 'all';
    const perm = permissions['reports'];
    return perm?.report_visibility || 'all';
  }, [user, permissions]);

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        permissionsLoading,
        canView,
        canEdit,
        reportVisibility,
        refreshPermissions: fetchPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionContext);

/** Convenience hook — returns boolean */
export const useCanView = (menuKey) => {
  const { canView } = usePermissions();
  return canView(menuKey);
};

/** Convenience hook — returns boolean */
export const useCanEdit = (menuKey) => {
  const { canEdit } = usePermissions();
  return canEdit(menuKey);
};

/** Convenience hook for report visibility */
export const useReportVisibility = () => {
  const { reportVisibility } = usePermissions();
  return reportVisibility();
};
