import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { authService, databaseService, User as ServiceUser } from '../services';
import { Profile } from '../lib/supabase';
import { supabase } from '../lib/supabase/client';
import { ProfileWithVendor } from '../services/supabase/database.service';
import { notificationService } from '../services/notification.service';
import { validateSignupForm, validateLoginForm } from '../utils/validation';
import { RATE_LIMITS, checkRateLimit, RateLimitError, createRateLimiter } from '../utils/rateLimiter';

// Define proper user type for the app
export interface AppUser {
  id: string;
  email: string | null;
  created_at?: string;
  user_metadata?: {
    full_name?: string;
    role?: string;
    phone?: string;
  };
}

interface AuthContextType {
  user: AppUser | null;
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
  linkAccountWithEmailPassword: (password: string) => Promise<{ data: { user: ServiceUser | null }; error: Error | null } | { data: null; error: Error }>;
  // Multi-role functions
  addDeliveryAgentRole: (vehicleType?: string) => Promise<void>;
  addVendorRole: (storeName: string, vendorType?: string) => Promise<void>;
  hasRole: (role: 'customer' | 'vendor' | 'delivery_agent') => boolean;
  getUserRoles: () => string[];
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
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<ProfileWithVendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [vendorDataLoading, setVendorDataLoading] = useState(false);
  const [lastAuthAttempt, setLastAuthAttempt] = useState(0);
  const subscriptionRef = useRef<ReturnType<typeof databaseService.subscribeProfileWithVendor> | null>(null);

  // Debounce auth attempts to prevent rapid clicks
  const AUTH_COOLDOWN = 1000; // 1 second cooldown

  const canAttemptAuth = () => {
    const now = Date.now();
    return now - lastAuthAttempt > AUTH_COOLDOWN;
  };

  const setAuthAttempt = () => {
    setLastAuthAttempt(Date.now());
  };

