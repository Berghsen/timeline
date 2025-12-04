import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    REACT_APP_SUPABASE_URL: supabaseUrl ? 'set' : 'missing',
    REACT_APP_SUPABASE_ANON_KEY: supabaseAnonKey ? 'set' : 'missing'
  });
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUserProfile(session.user).catch((error) => {
          console.error('Error fetching profile on mount:', error);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUserProfile(session.user).catch((error) => {
          console.error('Error fetching profile on auth change:', error);
          setUser(null);
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (authUser, throwOnError = false) => {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        // If profile doesn't exist, try to create it
        if (error.code === 'PGRST116') {
          console.warn('Profile not found, attempting to create...');
          const role = authUser.user_metadata?.role || 'employee';
          const fullName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || '';
          
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: authUser.id,
              email: authUser.email,
              full_name: fullName,
              role: role,
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
            const errorMsg = 'Profile not found and could not be created. Please contact an administrator.';
            if (throwOnError) {
              throw new Error(errorMsg);
            }
            setUser(null);
            return;
          }

          setUser({
            ...authUser,
            profile: newProfile,
          });
        } else {
          if (throwOnError) {
            throw error;
          }
          console.error('Error fetching profile:', error);
          setUser(null);
        }
      } else {
        setUser({
          ...authUser,
          profile,
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUser(null);
      if (throwOnError) {
        throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message || 'Invalid email or password');
    }

    if (data.user) {
      try {
        await fetchUserProfile(data.user, true); // Throw errors on sign in
      } catch (profileError) {
        // If profile fetch fails, sign out the user
        await supabase.auth.signOut();
        throw profileError;
      }
    }

    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  };

  const value = {
    user,
    loading,
    signIn,
    signOut,
    supabase,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

