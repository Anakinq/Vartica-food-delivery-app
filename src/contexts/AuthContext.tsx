import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, databaseService, User as ServiceUser } from '../services';
import { Profile } from '../lib/supabase';

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
  signUpWithGoogle: (role: 'customer' | 'vendor' | 'delivery_agent') => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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
    console.log('fetchUserAndProfile called with:', { sessionUser, skipUserSet });
    if (!sessionUser) {
      console.log('No session user, clearing user and profile');
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
        console.log('Profile fetched successfully:', profileData);
        setProfile(profileData);
      }
    } catch (err) {
      console.error('Error fetching user and profile:', err);
      // Error fetching user and profile
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    console.log('refreshProfile called');
    if (user) {
      const { data, error } = await databaseService.selectSingle<Profile>({
        table: 'profiles',
        match: { id: user.id },
      });
      if (!error) {
        console.log('Profile refreshed:', data);
        setProfile(data);
      } else {
        console.error('Error refreshing profile:', error);
      }
    }
  };

  // 🔄 Sync auth state (initial + real-time)
  useEffect(() => {
    let isMounted = true;
    console.log('AuthContext useEffect initialized');

    // 1️⃣ Initial load
    const initAuth = async () => {
      console.log('initAuth called');
      try {
        const { session, error } = await authService.getSession();
        if (error) {
          console.error('Auth session error (possibly due to storage access blocked):', error);
        }
        console.log('Initial session:', session);
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
      console.log('Auth state change event received:', event);
      if (!isMounted) return;

      if (event.event === 'SIGNED_IN' || event.event === 'USER_UPDATED') {
        console.log('User signed in or updated');
        await fetchUserAndProfile(event.session?.user ?? null);
        setLoading(false); // ✅ Set loading to false after sign-in completes
      } else if (event.event === 'SIGNED_OUT') {
        console.log('User signed out');
        setUser(null);
        setProfile(null);
        setLoading(false); // ✅ Set loading to false after sign-out completes
      } else if (event.event === 'SIGNUP') {
        console.log('User signed up');
        // Don't do anything special on signup - let the UI handle it
        setLoading(false);
      } else if (event.event === 'MFA_CHALLENGE_VERIFIED' || event.event === 'PASSWORD_RECOVERY' || event.event === 'TOKEN_REFRESHED' || event.event === 'USER_DELETED') {
        console.log('Other auth event:', event.event);
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
    console.log('signIn called with:', { email });
    setLoading(true);
    try {
      const { error } = await authService.signIn({ email, password });
      if (error) {
        console.error('SignIn error:', error);
        setLoading(false);
        throw error;
      }
      // 🎯 `onAuthStateChange` will handle state sync — no need to setUser here
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  // ✅ Sign in with Google
  const signInWithGoogle = async () => {
    console.log('signInWithGoogle called');
    setLoading(true);
    try {
      const { error } = await authService.signInWithGoogle();
      if (error) {
        console.error('Google SignIn error:', error);
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
    console.log('signUp called with params:', { email, password, fullName, role, phone });
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

      console.log('signUp result:', { user: newUser, error: signUpError });
      // Return the result to let the UI handle success or error states
      setLoading(false);
      return { user: newUser, error: signUpError };
    } catch (err) {
      console.log('signUp error:', err);
      // Return the error to let the UI handle it
      setLoading(false);
      return { user: null, error: err as Error };
    }
  };

  // ✅ Sign up with Google
  const signUpWithGoogle = async (role: 'customer' | 'vendor' | 'delivery_agent') => {
    console.log('signUpWithGoogle called with role:', role);
    setLoading(true);
    try {
      const { error } = await authService.signUpWithGoogle(role);
      if (error) {
        console.error('Google SignUp error:', error);
        throw error;
      }
      // 🎯 OAuth flow will redirect the user
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  // ✅ Sign out
  const signOut = async () => {
    console.log('signOut called');
    setLoading(true);
    try {
      const { error } = await authService.signOut();
      if (error) {
        console.error('SignOut error:', error);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};