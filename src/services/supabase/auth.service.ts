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
  async signUp(params: SignUpParams) {
    try {
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

      return { user, error: null };
    } catch (err) {
      return { user: null, error: err as Error };
    }
  }

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

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  }

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
