import { supabase } from '../../lib/supabase';
import {
  IAuthService,
  SignUpParams,
  SignInParams,
  User,
  AuthSession,
  AuthChangeEvent,
} from '../auth.interface';

class SupabaseAuthService implements IAuthService {
  // ✅ Sign up with user metadata (trigger will auto-create profile)
  async signUp(params: SignUpParams) {
    console.log('AuthService signUp called with params:', params);
    try {
      // Check if phone signup is requested
      if (params.phone && !params.email) {
        // Phone-based signup with OTP
        const { data, error } = await supabase.auth.signInWithOtp({
          phone: params.phone,
          options: {
            data: {
              full_name: params.fullName || 'User',
              role: params.role || 'customer',
            },
            shouldCreateUser: true,
          },
        });

        console.log('Supabase phone signUp result:', { data, error });
        if (error) {
          console.error('Supabase phone signUp error:', error);
          return { user: null, error };
        }

        // For phone signup, we don't get the user immediately
        // The user will be created after OTP verification
        return { user: null, error: null };
      } else {
        // Email-based signup
        const { data, error } = await supabase.auth.signUp({
          email: params.email,
          password: params.password,
          options: {
            data: {
              full_name: params.fullName || 'User',
              role: params.role || 'customer',
              phone: params.phone || null,
            },
          },
        });

        console.log('Supabase email signUp result:', { data, error });
        if (error) {
          console.error('Supabase email signUp error:', error);
          return { user: null, error };
        }

        const user: User | null = data.user
          ? {
            id: data.user.id,
            email: data.user.email || '',
          }
          : null;

        return { user, error: null };
      }
    } catch (err) {
      console.log('AuthService signUp error:', err);
      return { user: null, error: err as Error };
    }
  }

  // ✅ Sign in
  async signIn(params: SignInParams) {
    try {
      console.log('AuthService signIn called with params:', params);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: params.email,
        password: params.password,
      });

      console.log('Supabase signIn result:', { data, error });

      if (error) {
        console.error('Supabase signIn error:', error);
        return { user: null, error };
      }

      const user: User | null = data.user
        ? {
          id: data.user.id,
          email: data.user.email || '',
        }
        : null;

      return { user, error: null };
    } catch (err) {
      console.error('AuthService signIn error:', err);
      return { user: null, error: err as Error };
    }
  }

  // ✅ Sign in with Google
  async signInWithGoogle() {
    try {
      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const redirectUrl = `${appUrl}/auth/callback/`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Supabase signInWithGoogle error:', error);
        return { error };
      }

      return { error: null };
    } catch (err) {
      console.error('AuthService signInWithGoogle error:', err);
      return { error: err as Error };
    }
  }

  // ✅ Sign up with Google
  async signUpWithGoogle(role: 'customer' | 'vendor' | 'delivery_agent', phone?: string) {
    try {
      // Store the intended role in safe storage before OAuth redirect
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('oauth_role', role);
          // Store phone number as well if provided
          if (phone) {
            window.localStorage.setItem('oauth_phone', phone);
          }
        }
      } catch (error) {
        console.warn('Storage access blocked by tracking prevention:', error);
      }

      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const redirectUrl = `${appUrl}/auth/callback/`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Supabase signUpWithGoogle error:', error);
        return { error };
      }

      return { error: null };
    } catch (err) {
      console.error('AuthService signUpWithGoogle error:', err);
      return { error: err as Error };
    }
  }

  // ✅ Sign out
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase signOut error:', error);
      }
      return { error };
    } catch (err) {
      console.error('AuthService signOut error:', err);
      return { error: err as Error };
    }
  }

  // ✅ Get current session
  async getSession() {
    try {
      console.log('AuthService getSession called');
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Supabase getSession error:', error);
        return { session: null, error };
      }

      console.log('Supabase getSession result:', { data });

      const session: AuthSession | null = data.session
        ? {
          user: {
            id: data.session.user.id,
            email: data.session.user.email || '',
          },
          access_token: data.session.access_token,
        }
        : null;

      return { session, error: null };
    } catch (err) {
      console.error('AuthService getSession error:', err);
      return { session: null, error: err as Error };
    }
  }

  // ✅ Get current user
  async getUser() {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.error('Supabase getUser error:', error);
        return { user: null, error };
      }

      const user: User | null = data.user
        ? {
          id: data.user.id,
          email: data.user.email || '',
        }
        : null;

      return { user, error: null };
    } catch (err) {
      console.error('AuthService getUser error:', err);
      return { user: null, error: err as Error };
    }
  }

  // ✅ Auth state listener
  onAuthStateChange(callback: (event: AuthChangeEvent) => void) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', { event, session });
      const authEvent: AuthChangeEvent = {
        event: event as AuthChangeEvent['event'],
        session: session
          ? {
            user: {
              id: session.user.id,
              email: session.user.email || '',
            },
            access_token: session.access_token,
          }
          : null,
      };
      callback(authEvent);
    });

    return {
      unsubscribe: () => data.subscription.unsubscribe(),
    };
  }
}

export const authService = new SupabaseAuthService();