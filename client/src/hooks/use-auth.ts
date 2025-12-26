import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { clearAuthData, getAuthToken, setAuthToken, setCurrentUser } from '@/lib/auth';

interface User {
  id: string;
  email: string;
  name: string;
  subscription: string;
  avatarUrl?: string;
  isGuest: boolean;
}

interface AuthResponse {
  user: User;
  accessToken: string;
}

export const useAuth = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Check auth status
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      try {
        const token = getAuthToken();
        if (!token) return null;
        const { data } = await apiClient.get<User>('/auth/me');
        return data;
      } catch (error) {
        const status = (error as any)?.response?.status;
        if (status === 401) return null;
        throw error;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    onSettled: () => {
      if (!isInitialized) {
        setIsInitialized(true);
      }
    },
  });

  // Login function
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password });
        setAuthToken(data.accessToken);
        setCurrentUser(data.user);
        queryClient.setQueryData(['auth', 'user'], data.user);
        toast.success('Logged in successfully');
        return data.user;
      } catch (error) {
        const message = (error as any)?.response?.data?.message || 'Login failed';
        toast.error(message);
        throw new Error(message);
      }
    },
    [queryClient]
  );

  // Register function
  const register = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        const { data } = await apiClient.post<AuthResponse>('/auth/register', { name, email, password });
        setAuthToken(data.accessToken);
        setCurrentUser(data.user);
        queryClient.setQueryData(['auth', 'user'], data.user);
        toast.success('Account created successfully');
        return data.user;
      } catch (error) {
        const message = (error as any)?.response?.data?.message || 'Registration failed';
        toast.error(message);
        throw new Error(message);
      }
    },
    [queryClient]
  );

  // Guest login function
  const loginAsGuest = useCallback(async () => {
    try {
      const { data } = await apiClient.post<AuthResponse>('/auth/guest', {});
      setAuthToken(data.accessToken);
      setCurrentUser(data.user);
      queryClient.setQueryData(['auth', 'user'], data.user);
      toast.success('Signed in as guest');
      return data.user;
    } catch (error) {
      const message = (error as any)?.response?.data?.message || 'Guest login failed';
      toast.error(message);
      throw new Error(message);
    }
  }, [queryClient]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all queries and reset user
      queryClient.clear();
      queryClient.setQueryData(['auth', 'user'], null);
      clearAuthData();
      navigate('/auth', { replace: true });
    }
  }, [navigate, queryClient]);

  // Refresh token function
  const refreshToken = useCallback(async () => {
    try {
      const { data } = await apiClient.post<{ accessToken: string }>('/auth/refresh', {});
      if (data?.accessToken) setAuthToken(data.accessToken);
      return data?.accessToken;
    } catch (error) {
      // If refresh fails, clear auth state
      queryClient.setQueryData(['auth', 'user'], null);
      clearAuthData();
      throw error;
    }
  }, [queryClient]);

  return {
    user,
    isAuthenticated: !!user,
    isLoading: !isInitialized || isLoading,
    isGuest: user?.isGuest || false,
    login,
    register,
    loginAsGuest,
    logout,
    refreshToken,
  };
};

export default useAuth;
