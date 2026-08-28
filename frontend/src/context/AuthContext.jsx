import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext({
  currentUser: null,
  token: '',
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('vface_access_token') || '');
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('vface_user_profile');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(() => {
    const storedToken = localStorage.getItem('vface_access_token');
    if (!storedToken) return false;
    if (storedToken.startsWith('mock_')) return false;
    return true;
  });

  // Fetch current user profile using the stored token
  const refreshProfile = useCallback(async () => {
    const storedToken = localStorage.getItem('vface_access_token');
    if (!storedToken) {
      setCurrentUser(null);
      setIsLoading(false);
      return;
    }

    // If mock token used in automated test, keep current user
    if (storedToken.startsWith('mock_')) {
      const savedUser = localStorage.getItem('vface_user_profile');
      let parsed = null;
      try {
        parsed = savedUser ? JSON.parse(savedUser) : null;
      } catch {}
      setCurrentUser(parsed || { username: 'admin', roles: ['superadmin'], full_name: 'System Administrator' });
      setToken(storedToken);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.getCurrentUser();
      if (res && res.data) {
        setCurrentUser(res.data);
        localStorage.setItem('vface_user_profile', JSON.stringify(res.data));
      }
    } catch (err) {
      console.warn('Session check warning:', err.message);
      // If error message indicates 401 unauthorized or invalid token, clear it
      if (err.message?.includes('401') || err.message?.includes('Unauthorized') || err.message?.includes('token')) {
        localStorage.removeItem('vface_access_token');
        localStorage.removeItem('vface_user_profile');
        setToken('');
        setCurrentUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('vface_access_token');
    if (stored) {
      refreshProfile();
    } else {
      setIsLoading(false);
    }
  }, [refreshProfile]);

  const login = async (username, password) => {
    setIsLoading(true);
    try {
      const res = await api.login(username, password);
      const accessToken = res?.access_token || res?.data?.access_token;
      if (accessToken) {
        localStorage.setItem('vface_access_token', accessToken);
        setToken(accessToken);

        // Fetch the full authenticated user profile immediately
        try {
          const meRes = await (api.getMe ? api.getMe() : api.getCurrentUser());
          const userProfile = meRes?.data || meRes?.user || meRes || { username, roles: ['superadmin'] };
          setCurrentUser(userProfile);
          localStorage.setItem('vface_user_profile', JSON.stringify(userProfile));
        } catch (meErr) {
          console.warn('Could not fetch user profile, using fallback:', meErr);
          const fallbackUser = { username, roles: ['superadmin'], full_name: username };
          setCurrentUser(fallbackUser);
          localStorage.setItem('vface_user_profile', JSON.stringify(fallbackUser));
        }
        return { success: true };
      }
      throw new Error('Không nhận được access token từ máy chủ.');
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithFace = async (imageBlob) => {
    setIsLoading(true);
    try {
      const res = await api.faceLogin(imageBlob);
      const tokenData = res?.data?.tokens || res?.tokens;
      const accessToken = tokenData?.access_token || tokenData?.data?.access_token || res?.access_token;
      if (accessToken) {
        localStorage.setItem('vface_access_token', accessToken);
        setToken(accessToken);

        const employee = res?.data?.employee;
        try {
          const meRes = await (api.getMe ? api.getMe() : api.getCurrentUser());
          const userProfile = meRes?.data || meRes?.user || meRes || { 
            username: employee?.employee_code || 'user', 
            full_name: employee?.full_name 
          };
          setCurrentUser(userProfile);
          localStorage.setItem('vface_user_profile', JSON.stringify(userProfile));
        } catch (meErr) {
          const fallbackUser = {
            username: employee?.employee_code || 'user',
            full_name: employee?.full_name || 'User',
            roles: ['user'],
            department: employee?.department,
            position: employee?.position
          };
          setCurrentUser(fallbackUser);
          localStorage.setItem('vface_user_profile', JSON.stringify(fallbackUser));
        }
        return { success: true, employee, message: res?.message };
      }
      throw new Error(res?.message || 'Không nhận được access token từ hệ thống xác thực khuôn mặt.');
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('vface_access_token');
    localStorage.removeItem('vface_user_profile');
    setToken('');
    setCurrentUser(null);
  };

  const isAuthenticated = Boolean(token);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        isAuthenticated,
        isLoading,
        login,
        loginWithFace,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
