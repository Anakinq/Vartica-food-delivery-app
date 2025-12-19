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
  ) => Promise<{ user: ServiceUser | null; error: Error | null }>;
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
    if (!sessionUser) {
      setUser(null);
      setProfile(null);
      return;
    }

    try {
      // Only set user state if not skipping
      if (!skipUserSet) {
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
        setProfile(profileData);
      }
    } catch (err) {
      // Error fetching user and profile
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const { data, error } = await databaseService.selectSingle<Profile>({
        table: 'profiles',
        match: { id: user.id },
      });
      if (!error) setProfile(data);
    }
  };

  // 🔄 Sync auth state (initial + real-time)
  useEffect(() => {
    let isMounted = true;

    // 1️⃣ Initial load
    const initAuth = async () => {
      const { session } = await authService.getSession();
      if (isMounted) {
        await fetchUserAndProfile(session?.user ?? null);
        setLoading(false);
      }
    };

    initAuth();

    // 2️⃣ Real-time listener
    const { unsubscribe } = authService.onAuthStateChange(async (event) => {
      if (!isMounted) return;

      if (event.event === 'SIGNED_IN' || event.event === 'USER_UPDATED') {
        await fetchUserAndProfile(event.session?.user ?? null);
        setLoading(false); // ✅ Set loading to false after sign-in completes
      } else if (event.event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false); // ✅ Set loading to false after sign-out completes
      } else if (event.event === 'TOKEN_REFRESHED') {
        // Don't do anything special on token refresh
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // ✅ Sign in with email and password
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await authService.signIn({ email, password });
      if (error) throw error;
      // 🎯 `onAuthStateChange` will handle state sync — no need to setUser here
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  // ✅ Sign in with Google
  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await authService.signInWithGoogle();
      if (error) throw error;
      // 🎯 `onAuthStateChange` will handle state sync — no need to setUser here
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  // ✅ Sign up with email and password (trigger will auto-create profile on email confirmation)
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: 'customer' | 'cafeteria' | 'vendor' | 'delivery_agent' | 'admin',
    phone?: string
  ) => {
    console.log('AuthContext signUp called with params:', { email, password, fullName, role, phone });
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

      console.log('AuthContext signUp result:', { user: newUser, error: signUpError });
      // Return the result to let the UI handle success or error states
      setLoading(false);
      return { user: newUser, error: signUpError };
    } catch (err) {
      console.log('AuthContext signUp error:', err);
      // Return the error to let the UI handle it
      setLoading(false);
      return { user: null, error: err as Error };
    }
  };

  // ✅ Sign up with Google
  const signUpWithGoogle = async (role: 'customer' | 'vendor' | 'delivery_agent') => {
    setLoading(true);
    try {
      const { error } = await authService.signUpWithGoogle(role);
      if (error) throw error;
      // 🎯 OAuth flow will redirect the user
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  // ✅ Sign out
  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await authService.signOut();
      if (error) throw error;
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