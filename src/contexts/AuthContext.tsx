import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, databaseService, User as ServiceUser } from '../services';
import { Profile } from '../lib/supabase';
import { supabase } from '../lib/supabase/client';

interface AuthContextType {
  user: ServiceUser | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: 'customer' | 'cafeteria' | 'vendor' | 'delivery_agent' | 'admin',
    phone?: string
  ) => Promise<void>;
  signUpWithGoogle: (role: 'customer' | 'vendor' | 'delivery_agent', phone?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  linkAccountWithEmailPassword: (password: string) => Promise<{ data: any; error: Error | null } | { data: null; error: Error }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ServiceUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔁 Unified fetch: user + profile
  const fetchUserAndProfile = async (sessionUser: ServiceUser | null, skipUserSet: boolean = false) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('fetchUserAndProfile called with:', { sessionUser, skipUserSet });
    }
    if (!sessionUser) {
      if (process.env.NODE_ENV === 'development') {
        console.log('No session user, clearing user and profile');
      }
      setUser(null);
      setProfile(null);
      return;
    }

    try {
      // Only set user state if not skipping
      if (!skipUserSet) {
        console.log('Setting user state');
        setUser(sessionUser);
      }
      const { data: profileData, error } = await databaseService.selectSingle<Profile>({
        table: 'profiles',
        match: { id: sessionUser.id },
      });

      if (error) {
        console.warn('Profile fetch failed (continuing without profile):', error.message);
        setProfile(null);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('Profile fetched successfully:', profileData);
        }
        setProfile(profileData);
      }
    } catch (err) {
      console.error('Error fetching user and profile:', err);
      // Error fetching user and profile
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('refreshProfile called');
    }
    if (user) {
      const { data, error } = await databaseService.selectSingle<Profile>({
        table: 'profiles',
        match: { id: user.id },
      });
      if (!error) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Profile refreshed:', data);
        }
        setProfile(data);
      } else {
        console.error('Error refreshing profile:', error);
      }
    }
  };

  // 🔄 Sync auth state (initial + real-time)
  useEffect(() => {
    let isMounted = true;
    if (process.env.NODE_ENV === 'development') {
      console.log('AuthContext useEffect initialized');
    }

    // 1️⃣ Initial load
    const initAuth = async () => {
      console.log('initAuth called');
      try {
        const { session, error } = await authService.getSession();
        if (error) {
          console.error('Auth session error (possibly due to storage access blocked):', error);
        }
        if (process.env.NODE_ENV === 'development') {
          console.log('Initial session:', session);
        }
        if (isMounted) {
          await fetchUserAndProfile(session?.user ?? null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error during auth initialization:', err);
        // Even if session retrieval fails, set loading to false to avoid infinite loading
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // 2️⃣ Real-time listener
    const { unsubscribe } = authService.onAuthStateChange(async (event) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Auth state change event received:', event);
      }
      if (!isMounted) return;

      if (event.event === 'SIGNED_IN' || event.event === 'USER_UPDATED') {
        if (process.env.NODE_ENV === 'development') {
          console.log('User signed in or updated');
        }

        // Check if this is an OAuth sign-in and we have a stored role
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            const storedRole = window.localStorage.getItem('oauth_role');
            if (storedRole && event.session?.user) {
              // Remove the stored role to prevent it from being used again
              window.localStorage.removeItem('oauth_role');

              // Check if the user already has a profile with a role
              const { data: existingProfile, error: profileError } = await databaseService.selectSingle<Profile>({
                table: 'profiles',
                match: { id: event.session.user.id },
              });

              if (!existingProfile && !profileError) {
                // If no profile exists yet, create one with the stored role
                // First check if there's a phone number stored from OAuth signup
                let storedPhone = null;
                try {
                  if (typeof window !== 'undefined' && window.localStorage) {
                    storedPhone = window.localStorage.getItem('oauth_phone');
                    // Remove the stored phone to prevent it from being used again
                    window.localStorage.removeItem('oauth_phone');
                  }
                } catch (storageError) {
                  console.warn('Storage access error when checking for OAuth phone:', storageError);
                }

                const { error: insertError } = await databaseService.insert<Profile>({
                  table: 'profiles',
                  data: {
                    id: event.session.user.id,
                    email: event.session.user.email || '',
                    full_name: (event.session.user as any).user_metadata?.full_name || 'User',
                    role: storedRole as any,
                    phone: storedPhone || (event.session.user as any).user_metadata?.phone || null,
                    created_at: new Date().toISOString(),
                  },
                });

                if (insertError) {
                  console.error('Error creating profile with stored role:', insertError);
                } else {
                  if (process.env.NODE_ENV === 'development') {
                    console.log('Profile created with stored role:', storedRole);
                  }
                }
              } else if (existingProfile && existingProfile.role !== storedRole) {
                // If profile exists but has wrong role, update it
                const { error: updateError } = await databaseService.update<Profile>({
                  table: 'profiles',
                  data: { role: storedRole as any },
                  match: { id: event.session.user.id },
                });

                if (updateError) {
                  console.error('Error updating profile role:', updateError);
                } else {
                  if (process.env.NODE_ENV === 'development') {
                    console.log('Profile role updated to:', storedRole);
                  }
                }
              }
            }
          } catch (storageError) {
            console.warn('Storage access error when checking for OAuth role:', storageError);
          }
        }

        await fetchUserAndProfile(event.session?.user ?? null);
        setLoading(false); // ✅ Set loading to false after sign-in completes
      } else if (event.event === 'SIGNED_OUT') {
        if (process.env.NODE_ENV === 'development') {
          console.log('User signed out');
        }
        setUser(null);
        setProfile(null);
        setLoading(false); // ✅ Set loading to false after sign-out completes
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('Other auth event:', event.event);
        }
        // For other events, ensure loading is set to false
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      console.log('AuthContext cleanup');
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // ✅ Sign in
  const signIn = async (email: string, password: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('signIn called with:', { email });
    }
    setLoading(true);
    try {
      const { error } = await authService.signIn({ email, password });
      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('SignIn error:', error);
        }
        setLoading(false);

        // Provide more detailed error information
        let errorMessage = error.message || 'Failed to sign in';

        // Check for specific error codes and provide more helpful messages
        if (error.message?.includes('400')) {
          errorMessage = 'Invalid email or password.';
        } else if (error.message?.includes('401')) {
          errorMessage = 'Invalid credentials. Please check your email and password.';
        } else if (error.message?.includes('429')) {
          errorMessage = 'Too many requests. Please try again later.';
        }

        const errorWithDetails = new Error(errorMessage);
        (errorWithDetails as any).originalError = error;
        throw errorWithDetails;
      }
      // 🎯 `onAuthStateChange` will handle state sync — no need to setUser here
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  // ✅ Sign in with Google
  const signInWithGoogle = async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('signInWithGoogle called');
    }
    setLoading(true);
    try {
      const { error } = await authService.signInWithGoogle();
      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Google SignIn error:', error);
        }
        setLoading(false);
        throw error;
      }
      // 🎯 OAuth flow will redirect the user
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  // ✅ Sign up (trigger will auto-create profile on email confirmation)
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: 'customer' | 'cafeteria' | 'vendor' | 'delivery_agent' | 'admin',
    phone?: string
  ) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('signUp called with params:', { email, password, fullName, role, phone });
    }
    setLoading(true);
    try {
      // 1️⃣ Sign up with metadata (database trigger will create profile after email confirmation)
      const { user: newUser, error: signUpError } = await authService.signUp({
        email,
        password,
        fullName,
        role,
        phone,
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('signUp result:', { user: newUser, error: signUpError });
      }
      // Handle success or error states in the UI
      setLoading(false);
      if (signUpError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Detailed signup error:', signUpError);
        }
        // Provide more detailed error information
        let errorMessage = signUpError.message || 'Failed to create account';

        // Check for specific error codes and provide more helpful messages
        if (signUpError.message?.includes('422')) {
          errorMessage = 'Invalid input provided. Please check your email and password.';
        } else if (signUpError.message?.includes('400')) {
          errorMessage = 'Invalid request. Please check your input.';
        } else if (signUpError.message?.includes('429')) {
          errorMessage = 'Too many requests. Please try again later.';
        } else if (signUpError.message?.includes('email')) {
          errorMessage = 'Invalid or already registered email address.';
        }

        const errorWithDetails = new Error(errorMessage);
        (errorWithDetails as any).originalError = signUpError;
        throw errorWithDetails;
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.log('signUp error:', err);
      }
      // Handle the error in the UI
      setLoading(false);
      throw err;
    }
  };

  // ✅ Sign up with Google
  const signUpWithGoogle = async (role: 'customer' | 'vendor' | 'delivery_agent', phone?: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('signUpWithGoogle called with role:', role, 'phone:', phone);
    }
    setLoading(true);
    try {
      const { error } = await authService.signUpWithGoogle(role, phone);
      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Google SignUp error:', error);
        }
        setLoading(false);
        throw error;
      }
      // 🎯 OAuth flow will redirect the user
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  // ✅ Link Google account with email/password
  const linkAccountWithEmailPassword = async (password: string) => {
    console.log('linkAccountWithEmailPassword called');
    try {
      // Update user's password to enable email/password sign-in
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error('Error updating user password:', error);
        throw error;
      }

      console.log('Account linked with email/password successfully');
      return { data, error: null };
    } catch (err) {
      console.error('Error linking account with email/password:', err);
      return { data: null, error: err as Error };
    }
  };

  // ✅ Sign out
  const signOut = async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('signOut called');
    }
    setLoading(true);
    try {
      const { error } = await authService.signOut();
      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('SignOut error:', error);
        }
        throw error;
      }
      // 🎯 `onAuthStateChange` → SIGNED_OUT → clears user/profile
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signInWithGoogle,
        signUp,
        signUpWithGoogle,
        signOut,
        refreshProfile,
        linkAccountWithEmailPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};