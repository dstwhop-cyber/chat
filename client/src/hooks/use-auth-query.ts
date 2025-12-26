import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService, type LoginCredentials, type RegisterData } from '@/services/auth-service';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Query keys
export const authKeys = {
  currentUser: ['currentUser'] as const,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.currentUser,
    queryFn: () => authService.getCurrentUser(),
    enabled: authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.currentUser, data.user);
      toast.success('Successfully logged in');
      navigate('/chat');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to login');
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (userData: RegisterData) => authService.register(userData),
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.currentUser, data.user);
      toast.success('Account created successfully');
      navigate('/onboarding');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to register');
    },
  });
}

export function useGuestLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => authService.guestLogin(),
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.currentUser, data.user);
      toast.success('Welcome! You are now in guest mode');
      navigate('/chat');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to login as guest');
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      queryClient.removeQueries();
      navigate('/login');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to logout');
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Parameters<typeof authService.updateProfile>[0]) =>
      authService.updateProfile(updates),
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.currentUser, data);
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });
}
