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
  // ✅ Sign up and create profile row
  async signUp(params: SignUpParams) {
    try {
      // 1️⃣ Sign up user with redirect for email confirmation
      const { data, error } = await supabase.auth.signUp(
        {
          email: params.email,
          password: params.password,
        },
        {
          redirectTo: 'https://vartica-ten.vercel.app/confirm', // frontend confirmation page
        }
      );

      if (error) return { user: null, error };

      // 2️⃣ Create a profile row in 'profiles' table immediately (even if not confirmed yet)
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: data.user.id,
            email: data.user.email,
            created_at: new Date().toISOString(),
          },
        ]);

        if (profileError) {
          console.warn('Profile row creation failed:', profileError.message);
        }
      }

      // 3️⃣ Return null user because session is not active until email confirmed
      return { user: null, error: null };
    } catch (err) {
      return { user: null, error: err as Error };
    }
  }

  // ✅ Sign in after confirmation
  async signIn(params: SignInParams) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: params.email,
        password: params.password,
      });

      if (error) return { user: null, error };

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
      if (error) return { session: null, error };

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
      if (error) return { user: null, error };

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

  // ✅ Capture session after confirmation (frontend page)
  async getSessionFromUrl() {
    try {
      const { data, error } = await supabase.auth.getSessionFromUrl();
      if (error) return { session: null, error };

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
