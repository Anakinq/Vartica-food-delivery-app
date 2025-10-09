import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, databaseService, User as ServiceUser } from '../services';
import { Profile } from '../lib/supabase';

interface AuthContextType {
  user: ServiceUser | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  // 👇 Explicitly type 'role' to match your schema
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ServiceUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await databaseService.selectSingle<Profile>({
      table: 'profiles',
      match: { id: userId },
    });

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    authService.getSession().then(({ session }) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
        }
        setLoading(false);
      })();
    });

    const { unsubscribe } = authService.onAuthStateChange((event) => {
      (async () => {
        setUser(event.session?.user ?? null);
        if (event.session?.user) {
          const profileData = await fetchProfile(event.session.user.id);
          setProfile(profileData);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await authService.signIn({ email, password });
    if (error) throw error;
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: 'customer' | 'cafeteria' | 'vendor' | 'delivery_agent' | 'admin',
    phone?: string
  ) => {
    const { user: newUser, error } = await authService.signUp({
      email,
      password,
    });

    if (error) throw error;
    if (!newUser) throw new Error('User creation failed');

    // 👇 Insert profile with correct role (now strongly typed)
    const { error: profileError } = await databaseService.insert<Profile>({
      table: 'profiles',
      data: {
        id: newUser.id,
        email,
        full_name: fullName,
        role, // ✅ Now guaranteed to be a valid role
        phone,
      },
    });

    if (profileError) throw new Error(profileError.message);
  };

  const signOut = async () => {
    const { error } = await authService.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};