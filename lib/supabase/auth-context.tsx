'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient, isSupabaseConfigured } from './client';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
}

export interface UserWorkspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  workspace: UserWorkspace | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    companyName: string
  ) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [workspace, setWorkspace] = useState<UserWorkspace | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const configured = isSupabaseConfigured();

  // Helper to set cookie for middleware session detection
  const setSessionCookie = (active: boolean) => {
    if (typeof document !== 'undefined') {
      if (active) {
        document.cookie = 'biharstack_auth_session=true; path=/; max-age=604800; SameSite=Lax';
      } else {
        document.cookie = 'biharstack_auth_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);

      if (configured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            setSessionCookie(true);
            await fetchProfileAndWorkspace(session.user.id);
          } else {
            setUser(null);
            setSessionCookie(false);
          }
        } catch (err) {
          console.error('Error fetching Supabase session:', err);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            if (session?.user) {
              setUser(session.user);
              setSessionCookie(true);
              await fetchProfileAndWorkspace(session.user.id);
            } else {
              setUser(null);
              setProfile(null);
              setWorkspace(null);
              setSessionCookie(false);
            }
            setLoading(false);
          }
        );

        setLoading(false);
        return () => {
          subscription.unsubscribe();
        };
      } else {
        // Fallback Local Storage Mode for seamless offline/local preview
        try {
          const savedUser = localStorage.getItem('biharstack_user');
          const savedWorkspace = localStorage.getItem('biharstack_workspace');

          if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
            setProfile({
              id: parsedUser.id,
              user_id: parsedUser.id,
              full_name: parsedUser.user_metadata?.full_name || 'Aditya Kumar',
            });
            if (savedWorkspace) {
              setWorkspace(JSON.parse(savedWorkspace));
            } else {
              setWorkspace({
                id: 'ws-demo-01',
                name: 'BiharStack AI Workspace',
                slug: 'biharstack-ai',
                plan: 'free',
                role: 'owner',
              });
            }
            setSessionCookie(true);
          } else {
            // Check if default demo user should be active initially
            setUser(null);
            setSessionCookie(false);
          }
        } catch {
          // LocalStorage unavailable
        }
        setLoading(false);
      }
    };

    initializeAuth();
  }, [configured]);

  const fetchProfileAndWorkspace = async (userId: string) => {
    try {
      // 1. Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // 2. Fetch Workspace Membership
      const { data: memberData } = await supabase
        .from('workspace_members')
        .select('role, workspaces (*)')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (memberData && memberData.workspaces) {
        const ws: any = memberData.workspaces;
        setWorkspace({
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          plan: ws.plan,
          role: memberData.role,
        });
      }
    } catch {
      // Gracefully handle query errors
    }
  };

  const signIn = async (email: string, password: string) => {
    if (configured) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }
      return {};
    } else {
      // Fallback local mode
      if (!email.includes('@') || password.length < 6) {
        return { error: 'Invalid email or password (min 6 characters).' };
      }

      const mockUserObj: any = {
        id: 'usr-' + Math.random().toString(36).substring(2, 9),
        email,
        user_metadata: {
          full_name: email.split('@')[0],
          company_name: 'My Workspace',
        },
      };

      setUser(mockUserObj);
      setProfile({
        id: mockUserObj.id,
        user_id: mockUserObj.id,
        full_name: mockUserObj.user_metadata.full_name,
      });
      setWorkspace({
        id: 'ws-' + Math.random().toString(36).substring(2, 9),
        name: 'My Workspace',
        slug: 'my-workspace',
        plan: 'free',
        role: 'owner',
      });

      localStorage.setItem('biharstack_user', JSON.stringify(mockUserObj));
      setSessionCookie(true);
      return {};
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    companyName: string
  ) => {
    if (configured) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            company_name: companyName,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      // If database trigger is configured, workspace and profile are auto-created.
      // We also verify direct insertion if session is established:
      if (data?.user) {
        try {
          const userId = data.user.id;
          const slug =
            companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') +
            '-' +
            userId.substring(0, 6);

          await supabase.from('profiles').upsert({
            id: userId,
            user_id: userId,
            full_name: fullName,
          });

          const { data: wsData } = await supabase
            .from('workspaces')
            .insert({
              name: companyName,
              slug,
              owner_id: userId,
              plan: 'free',
            })
            .select()
            .single();

          if (wsData) {
            await supabase.from('workspace_members').insert({
              workspace_id: wsData.id,
              user_id: userId,
              role: 'owner',
            });
          }
        } catch {
          // Trigger might have already handled it
        }
      }

      return {};
    } else {
      // Fallback local mode
      const mockUserObj: any = {
        id: 'usr-' + Math.random().toString(36).substring(2, 9),
        email,
        user_metadata: {
          full_name: fullName,
          company_name: companyName,
        },
      };

      const mockWs: UserWorkspace = {
        id: 'ws-' + Math.random().toString(36).substring(2, 9),
        name: companyName,
        slug: companyName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        plan: 'free',
        role: 'owner',
      };

      setUser(mockUserObj);
      setProfile({
        id: mockUserObj.id,
        user_id: mockUserObj.id,
        full_name: fullName,
      });
      setWorkspace(mockWs);

      localStorage.setItem('biharstack_user', JSON.stringify(mockUserObj));
      localStorage.setItem('biharstack_workspace', JSON.stringify(mockWs));
      setSessionCookie(true);
      return {};
    }
  };

  const signOut = async () => {
    if (configured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setWorkspace(null);
    localStorage.removeItem('biharstack_user');
    localStorage.removeItem('biharstack_workspace');
    setSessionCookie(false);
  };

  const resetPassword = async (email: string) => {
    if (configured) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) return { error: error.message };
      return {};
    } else {
      return {};
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        workspace,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
