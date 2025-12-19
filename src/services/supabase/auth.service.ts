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
      // 1️⃣ Sign up user with metadata
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

      console.log('Supabase signUp result:', { data, error });
      if (error) {
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
      console.log('AuthService signUp error:', err);
      return { user: null, error: err as Error };
    }
  }

  // ✅ Sign in with email and password
  async signIn(params: SignInParams) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: params.email,
        password: params.password,
      });

      if (error) {
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
      return { user: null, error: err as Error };
    }
  }

  // ✅ Sign in with Google
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      return { error };
    }

    return { data, error: null };
  }

  // ✅ Sign up with Google
  async signUpWithGoogle(role: 'customer' | 'vendor' | 'delivery_agent') {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      return { error };
    }

    // Store the intended role in localStorage so we can use it after OAuth callback
    localStorage.setItem('oauth_role', role);

    return { data, error: null };
  }

  // ✅ Sign out
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  }

  // ✅ Get current session
  async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        return { session: null, error };
      }

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
      return { session: null, error: err as Error };
    }
  }

  // ✅ Get current user
  async getUser() {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
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
      return { user: null, error: err as Error };
    }
  }

  // ✅ Auth state listener
  onAuthStateChange(callback: (event: AuthChangeEvent) => void) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
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