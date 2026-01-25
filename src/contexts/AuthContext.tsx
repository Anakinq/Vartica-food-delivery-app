import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, databaseService, User as ServiceUser } from '../services';
import { Profile } from '../lib/supabase';
import { supabase } from '../lib/supabase/client';

interface AuthContextType {
  user: any | null;
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
  checkApprovalStatus: (userId: string, role: string) => Promise<boolean | null>;
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
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile only (no user reconstruction)
  const fetchProfile = async (supabaseUser: any) => {
    if (!supabaseUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data: profileData, error } = await databaseService.selectSingle<Profile>({
        table: 'profiles',
        match: { id: supabaseUser.id },
      });

      if (error || !profileData) {
        console.warn('Profile not found for user:', supabaseUser.id);
        setProfile(null);
      } else {
        setProfile(profileData);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const { data, error } = await databaseService.selectSingle<Profile>({
        table: 'profiles',
        match: { id: user.id },
      });
      if (!error) {
        setProfile(data);
      } else {
        console.error('Error refreshing profile:', error);
      }
    }
  };

  const checkApprovalStatus = async (userId: string, role: string) => {
    const { data, error } = await databaseService.selectSingle<{
      vendor_approved?: boolean | null;
      delivery_approved?: boolean | null;
    }>({
      table: 'profiles',
      match: { id: userId },
      columns: 'vendor_approved, delivery_approved'
    });

    if (error) {
      console.error('Error fetching approval status:', error);
      return null;
    }

    if (role === 'vendor') {
      return data?.vendor_approved ?? null;
    } else if (role === 'delivery_agent') {
      return data?.delivery_approved ?? null;
    }

    return null;
  };

  // Single auth state listener - the only source of truth
  useEffect(() => {
    let isMounted = true;

    // Supabase auth state listener (ONE listener total)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      console.log('Auth state changed:', event);

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // Set user from session (real Supabase user object)
        setUser(session?.user ?? null);
        // Fetch profile separately
        await fetchProfile(session?.user ?? null);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
      } else if (event === 'INITIAL_SESSION') {
        // Handle initial session on app load
        setUser(session?.user ?? null);
        await fetchProfile(session?.user ?? null);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Sign in
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await authService.signIn({ email, password });
      if (error) {
        setLoading(false);
        throw error;
      }
      // Let the auth state listener handle user/profile updates
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await authService.signInWithGoogle();
      if (error) {
        setLoading(false);
        throw error;
      }
      // OAuth flow will redirect the user
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  // Sign up
  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: 'customer' | 'cafeteria' | 'vendor' | 'delivery_agent' | 'admin',
    phone?: string
  ) => {
    setLoading(true);
    try {
      const { user: newUser, error: signUpError } = await authService.signUp({
        email,
        password,
        fullName,
        role,
        phone,
      });

      setLoading(false);
      if (signUpError) {
        throw signUpError;
      }
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  // Sign up with Google
  const signUpWithGoogle = async (role: 'customer' | 'vendor' | 'delivery_agent', phone?: string) => {
    setLoading(true);
    try {
      const { error } = await authService.signUpWithGoogle(role, phone);
      if (error) {
        setLoading(false);
        throw error;
      }
      // OAuth flow will redirect the user
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  // Link Google account with email/password
  const linkAccountWithEmailPassword = async (password: string) => {
    try {
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

  // Sign out
  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await authService.signOut();
      if (error) {
        throw error;
      }
      // Let the auth state listener handle cleanup
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
        checkApprovalStatus,
        linkAccountWithEmailPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};