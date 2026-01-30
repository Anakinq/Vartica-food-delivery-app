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
    role: 'customer' | 'cafeteria' | 'vendor' | 'delivery_agent' | 'admin' | 'late_night_vendor',
    phone?: string,
    // Vendor-specific fields
    storeName?: string,
    storeDescription?: string,
    matricNumber?: string,
    department?: string,
    // Late night vendor fields
    availableFrom?: string,
    availableUntil?: string
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
    console.log('fetchProfile called with user:', supabaseUser);
    if (!supabaseUser) {
      console.log('No user provided, setting profile to null');
      setProfile(null);
      return;
    }

    try {
      console.log('Fetching profile for user ID:', supabaseUser.id);
      // Try multiple times with delays to handle potential race conditions
      let attempts = 0;
      let profileData = null;
      let error = null;

      while (attempts < 5 && !profileData) {
        attempts++;
        console.log(`Attempt ${attempts} to fetch profile for user:`, supabaseUser.id);

        const result = await databaseService.selectSingle<Profile>({
          table: 'profiles',
          match: { id: supabaseUser.id },
        });

        profileData = result.data;
        error = result.error;

        if (!profileData && attempts < 5) {
          console.log(`Profile not found yet (attempt ${attempts}), waiting 500ms...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log('Final profile fetch result after', attempts, 'attempts:', { profileData, error });
      if (error || !profileData) {
        console.warn('Profile not found for user after all attempts:', supabaseUser.id, error);

        // Try to get user details from auth to see if we can create a basic profile
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && user.id === supabaseUser.id) {
            // User exists in auth, but profile doesn't exist in DB
            // This might happen if email was confirmed but trigger didn't run
            console.log('User exists in auth but not in profiles table, attempting to create profile...');

            // Check for OAuth role in sessionStorage
            let oauthRole: 'customer' | 'cafeteria' | 'vendor' | 'delivery_agent' | 'admin' = 'customer';
            let oauthPhone = null;

            try {
              if (typeof window !== 'undefined' && window.sessionStorage) {
                const storedRole = window.sessionStorage.getItem('oauth_role');
                if (storedRole === 'vendor' || storedRole === 'delivery_agent' || storedRole === 'customer' || storedRole === 'cafeteria' || storedRole === 'admin') {
                  oauthRole = storedRole as 'customer' | 'cafeteria' | 'vendor' | 'delivery_agent' | 'admin';
                }
                oauthPhone = window.sessionStorage.getItem('oauth_phone');
                console.log('Found OAuth data - role:', oauthRole, 'phone:', oauthPhone);

                // Clear the sessionStorage after use
                window.sessionStorage.removeItem('oauth_role');
                window.sessionStorage.removeItem('oauth_phone');
              }
            } catch (storageError) {
              console.warn('Error accessing sessionStorage:', storageError);
            }

            // Try to create a basic profile record
            const basicProfile = {
              id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
              role: oauthRole, // Use OAuth role if available
              phone: oauthPhone || user.user_metadata?.phone,
              created_at: new Date().toISOString(),
            };

            console.log('Creating profile with data:', basicProfile);

            // Attempt to insert the profile
            const insertResult = await databaseService.insert({
              table: 'profiles',
              data: basicProfile
            });

            if (insertResult.data) {
              console.log('Profile created successfully:', insertResult.data[0]);
              setProfile(insertResult.data[0]);
            } else {
              console.error('Failed to create profile:', insertResult.error);
              setProfile(null);
            }
          } else {
            setProfile(null);
          }
        } catch (profileCreationErr) {
          console.error('Error during profile creation fallback:', profileCreationErr);
          setProfile(null);
        }
      } else {
        console.log('Profile found and set:', profileData);
        setProfile(profileData);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setProfile(null);
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

  // Load initial session and set up auth state listener
  useEffect(() => {
    let isMounted = true;

    // Load initial session first
    const loadInitialSession = async () => {
      console.log('Loading initial session...');
      try {
        const { data } = await supabase.auth.getSession();
        console.log('Initial session data:', data);
        if (!isMounted) return;

        // Convert Supabase user to our format
        const userData = data.session?.user ? {
          id: data.session.user.id,
          email: data.session.user.email || null,
        } : null;

        console.log('Setting user data:', userData);
        setUser(userData);
        // Don't wait for profile to load, just fetch it async
        if (userData) {
          fetchProfile(data.session?.user ?? null);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error('Error loading initial session:', err);
      } finally {
        if (isMounted) {
          console.log('Setting loading to false after initial session load');
          setLoading(false);
        }
      }
    };

    loadInitialSession();

    // Supabase auth state listener (ONE listener total)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session);
      if (!isMounted) return;

      // Convert Supabase user to our format
      const userData = session?.user ? {
        id: session.user.id,
        email: session.user.email || null,
      } : null;

      console.log('Processing auth state change - setting user:', userData);
      // Handle all auth events consistently
      setUser(userData);
      // Don't wait for profile to load, just fetch it async
      if (userData) {
        fetchProfile(session?.user ?? null);
      } else {
        setProfile(null);
      }
    });

    return () => {
      console.log('Cleaning up auth state listener');
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Sign in
  const signIn = async (email: string, password: string) => {
    console.log('signIn function called with email:', email);
    setLoading(true);
    try {
      console.log('Attempting to sign in with Supabase...');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      console.log('Supabase signIn result:', { data, error });

      if (error) {
        console.error('Supabase signIn error:', error);
        setLoading(false);
        throw error;
      }

      console.log('Sign in successful, waiting for auth state change...');
      // Let the auth state listener handle user/profile updates
    } catch (err) {
      console.error('Error in signIn function:', err);
      setLoading(false);
      throw err;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
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
    role: 'customer' | 'cafeteria' | 'vendor' | 'delivery_agent' | 'admin' | 'late_night_vendor',
    phone?: string,
    // Vendor-specific fields
    storeName?: string,
    storeDescription?: string,
    matricNumber?: string,
    department?: string,
    // Late night vendor fields
    availableFrom?: string,
    availableUntil?: string
  ) => {
    setLoading(true);
    try {
      const { user: userData, error: signUpError } = await authService.signUp({
        email,
        password,
        fullName,
        role,
        phone,
        storeName,
        storeDescription,
        matricNumber,
        department,
        availableFrom,
        availableUntil
      });

      if (signUpError) {
        setLoading(false);
        throw signUpError;
      }

      // If no error, the auth state listener will handle user/profile updates
      // The user data is already handled by the auth state listener
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  // Sign up with Google
  const signUpWithGoogle = async (role: 'customer' | 'vendor' | 'delivery_agent', phone?: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            role,
            phone: phone || '',
          },
        },
      });
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
    console.log('Sign out initiated');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        throw error;
      }
      console.log('Sign out successful, auth state listener will handle cleanup');
      // Let the auth state listener handle cleanup
    } catch (err) {
      console.error('Error during sign out:', err);
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