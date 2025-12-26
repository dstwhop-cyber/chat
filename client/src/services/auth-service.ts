import apiClient from '@/lib/api-client';
import { setAuthToken, setCurrentUser, clearAuthData } from '@/lib/auth';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
}

export const authService = {
  // Login with email and password
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials);
    this.setSession(data);
    return data;
  },

  // Register a new user
  async register(userData: RegisterData): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', userData);
    this.setSession(data);
    return data;
  },

  // Login as guest
  async guestLogin(): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/guest');
    this.setSession(data);
    return data;
  },

  // Logout the current user
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      this.clearSession();
    }
  },

  // Refresh the access token
  async refreshToken(): Promise<{ accessToken: string }> {
    const { data } = await apiClient.post<{ accessToken: string }>('/auth/refresh');
    setAuthToken(data.accessToken);
    return data;
  },

  // Get current user profile
  async getCurrentUser() {
    const { data } = await apiClient.get('/auth/me');
    return data;
  },

  // Update user profile
  async updateProfile(updates: { name?: string; email?: string; password?: string; avatar?: File }) {
    const formData = new FormData();
    
    if (updates.name) formData.append('name', updates.name);
    if (updates.email) formData.append('email', updates.email);
    if (updates.password) formData.append('password', updates.password);
    if (updates.avatar) formData.append('avatar', updates.avatar);

    const { data } = await apiClient.patch('/auth/me', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    setCurrentUser(data);
    return data;
  },

  // Set session data after successful authentication
  private setSession(authResult: AuthResponse): void {
    setAuthToken(authResult.accessToken);
    setCurrentUser(authResult.user);
  },

  // Clear session data
  clearSession(): void {
    clearAuthData();
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token');
    return !!token;
  },
};

export default authService;
