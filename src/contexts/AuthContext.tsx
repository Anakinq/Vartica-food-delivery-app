import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, databaseService, User as ServiceUser } from '../services';
import { Profile } from '../lib/supabase';

interface AuthContextType {
  user: ServiceUser | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: 'customer' | 'cafeteria' | 'vendor' | 'delivery_agent' | 'admin',
    phone?: string
  ) => Promise<void>;
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
      } else if (event.event === 'SIGNUP') {
        // Don't do anything special on signup - let the UI handle it
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // ✅ Sign in
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

  // ✅ Sign up (trigger will auto-create profile on email confirmation)
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: 'customer' | 'cafeteria' | 'vendor' | 'delivery_agent' | 'admin',
    phone?: string
  ) => {
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

      if (signUpError) {
        // Check if it's just a confirmation message
        if (signUpError.message.includes('check your email')) {
          // This is expected - don't throw an error, just return success
          // The UI will handle showing the confirmation message
          setLoading(false);
          return { user: newUser, error: null };
        }
        throw signUpError;
      }

      if (!newUser) {
        throw new Error('User creation failed');
      }

      // 2️⃣ If email is auto-confirmed, sign in to get session and profile
      try {
        const { error: signInError } = await authService.signIn({ email, password });
        if (signInError) {
          console.warn('Sign-in after signup failed:', signInError.message);
          throw new Error('Account created! Please sign in to continue.');
        }
        // 🌟 Let `onAuthStateChange` finish the job: set user + profile
      } catch (signInErr) {
        // If auto-sign-in fails, that's okay - user can sign in manually
        setLoading(false);
        throw signInErr;
      }
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
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