  // Fetch profile only (no user reconstruction)
  const fetchProfile = async (supabaseUser: any) => {
    if (!supabaseUser) {
      setProfile(null);
      return;
    }

    try {
      // Single attempt with shorter timeout to avoid blocking
      const result = await databaseService.selectSingle<Profile>({
        table: 'profiles',
        match: { id: supabaseUser.id },
      });

      if (result.error) {
        setProfile(null);
      } else if (result.data) {
        setProfile(result.data);
      } else {
        // Create basic profile from auth data if needed
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && user.id === supabaseUser.id) {
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

                // Clear the sessionStorage after use
                window.sessionStorage.removeItem('oauth_role');
                window.sessionStorage.removeItem('oauth_phone');
              }
            } catch (storageError) {
              // Storage access failed, continue without stored data
            }

            const basicProfile = {
              id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
              role: oauthRole,
              phone: oauthPhone || user.user_metadata?.phone,
              created_at: new Date().toISOString(),
            };

            setProfile(basicProfile as ProfileWithVendor);
          } else {
            setProfile(null);
          }
        } catch (profileCreationErr) {
          console.error('Error during profile fallback:', profileCreationErr);
          setProfile(null);
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setProfile(null);
    }
  };

  // Enhanced fetch profile with real-time subscription
  const enhancedFetchProfile = async (supabaseUser: any) => {
    if (!supabaseUser) {
      setProfile(null);
      setVendorDataLoading(false);
      return;
    }

    setVendorDataLoading(true);

    try {
      // Use the enhanced consolidated fetch method
      const result = await databaseService.fetchProfileWithVendor(supabaseUser.id);

      if (result.error) {
        // Fallback to existing fetchProfile method
        await fetchProfile(supabaseUser);
      } else if (result.data) {
        setProfile(result.data);
        // Set up real-time subscription for this user
        setupRealTimeSubscription(supabaseUser.id);
      } else {
        // Fallback to existing fetchProfile method
        await fetchProfile(supabaseUser);
      }
    } catch (err) {
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
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }

      // Set up new subscription
      subscriptionRef.current = databaseService.subscribeProfileWithVendor(
        userId,
        (updatedProfile, error) => {
          if (error) {
            console.error('Real-time subscription error for user', userId, ':', error);
            return;
          }

          if (updatedProfile) {
            setProfile(updatedProfile);
          } else {
            setProfile(null);
          }
        }
      );
    } catch (err) {
      console.error('Error setting up real-time subscription for user', userId, ':', err);
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
    // Use the enhanced database service function
    return await databaseService.checkApprovalStatus(userId, role);
  };

  // Load initial session and set up auth state listener
  useEffect(() => {
    let isMounted = true;

    // Guard: Exit if Supabase is not initialized
    if (!supabase) {
      console.warn('Supabase client not initialized');
      setLoading(false);
      setAuthLoading(false);
      return;
    }

    // Load initial session first
    const loadInitialSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;

        // Convert Supabase user to our format
        const userData = data.session?.user ? {
          id: data.session.user.id,
          email: data.session.user.email || null,
        } : null;

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
          if (process.env.NODE_ENV === 'development') {
            console.log('Setting auth loading to false after initial session load');
          }
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
      if (!isMounted) {
        return;
      }

      // Convert Supabase user to our format
      const userData = session?.user ? {
        id: session.user.id,
        email: session.user.email || null,
      } : null;

      // Handle all auth events consistently
      setUser(userData);
      // Don't wait for profile to load, just fetch it async
      if (userData) {
        enhancedFetchProfile(session?.user ?? null);
      } else {
        setProfile(null);
        setVendorDataLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Sign in with rate limiting and debouncing
  const signIn = async (email: string, password: string) => {
    // Check debounce
    if (!canAttemptAuth()) {
      const error = new Error('Please wait before trying again');
      (error as any).code = 'AUTH_COOLDOWN';
      throw error;
    }

    setAuthAttempt();
    setLoading(true);

    try {
      // Apply rate limiting for login attempts
      const loginLimiter = createRateLimiter('login', RATE_LIMITS.LOGIN);
      const rateLimitResult = loginLimiter.check(email);

      if (!rateLimitResult.allowed) {
        setLoading(false);
        const error = new RateLimitError(
          `Too many login attempts. Please try again in ${rateLimitResult.retryAfter} seconds.`,
          rateLimitResult.retryAfter!,
          rateLimitResult.resetTime
        );
        throw error;
      }

      // Validate form data
      const formData = { email, password };
      const validationErrors = validateLoginForm(formData);
      if (validationErrors.length > 0) {
        setLoading(false);
        const error = new Error(validationErrors[0].message);
        (error as any).validationErrors = validationErrors;
        throw error;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setLoading(false);
        throw error;
      }

      // Force profile refresh after successful login
      // The auth state listener should trigger, but we also explicitly fetch to ensure
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      if (supabaseUser) {
        await enhancedFetchProfile(supabaseUser);
      }

      // Ensure loading is set to false
      setLoading(false);
    } catch (err) {
      console.error('Sign in error:', err);
      setLoading(false);
      throw err;
    }
  };

  // Sign in with Google (with debouncing)
  const signInWithGoogle = async () => {
    // Check debounce
    if (!canAttemptAuth()) {
      const error = new Error('Please wait before trying again');
      (error as any).code = 'AUTH_COOLDOWN';
      throw error;
    }

    setAuthAttempt();
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

  // Sign up (with debouncing)
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
    // Check debounce
    if (!canAttemptAuth()) {
      const error = new Error('Please wait before trying again');
      (error as any).code = 'AUTH_COOLDOWN';
      throw error;
    }

    setAuthAttempt();
    setLoading(true);
    try {
      // Validate form data
      const formData = {
        email,
        password,
        fullName,
        role,
        phone,
        storeName,
        matricNumber,
        department
      };

      const validationErrors = validateSignupForm(formData);
      if (validationErrors.length > 0) {
        setLoading(false);
        const error = new Error(validationErrors[0].message);
        (error as any).validationErrors = validationErrors;
        throw error;
      }

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

  // Sign up with Google (with debouncing)
  const signUpWithGoogle = async (role: 'customer' | 'vendor' | 'delivery_agent', phone?: string) => {
    // Check debounce
    if (!canAttemptAuth()) {
      const error = new Error('Please wait before trying again');
      (error as any).code = 'AUTH_COOLDOWN';
      throw error;
    }

    setAuthAttempt();
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
  const linkAccountWithEmailPassword = async (password: string): Promise<{ data: { user: ServiceUser | null }; error: Error | null } | { data: null; error: Error }> => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error('Error updating user password:', error);
        return { data: null, error };
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('Account linked with email/password successfully');
      }

      // Cast to match our User interface
      const user: ServiceUser | null = data.user ? {
        id: data.user.id,
        email: data.user.email || '',
      } : null;

      return { data: { user }, error: null };
    } catch (err) {
      console.error('Error linking account with email/password:', err);
      return { data: null, error: err as Error };
    }
  };

  // Add delivery agent role to existing user - using database RPC function
  const addDeliveryAgentRole = async (vehicleType: string = 'Foot') => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      console.log('[DeliveryAgent] Adding delivery agent role for user:', user.id, 'vehicleType:', vehicleType);

      // Call the database function which handles all inserts with SECURITY DEFINER
      const { data, error } = await supabase.rpc('add_delivery_agent_role', {
        user_id: user.id,
        vehicle_type: vehicleType
      });

      console.log('[DeliveryAgent] RPC result:', { data, error });

      if (error) {
        throw new Error(error.message);
      }

      // Check if the RPC returned an error in the JSON response
      if (data && typeof data === 'object' && !data.success) {
        throw new Error(data.message || 'Failed to register as delivery agent');
      }

      // Get the agent ID
      const { data: agentData } = await supabase
        .from('delivery_agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const agentId = agentData?.id || 'unknown';

      // Send notification to admins about new delivery agent registration
      await notificationService.sendDeliveryAgentRegistrationNotification(
        user.id,
        agentId,
        vehicleType
      );

      // Refresh profile to get updated role
      await refreshProfile();
      console.log('[DeliveryAgent] Successfully registered as delivery agent');
    } catch (err) {
      console.error('Error adding delivery agent role:', err);
      throw err;
    }
  };

  // Add vendor role to existing user
  const addVendorRole = async (storeName: string, vendorType: string = 'student') => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const { error } = await supabase.rpc('add_vendor_role', {
        user_id: user.id,
        store_name: storeName,
        vendor_type: vendorType
      });

      if (error) {
        throw error;
      }

      // Refresh profile to get updated roles
      await refreshProfile();
    } catch (err) {
      console.error('Error adding vendor role:', err);
      throw err;
    }
  };

  // Check if user has a specific role
  const hasRole = (role: 'customer' | 'vendor' | 'delivery_agent'): boolean => {
    if (!profile) return false;

    switch (role) {
      case 'vendor':
        return (profile as any).is_vendor || ['vendor', 'late_night_vendor'].includes(profile.role);
      case 'delivery_agent':
        return (profile as any).is_delivery_agent || profile.role === 'delivery_agent';
      case 'customer':
        return true; // Everyone is a customer by default
      default:
        return false;
    }
  };

  // Get all user roles
  const getUserRoles = (): string[] => {
    const roles = ['customer'];
    if (hasRole('vendor')) roles.push('vendor');
    if (hasRole('delivery_agent')) roles.push('delivery_agent');
    return roles;
  };

  // Sign out
  const signOut = async () => {
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
        throw error;
      }

      // Reset all state variables after successful signout
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('Sign out error:', err);
      throw err;
    } finally {
      // Always reset loading states
      setLoading(false);
      setAuthLoading(false);
      setVendorDataLoading(false);
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
        addDeliveryAgentRole,
        addVendorRole,
        hasRole,
        getUserRoles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};