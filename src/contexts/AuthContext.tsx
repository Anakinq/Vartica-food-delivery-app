import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { authService, databaseService, User as ServiceUser } from '../services';
import { Profile } from '../lib/supabase';
import { supabase } from '../lib/supabase/client';
import { ProfileWithVendor } from '../services/supabase/database.service';

interface AuthContextType {
  user: any | null;
  profile: ProfileWithVendor | null;
  loading: boolean;
  authLoading: boolean;
  vendorDataLoading: boolean;
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
  const [profile, setProfile] = useState<ProfileWithVendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [vendorDataLoading, setVendorDataLoading] = useState(false);
  const subscriptionRef = useRef<ReturnType<typeof databaseService.subscribeProfileWithVendor> | null>(null);

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

        console.log('Making database call to profiles table with ID:', supabaseUser.id);
        const result = await databaseService.selectSingle<Profile>({
          table: 'profiles',
          match: { id: supabaseUser.id },
        });

        console.log('=== DATABASE QUERY RESULT ===');
        console.log('Full result object:', result);
        console.log('Profile data from DB:', result.data);
        console.log('Database error:', result.error);
        console.log('Result type:', typeof result);
        console.log('Has data property:', 'data' in result);
        console.log('Has error property:', 'error' in result);

        profileData = result.data;
        error = result.error;

        console.log('=== PROFILE DATA ASSIGNMENT ===');
        console.log('profileData after assignment:', profileData);
        console.log('profileData type:', typeof profileData);
        console.log('profileData is null:', profileData === null);
        console.log('profileData is undefined:', profileData === undefined);
        console.log('profileData truthiness:', !!profileData);
        console.log('error:', error);
        console.log('error truthiness:', !!error);

