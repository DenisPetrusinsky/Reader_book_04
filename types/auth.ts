export interface User {
  id: string;
  email: string;
  email_confirmed_at?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  role?: string;
  parent_id?: string;
  points?: number;
  diamonds?: number;
  current_streak?: number;
  longest_streak?: number;
  level?: number;
  last_activity?: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  session: any;
  loading: boolean;
  initialized: boolean;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface SignUpData {
  email: string;
  password: string;
  full_name: string;
}

export interface ProfileUpdateData {
  full_name?: string;
  bio?: string;
  avatar_url?: string;
}