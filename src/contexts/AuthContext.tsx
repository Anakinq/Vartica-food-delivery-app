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
  checkApprovalStatus: (userId: string, role: string) => Promise<boolean | null>;
  linkAccountWithEmailPassword: (password: string) => Promise<{ data: any; error: Error | null } | { data: null; error: Error }>;
  refreshSessionIfNeeded: () => Promise<boolean>;
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

      if (error || !profileData) {
        console.warn('Profile not found, attempting to create profile for user:', sessionUser.id);

        // Try to get user details from Supabase auth
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();

        if (authUser && authUser.id === sessionUser.id) {
          // Create profile with user's auth metadata
          const userRole = (authUser.user_metadata?.role as string) || 'customer';
          // Ensure role is of the correct type
          const validRoles: Array<'customer' | 'cafeteria' | 'vendor' | 'late_night_vendor' | 'delivery_agent' | 'admin'> =
            ['customer', 'cafeteria', 'vendor', 'late_night_vendor', 'delivery_agent', 'admin'];
          const profileRole = validRoles.includes(userRole as any) ? userRole as any : 'customer';

          const userProfile: Profile = {
            id: authUser.id,
            email: authUser.email || '',
            full_name: (authUser.user_metadata?.full_name as string) || (authUser.user_metadata?.name as string) || 'User',
            role: profileRole,
            phone: (authUser.user_metadata?.phone as string),
            created_at: new Date().toISOString(),
            ...(authUser.user_metadata?.role === 'vendor' && { vendor_approved: false }),
            ...(authUser.user_metadata?.role === 'delivery_agent' && { delivery_approved: false }),
          };

          const { error: insertError } = await databaseService.insert<Profile>({
            table: 'profiles',
            data: userProfile,
          });

          if (insertError) {
            console.error('Error creating profile:', insertError);
            setProfile(null);
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.log('Profile created successfully:', userProfile);
            }
            setProfile(userProfile);

            // Create role-specific records if needed
            if (userProfile.role === 'vendor') {
              const { error: vendorError } = await databaseService.insert({
                table: 'vendors',
                data: {
                  user_id: authUser.id,
                  store_name: userProfile.full_name,
                  description: 'New vendor account',
                  vendor_type: (authUser.user_metadata?.vendor_type as string) || 'student',
                  is_active: false, // Initially inactive until approved
                },
              });

              if (vendorError) {
                console.error('Error creating vendor record:', vendorError);
              }
            } else if (userProfile.role === 'delivery_agent') {
              const { error: deliveryError } = await databaseService.insert({
                table: 'delivery_agents',
                data: {
                  user_id: authUser.id,
                  vehicle_type: (authUser.user_metadata?.vehicle_type as string) || 'Bike',
                  is_available: false,
                  active_orders_count: 0,
                  total_deliveries: 0,
                  rating: 0.0,
                },
              });

              if (deliveryError) {
                console.error('Error creating delivery agent record:', deliveryError);
              }
            }
          }
        } else {
          console.warn('Could not retrieve user from auth:', userError);
          setProfile(null);
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('Profile fetched successfully:', profileData);
        }
        setProfile(profileData);
      }
    } catch (err) {
      console.error('Error fetching user and profile:', err);
      // Set a minimal profile to prevent indefinite loading state
      const minimalProfile: Profile = {
        id: sessionUser.id,
        email: sessionUser.email || '',
        full_name: 'User',
        role: 'customer', // Default role
        phone: undefined,
        created_at: new Date().toISOString(),
      };
      setProfile(minimalProfile);
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

  const refreshSessionIfNeeded = async (): Promise<boolean> => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!session || sessionError) {
        console.log('No active session found, attempting refresh...');

        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshedSession) {
          console.error('Session refresh failed:', refreshError);
          return false;
        }

        // Update user and profile with refreshed session
        const userObj = refreshedSession.user ? {
          id: refreshedSession.user.id,
          email: refreshedSession.user.email || ''
        } : null;
        await fetchUserAndProfile(userObj, true);
        console.log('Session refreshed successfully');
        return true;
      }

      // Check if session is close to expiring
      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);

      // Refresh if token expires in less than 30 minutes
      if (expiresAt && expiresAt - now < 1800) {
        console.log('Session nearing expiration, refreshing...');

        const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
        if (error) {
          console.warn('Session refresh failed:', error);
          return false;
        } else if (refreshedSession) {
          // Update user and profile with refreshed session
          const userObj = refreshedSession.user ? {
            id: refreshedSession.user.id,
            email: refreshedSession.user.email || ''
          } : null;
          await fetchUserAndProfile(userObj, true);
          console.log('Session refreshed successfully');
          return true;
        }
      }

      return true; // Session is valid
    } catch (error) {
      console.error('Error during session refresh check:', error);
      return false;
    }
  };

  const checkApprovalStatus = async (userId: string, role: string) => {
    if (!user) return null;

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

  // 🔄 Sync auth state (initial + real-time)
  useEffect(() => {
    let isMounted = true;
    let refreshInterval: NodeJS.Timeout;

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

    // Set up periodic session refresh (every 15 minutes)
    const setupPeriodicRefresh = () => {
      refreshInterval = setInterval(async () => {
        if (!isMounted) return;

        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            // Refresh the session if it's close to expiring
            const expiresAt = session.expires_at;
            const now = Math.floor(Date.now() / 1000);

            // Refresh if token expires in less than 30 minutes
            if (expiresAt && expiresAt - now < 1800) {
              if (process.env.NODE_ENV === 'development') {
                console.log('Refreshing session automatically before expiration');
              }

              const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
              if (error) {
                console.warn('Automatic session refresh failed:', error);
              } else if (refreshedSession) {
                if (process.env.NODE_ENV === 'development') {
                  console.log('Session refreshed automatically');
                }
                // Update user and profile with refreshed session
                const userObj = refreshedSession.user ? {
                  id: refreshedSession.user.id,
                  email: refreshedSession.user.email || ''
                } : null;
                await fetchUserAndProfile(userObj, true);
              }
            }
          }
        } catch (error) {
          console.error('Error during periodic session refresh:', error);
        }
      }, 15 * 60 * 1000); // 15 minutes
    };

    setupPeriodicRefresh();

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

    // Listen for 401 errors globally and refresh session
    const handleUnauthenticated = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.refreshSession();
        if (error) {
          console.warn('Session refresh failed, user may need to re-authenticate:', error);
        } else if (session) {
          // Update user and profile with refreshed session
          const userObj = session.user ? {
            id: session.user.id,
            email: session.user.email || ''
          } : null;
          await fetchUserAndProfile(userObj, true); // skipUserSet=true to avoid redundant state update
        }
      } catch (refreshError) {
        console.error('Error during session refresh:', refreshError);
      }
    };

    // Subscribe to Supabase auth state changes to handle session expiration
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        if (process.env.NODE_ENV === 'development') {
          console.log('Token refreshed successfully');
        }
        // Update user and profile with new session
        const userObj = session?.user ? {
          id: session.user.id,
          email: session.user.email || ''
        } : null;
        await fetchUserAndProfile(userObj, true);
      } else if (event === 'SIGNED_OUT') {
        // Already handled in authService listener above
      }
    });

    // Add event listener for auth errors
    const handleAuthError = () => {
      if (isMounted) {
        signOut();
      }
    };

    window.addEventListener('authError', handleAuthError);

    return () => {
      console.log('AuthContext cleanup');
      isMounted = false;
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      unsubscribe();
      subscription?.unsubscribe();
      window.removeEventListener('authError', handleAuthError);
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
        checkApprovalStatus,
        linkAccountWithEmailPassword,
        refreshSessionIfNeeded,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};