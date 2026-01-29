import { supabase } from '../../lib/supabase/client';
import {
  IAuthService,
  SignUpParams,
  SignInParams,
  User,
  AuthSession,
  AuthChangeEvent,
} from '../auth.interface';

// Utility function to handle 401 errors by refreshing session
async function handleUnauthorizedError() {
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (error) {
      console.warn('Session refresh failed:', error);
      return false;
    }
    if (session) {
      // Session successfully refreshed
      return true;
    }
  } catch (refreshError) {
    console.warn('Session refresh error:', refreshError);
  }
  return false;
}

class SupabaseAuthService implements IAuthService {
  // ✅ Sign up with user metadata (trigger will auto-create profile)
  async signUp(params: SignUpParams) {
    if (process.env.NODE_ENV === 'development') {
      console.log('AuthService signUp called with params:', params);
    }
    try {
      // Validate that either email or phone is provided
      if (!params.email && !params.phone) {
        throw new Error('Either email or phone must be provided');
      }

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

        if (process.env.NODE_ENV === 'development') {
          console.log('Supabase phone signUp result:', { data, error });
        }
        if (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Supabase phone signUp error:', error);
          }
          return { user: null, error };
        }

        // For phone signup, we don't get the user immediately
        // The user will be created after OTP verification
        return { user: null, error: null };
      } else if (params.email && params.password) {
        // Email-based signup
        const { data, error } = await supabase.auth.signUp({
          email: params.email,
          password: params.password,
          options: {
            data: {
              full_name: params.fullName || 'User',
              role: params.role || 'customer',
              phone: params.phone || null,
              ...(params.role === 'vendor' && {
                vendor_type: 'student', // Default to student vendor type
              }),
              ...(params.role === 'delivery_agent' && {
                vehicle_type: 'Bike', // Default to bike
              }),
            },
          },
        });

        if (process.env.NODE_ENV === 'development') {
          console.log('Supabase email signUp result:', { data, error });
        }
        if (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Supabase email signUp error:', error);
          }

          // Enhance error with more specific messages
          const enhancedError = new Error(this.getEnhancedErrorMessage(error.message, 'signup'));
          (enhancedError as any).originalError = error;
          (enhancedError as any).code = error.code;

          return { user: null, error: enhancedError };
        }

        const user: User | null = data.user
          ? {
            id: data.user.id,
            email: data.user.email || '',
          }
          : null;

        return { user, error: null };
      } else {
        throw new Error('For email signup, both email and password are required');
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.log('AuthService signUp error:', err);
      }
      return { user: null, error: err as Error };
    }
  }

  // ✅ Sign in
  async signIn(params: SignInParams) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('AuthService signIn called with params:', params);
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: params.email,
        password: params.password,
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('Supabase signIn result:', { data, error });
      }

      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Supabase signIn error:', error);
        }

        // Enhance error with more specific messages
        const enhancedError = new Error(this.getEnhancedErrorMessage(error.message, 'signin'));
        (enhancedError as any).originalError = error;
        (enhancedError as any).code = error.code;

        return { user: null, error: enhancedError };
      }

      const user: User | null = data.user
        ? {
          id: data.user.id,
          email: data.user.email || '',
        }
        : null;

      return { user, error: null };
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('AuthService signIn error:', err);
      }
      return { user: null, error: err as Error };
    }
  }

  // ✅ Sign in with Google
  async signInWithGoogle() {
    try {
      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const redirectUrl = `${appUrl}/auth/callback`;

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
        if (process.env.NODE_ENV === 'development') {
          console.error('Supabase signInWithGoogle error:', error);
        }

        // Enhance error with more specific messages
        const enhancedError = new Error(this.getEnhancedErrorMessage(error.message, 'google_signin'));
        (enhancedError as any).originalError = error;
        (enhancedError as any).code = error.code;

        return { error: enhancedError };
      }

      return { error: null };
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('AuthService signInWithGoogle error:', err);
      }
      return { error: err as Error };
    }
  }

  // ✅ Sign up with Google
  async signUpWithGoogle(role: 'customer' | 'vendor' | 'delivery_agent', phone?: string) {
    try {
      // Store the intended role in safe storage before OAuth redirect
      try {
        if (typeof window !== 'undefined') {
          // Use the same SafeStorage instance that Supabase uses
          const safeStorage = (supabase.auth as any)._client.storage;
          safeStorage.setItem('oauth_role', role);
          // Store phone number as well if provided
          if (phone) {
            safeStorage.setItem('oauth_phone', phone);
          }
        }
      } catch (error) {
        console.warn('Storage access blocked by tracking prevention:', error);
      }

      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const redirectUrl = `${appUrl}/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            role, // Pass role as query parameter
            phone: phone || '',
          },
        },
      });

      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Supabase signUpWithGoogle error:', error);
        }

        // Enhance error with more specific messages
        const enhancedError = new Error(this.getEnhancedErrorMessage(error.message, 'google_signin'));
        (enhancedError as any).originalError = error;
        (enhancedError as any).code = error.code;

        return { error: enhancedError };
      }

      return { error: null };
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('AuthService signUpWithGoogle error:', err);
      }
      return { error: err as Error };
    }
  }

  // ✅ Sign out
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Supabase signOut error:', error);
        }
      }
      return { error };
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('AuthService signOut error:', err);
      }
      return { error: err as Error };
    }
  }

  // ✅ Get current session
  async getSession() {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('AuthService getSession called');
      }
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Supabase getSession error:', error);
        }
        return { session: null, error };
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('Supabase getSession result:', { data });
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
      if (process.env.NODE_ENV === 'development') {
        console.error('AuthService getSession error:', err);
      }
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
      if (process.env.NODE_ENV === 'development') {
        console.error('AuthService getUser error:', err);
      }
      return { user: null, error: err as Error };
    }
  }

  // ✅ Auth state listener
  onAuthStateChange(callback: (event: AuthChangeEvent) => void) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Auth state changed:', { event, session });
      }
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

  // Helper method to enhance error messages with more user-friendly descriptions
  private getEnhancedErrorMessage(message: string, operation: 'signin' | 'signup' | 'forgot_password' | 'google_signin' = 'signin'): string {
    const lowerMessage = message.toLowerCase();

    // Common Supabase error patterns
    if (lowerMessage.includes('invalid login credentials')) {
      return 'Invalid email or password. Please try again.';
    } else if (lowerMessage.includes('email not confirmed')) {
      return 'Email not confirmed. Please check your email for a confirmation link.';
    } else if (lowerMessage.includes('email not found')) {
      return 'Email not found. Please check the email address or sign up for an account.';
    } else if (lowerMessage.includes('network')) {
      return 'Network error. Please check your connection and try again.';
    } else if (lowerMessage.includes('timeout')) {
      return 'Request timed out. Please try again.';
    } else if (lowerMessage.includes('access denied')) {
      return 'Access denied. You must grant permission to continue.';
    } else if (lowerMessage.includes('popup')) {
      return 'Popup blocked. Please allow popups for this site and try again.';
    } else if (lowerMessage.includes('rate limit')) {
      return 'Too many requests. Please wait a moment and try again.';
    } else if (lowerMessage.includes('weak password')) {
      return 'Password is too weak. Please use a stronger password.';
    } else if (lowerMessage.includes('email taken')) {
      return 'Email is already taken. Please use a different email or try signing in.';
    } else {
      // Return original message if no specific enhancement is available
      return message;
    }
  }
}

export const authService = new SupabaseAuthService();