        if (!profileData && attempts < 5) {
          console.log(`Profile not found yet (attempt ${attempts}), waiting 500ms...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log('Final profile fetch result after', attempts, 'attempts:', { profileData, error });
      console.log('=== FINAL CONDITION CHECK ===');
      console.log('error condition:', !!error);
      console.log('profileData condition:', !profileData);
      console.log('Combined condition (error || !profileData):', (error || !profileData));
      if (error || !profileData) {
        console.warn('Profile not found for user after all attempts:', supabaseUser.id, error);

        // Try to get user details from auth to see if we can create a basic profile
        console.log('Attempting profile fallback creation...');
        try {
          console.log('Fetching user from Supabase auth...');
          const { data: { user } } = await supabase.auth.getUser();
          console.log('Supabase auth user:', user);

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
            console.log('Attempting to insert profile into database...');
            console.log('Profile data being inserted:', basicProfile);
            const insertResult = await databaseService.insert({
              table: 'profiles',
              data: basicProfile
            });

            console.log('=== PROFILE INSERT RESULT ===');
            console.log('Insert result:', insertResult);
            console.log('Insert data:', insertResult.data);
            console.log('Insert error:', insertResult.error);
            console.log('Insert success:', !!insertResult.data);

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

  // Enhanced fetch profile with real-time subscription
  const enhancedFetchProfile = async (supabaseUser: any) => {
    console.log('enhancedFetchProfile called with user:', supabaseUser);
    if (!supabaseUser) {
      console.log('No user provided, setting profile to null');
      setProfile(null);
      setVendorDataLoading(false);
      return;
    }

    setVendorDataLoading(true);

    try {
      console.log('Fetching profile with vendor data for user ID:', supabaseUser.id);

      // Use the enhanced consolidated fetch method
      const result = await databaseService.fetchProfileWithVendor(supabaseUser.id);

      console.log('=== CONSOLIDATED FETCH RESULT ===');
      console.log('Full result object:', result);
      console.log('Profile+Vendor data:', result.data);
      console.log('Error:', result.error);

      if (result.error) {
        console.error('Error fetching profile with vendor:', result.error);
        // Fallback to existing fetchProfile method
        await fetchProfile(supabaseUser);
      } else if (result.data) {
        console.log('Profile with vendor data found and set:', result.data);
        setProfile(result.data);

        // Set up real-time subscription for this user
        setupRealTimeSubscription(supabaseUser.id);
      } else {
        console.warn('No profile data found for user:', supabaseUser.id);
        // Fallback to existing fetchProfile method
        await fetchProfile(supabaseUser);
      }
    } catch (err) {
      console.error('Error in enhanced fetchProfile:', err);
      // More detailed error logging
      if (err instanceof Error) {
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
      }
      setProfile(null);
      // Fallback to existing fetchProfile method
      await fetchProfile(supabaseUser);
    } finally {
      setVendorDataLoading(false);
      // Set overall loading to false when both auth and vendor data are loaded
      if (!authLoading) {
        setLoading(false);
      }
    }
  };

  // Set up real-time subscription for profile and vendor changes
  const setupRealTimeSubscription = (userId: string) => {
    try {
      // Clean up existing subscription
      if (subscriptionRef.current) {
        console.log('Cleaning up existing subscription for user:', userId);
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }

      console.log('Setting up real-time subscription for user:', userId);

      // Set up new subscription
      subscriptionRef.current = databaseService.subscribeProfileWithVendor(
        userId,
        (updatedProfile, error) => {
          if (error) {
            console.error('Real-time subscription error for user', userId, ':', error);
            // Handle subscription errors - maybe retry or notify user
            return;
          }

          if (updatedProfile) {
            console.log('Profile updated via real-time subscription for user', userId, ':', updatedProfile);
            setProfile(updatedProfile);
          } else {
            console.log('Profile deleted or no longer exists for user:', userId);
            setProfile(null);
          }
        }
      );

      console.log('Real-time subscription successfully set up for user:', userId);
    } catch (err) {
      console.error('Error setting up real-time subscription for user', userId, ':', err);
      // Don't let subscription errors break the main flow
      if (err instanceof Error) {
        console.error('Subscription error details:', err.name, err.message);
      }
    }
  };

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      // Use enhanced fetch for real-time updates
      await enhancedFetchProfile(user);
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
          enhancedFetchProfile(data.session?.user ?? null);
        } else {
          setProfile(null);
          setVendorDataLoading(false);
        }
      } catch (err) {
        console.error('Error loading initial session:', err);
      } finally {
        if (isMounted) {
          console.log('Setting auth loading to false after initial session load');
          setAuthLoading(false);
          // Keep overall loading true until vendor data is loaded
          if (!vendorDataLoading) {
            setLoading(false);
          }
        }
      }
    };

    loadInitialSession();

    // Supabase auth state listener (ONE listener total)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('=== AUTH STATE CHANGED ===');
      console.log('Event type:', event);
      console.log('Session data:', session);
      console.log('User in session:', session?.user);
      console.log('Session expires at:', session?.expires_at);
      if (!isMounted) {
        console.log('Component not mounted, ignoring auth state change');
        return;
      }

      // Convert Supabase user to our format
      const userData = session?.user ? {
        id: session.user.id,
        email: session.user.email || null,
      } : null;

      console.log('Processing auth state change - setting user:', userData);
      console.log('User ID:', userData?.id);
      console.log('User email:', userData?.email);
      // Handle all auth events consistently
      setUser(userData);
      // Don't wait for profile to load, just fetch it async
      if (userData) {
        console.log('Fetching enhanced profile for user:', userData.id);
        enhancedFetchProfile(session?.user ?? null);
      } else {
        console.log('No user data, setting profile to null');
        setProfile(null);
        setVendorDataLoading(false);
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
    console.log('=== AUTHCONTEXT SIGNIN FUNCTION STARTED ===');
    console.log('Email parameter:', email);
    console.log('Password parameter length:', password.length);
    setLoading(true);
    try {
      console.log('Attempting to sign in with Supabase...');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      console.log('Supabase signIn result:', { data, error });
      console.log('Session data:', data?.session);
      console.log('User data from Supabase:', data?.user);

      if (error) {
        console.error('❌ Supabase signIn error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        setLoading(false);
        throw error;
      }

      console.log('✅ Sign in successful, waiting for auth state change...');
      console.log('User ID from response:', data?.user?.id);
      console.log('User email from response:', data?.user?.email);
      // Let the auth state listener handle user/profile updates
    } catch (err) {
      console.error('❌ Error in signIn function:', err);
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
      if (process.env.NODE_ENV === 'development') {
        console.log('AuthContext: signUp called with params:', {
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
      }

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
    setAuthLoading(true);
    setVendorDataLoading(true);

    try {
      // Clean up real-time subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }

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
      setAuthLoading(false);
      setVendorDataLoading(false);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        authLoading,
        vendorDataLoading,
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