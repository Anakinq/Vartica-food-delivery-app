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
      // 1️⃣ Sign up user
      const { data, error } = await supabase.auth.signUp({
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

      if (!user) {
        return { user: null, error: new Error('Signup failed: no user returned') };
      }

      // 2️⃣ Automatically sign in user to get a session
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: params.email,
        password: params.password,
      });

      if (signInError) {
        return { user, error: new Error(`Signup succeeded, but sign-in failed: ${signInError.message}`) };
      }

      // 3️⃣ Create profile row in 'profiles' table
      const { error: profileError } = await supabase.from('profiles').insert([
        {
          id: user.id, // same as auth user id
          email: user.email,
          created_at: new Date().toISOString(),
          // Add other default fields here if needed
        },
      ]);

      if (profileError) {
        return { user, error: new Error(`Signup succeeded, but profile creation failed: ${profileError.message}`) };
      }

      return { user, error: null };
    } catch (err) {
      return { user: null, error: err as Error };
    }
  }

  // ✅ Sign in
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
