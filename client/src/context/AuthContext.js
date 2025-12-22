import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import { tokenManager } from '../utils/tokenManager';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.accessToken,
        loading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: action.payload,
      };
    case 'TOKEN_REFRESHED':
      return {
        ...state,
        token: action.payload.accessToken,
      };
    default:
      return state;
  }
};

const initialState = {
  isAuthenticated: false,
  user: null,
  token: localStorage.getItem('accessToken'),
  loading: true,
  error: null,
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          await fetchUser();
        } catch (error) {
          console.error('Auth initialization failed:', error);
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    
    initializeAuth();
  }, []);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      // Check if token is expired before making request
      if (token && tokenManager.isTokenExpired(token)) {

        await refreshToken();
        // Retry fetchUser with new token
        return fetchUser();
      }
      
      const response = await axios.get('/api/auth/me');
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: response.data.user,
          accessToken: localStorage.getItem('accessToken'),
        },
      });
    } catch (error) {
      // Try to refresh token first
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken && (error.response?.status === 401 || error.response?.status === 403)) {
        try {

          await refreshToken();
          // Retry fetchUser with new token
          return fetchUser();
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          // Clear tokens and logout
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          dispatch({ type: 'AUTH_ERROR', payload: 'Session expired. Please login again.' });
          return;
        }
      }
      
      console.error('Auth error:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      dispatch({ type: 'AUTH_ERROR', payload: 'Authentication failed' });
    }
  };

  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        dispatch({ type: 'AUTH_ERROR', payload: 'No refresh token available' });
        return;
      }
      

      const response = await axios.post('/api/auth/refresh', { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      

      dispatch({ type: 'TOKEN_REFRESHED', payload: { accessToken, refreshToken: newRefreshToken } });
    } catch (error) {
      console.error('Token refresh failed:', error);
      dispatch({ type: 'AUTH_ERROR', payload: 'Failed to refresh token' });
    }
  };

  const login = async (login, password) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await axios.post('/api/auth/login', { login, password });
      
      const { user, accessToken, refreshToken } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, accessToken },
      });
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      dispatch({ type: 'AUTH_ERROR', payload: message });
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await axios.post('/api/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      delete axios.defaults.headers.common['Authorization'];
      dispatch({ type: 'LOGOUT' });
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await axios.post('/api/auth/register', userData);
      
      const { user, accessToken, refreshToken } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, accessToken },
      });
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      dispatch({ type: 'AUTH_ERROR', payload: message });
      return { success: false, error: message };
    }
  };

  const value = {
    ...state,
    login,
    logout,
    register,
    fetchUser,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthWithRefresh = () => {
  const context = useContext(AuthContext);
  const { isAuthenticated, refreshToken } = context;
  
  // Setup automatic token refresh
  useEffect(() => {
    if (isAuthenticated && refreshToken) {
      tokenManager.setupAutoRefresh(
        async () => {
          try {
            await refreshToken();

          } catch (error) {
            console.error('Auto refresh failed:', error);
          }
        },
        () => {

        }
      );
    }
  }, [isAuthenticated, refreshToken]);
  
  return context;
};