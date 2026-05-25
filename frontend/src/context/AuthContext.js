import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const API = `${process.env.REACT_APP_API_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [orgConfig, setOrgConfig] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkIdleTimeout = () => {
      const lastActive = localStorage.getItem('lastActive');
      const now = Date.now();
      const IDLE_TIMEOUT = 72 * 60 * 60 * 1000; // 72 hours in milliseconds

      if (lastActive && now - parseInt(lastActive) > IDLE_TIMEOUT) {
        logout();
        return true;
      }
      return false;
    };

    if (token) {
      const isExpired = checkIdleTimeout();
      if (!isExpired) {
        localStorage.setItem('lastActive', Date.now().toString());
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        fetchUser();
      }
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
      try {
        const orgResponse = await axios.get(`${API}/organization/org-config`);
        setOrgConfig(orgResponse.data);
      } catch (orgErr) {
        console.error('Failed to fetch org config:', orgErr);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    
    if (response.data.status === '2fa_required') {
      return response.data; // Return to Login component to handle UI change
    }

    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    localStorage.setItem('lastActive', Date.now().toString());
    setToken(access_token);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    try {
      const orgResponse = await axios.get(`${API}/organization/org-config`);
      setOrgConfig(orgResponse.data);
    } catch (orgErr) {
      console.error('Failed to fetch org config:', orgErr);
    }
    return userData;
  };

  const verifyLogin = async (tokenString) => {
    const response = await axios.post(`${API}/auth/verify-login`, { token: tokenString });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    localStorage.setItem('lastActive', Date.now().toString());
    setToken(access_token);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    try {
      const orgResponse = await axios.get(`${API}/organization/org-config`);
      setOrgConfig(orgResponse.data);
    } catch (orgErr) {
      console.error('Failed to fetch org config:', orgErr);
    }
    return userData;
  };

  const forgotPassword = async (email) => {
    const response = await axios.post(`${API}/auth/forgot-password`, { email });
    return response.data;
  };

  const resetPassword = async (tokenString, newPassword) => {
    const response = await axios.post(`${API}/auth/reset-password`, { token: tokenString, new_password: newPassword });
    return response.data;
  };

  const register = async (userData) => {
    await axios.post(`${API}/auth/register`, userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('lastActive');
    setToken(null);
    setUser(null);
    setOrgConfig(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const isTechOps = useMemo(() => {
    if (!user) return false;
    if (orgConfig?.division_mappings?.tech_ops_department_id && user.department_id === orgConfig.division_mappings.tech_ops_department_id) return true;
    return user.department === 'Technical Operation';
  }, [user, orgConfig]);

  return (
    <AuthContext.Provider value={{ user, orgConfig, isTechOps, login, verifyLogin, forgotPassword, resetPassword, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

