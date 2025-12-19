export interface User {
  id: string;
  email: string;
}

export interface AuthSession {
  user: User;
  access_token: string;
}

export interface AuthChangeEvent {
  event: 'SIGNED_IN' | 'SIGNED_OUT' | 'USER_UPDATED' | 'TOKEN_REFRESHED';
  session: AuthSession | null;
}

export interface SignUpParams {
  email: string;
  password: string;
  fullName?: string;
  role?: string;
  phone?: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface IAuthService {
  signUp(params: SignUpParams): Promise<{ user: User | null; error: Error | null }>;
  signIn(params: SignInParams): Promise<{ user: User | null; error: Error | null }>;
  signInWithGoogle(): Promise<{ data: any; error: Error | null }>;
  signUpWithGoogle(role: string): Promise<{ data: any; error: Error | null }>;
  signOut(): Promise<{ error: Error | null }>;
  getSession(): Promise<{ session: AuthSession | null; error: Error | null }>;
  getUser(): Promise<{ user: User | null; error: Error | null }>;
  onAuthStateChange(callback: (event: AuthChangeEvent) => void): { unsubscribe: () => void };
}