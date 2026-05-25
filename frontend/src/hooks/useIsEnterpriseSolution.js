import { useAuth } from '../context/AuthContext';

/**
 * Hook to check if the current user belongs to the Enterprise Solution division.
 * Users from this division are automatically redirected to Fiberzone Dashboard
 * and are restricted from accessing the main dashboard.
 *
 * @returns {boolean} true if user is from "Enterprise Solution" division of "Enterprise Vertical Solution" department
 */
export const useIsEnterpriseSolution = () => {
  const { user } = useAuth();

  if (!user) return false;

  // Aggressive string normalization to handle hidden characters
  const cleanString = (str) => {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .trim()                           // Trim start/end
      .replace(/\s+/g, ' ')            // Multiple spaces to single
      .replace(/\u00A0/g, ' ')         // Non-breaking space to regular space
      .trim();                          // Final trim
  };

  const div = cleanString(user.division);
  const targetDiv = 'Enterprise Solution';

  // Match on division ONLY (Enterprise Solution division users)
  return div === targetDiv;
};
