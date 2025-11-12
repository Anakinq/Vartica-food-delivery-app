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
  const fetchUserAndProfile = async (sessionUser: ServiceUser | null) => {
    if (!sessionUser) {
      setUser(null);
      setProfile(null);
      return;
    }

    try {
      setUser(sessionUser);
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
      } else if (event.event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
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

  // ✅ Sign up (with auto-login + profile sync)
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: 'customer' | 'cafeteria' | 'vendor' | 'delivery_agent' | 'admin',
    phone?: string
  ) => {
    setLoading(true);
    try {
      // 1️⃣ Sign up (creates auth user)
      const { user: newUser, error: signUpError } = await authService.signUp({ email, password });
      if (signUpError || !newUser) {
        throw signUpError || new Error('User creation failed');
      }

      // 2️⃣ Create profile
      const { error: profileError } = await databaseService.insert<Profile>({
        table: 'profiles',
        data: {
          id: newUser.id,
          email,
          full_name: fullName,
          role,
          phone: phone || null,
        },
      });

      if (profileError) {
        // 🧹 Clean up: sign out the half-created user to avoid orphaned auth accounts
        await authService.signOut();
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      // 3️⃣ ✅ Auto-sign in to trigger onAuthStateChange & UI update
      const { error: signInError } = await authService.signIn({ email, password });
      if (signInError) {
        // Optional: try to clean up profile? (or let RLS handle it)
        console.warn('Sign-in after signup failed (profile exists but session missing)');
        throw signInError;
      }

      // 🌟 Let `onAuthStateChange` finish the job: set user + profile
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