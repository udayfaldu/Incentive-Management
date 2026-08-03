import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface UserProfile {
  first_name: string;
  last_name: string;
  email: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  initializeAuth: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  signUp: (fname: string, lname: string, email: string, pass: string) => Promise<any>;
  signIn: (email: string, pass: string) => Promise<any>;
  signOut: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  resetPassword: (newPass: string) => Promise<void>;
  changePassword: (oldPass: string, newPass: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: false,
  initialized: false,
  error: null,

  initializeAuth: async () => {
    if (get().initialized) return;
    if (!supabase || !isSupabaseConfigured) {
      set({ initialized: true });
      return;
    }
    set({ loading: true });

    try {
      // Get current active session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        set({ session, user: session.user });
        await get().fetchProfile(session.user.id);
      }

      // Listen for auth state changes (sign in, sign out, etc.)
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (sessionStorage.getItem('is_signing_up') === 'true') {
          set({ session: null, user: null, profile: null, loading: false, initialized: true });
          return;
        }

        if (event === 'PASSWORD_RECOVERY') {
          set({ session: newSession, user: newSession?.user || null, initialized: true, loading: false });
          sessionStorage.setItem('is_recovering_password', 'true');
          window.location.href = '/reset-password';
          return;
        }

        if (newSession) {
          set({ session: newSession, user: newSession.user });
          await get().fetchProfile(newSession.user.id);
        } else {
          set({ session: null, user: null, profile: null });
          // Clear employee and settings store states on logout to prevent data leak
          try {
            const { useEmployeeStore } = await import('./employeeStore');
            const { useSettingsStore } = await import('./settingsStore');
            useEmployeeStore.setState({ employees: [] });
            useSettingsStore.setState({ settingsByMonth: {} });
          } catch (e) {
            console.error('Failed to clear stores on logout', e);
          }
        }
        set({ loading: false, initialized: true });
      });
    } catch (err: any) {
      console.error('Auth initialization error:', err);
    } finally {
      set({ loading: false, initialized: true });
    }
  },

  fetchProfile: async (userId: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        set({ profile: data });
      } else {
        // Fallback to user metadata
        const user = get().user;
        if (user) {
          set({
            profile: {
              first_name: user.user_metadata?.first_name || '',
              last_name: user.user_metadata?.last_name || '',
              email: user.email || '',
            },
          });
        }
      }
    } catch (e) {
      console.error('Failed to fetch user profile:', e);
    }
  },

  signUp: async (fname, lname, email, pass) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    set({ loading: true, error: null });
    sessionStorage.setItem('is_signing_up', 'true');
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            first_name: fname,
            last_name: lname,
          },
        },
      });

      if (error) throw error;

      // Immediately sign out to clear token from local state
      await supabase.auth.signOut();

      return data;
    } catch (err: any) {
      set({ error: err?.message || 'Registration failed' });
      throw err;
    } finally {
      sessionStorage.removeItem('is_signing_up');
      set({ loading: false });
    }
  },

  signIn: async (email, pass) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      set({ error: err?.message || 'Login failed' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    if (!supabase) return;
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ session: null, user: null, profile: null });
    } catch (err: any) {
      console.error('Logout error:', err);
    } finally {
      set({ loading: false });
    }
  },

  sendPasswordResetEmail: async (email) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    set({ loading: true, error: null });
    try {
      const redirectUrl = import.meta.env.VITE_RESET_PASSWORD_REDIRECT_URL || `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      if (error) throw error;
    } catch (err: any) {
      set({ error: err?.message || 'Failed to send password reset email' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  resetPassword: async (newPass) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPass,
      });
      if (error) throw error;
    } catch (err: any) {
      set({ error: err?.message || 'Failed to reset password' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  changePassword: async (oldPass, newPass) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    set({ loading: true });
    try {
      const email = get().user?.email;
      if (!email) throw new Error('No active user session found.');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

      // 1. Re-authenticate to verify old password via direct fetch to prevent session invalidation
      const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password: oldPass,
        }),
      });

      if (!response.ok) {
        let errorMsg = 'Incorrect old password.';
        try {
          const errJson = await response.json();
          errorMsg = errJson.msg || errJson.error_description || errorMsg;
        } catch (_) { }
        throw new Error(errorMsg);
      }

      // 2. Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPass,
      });
      if (updateError) throw updateError;
    } catch (err: any) {
      throw err;
    } finally {
      set({ loading: false });
    }
  },
}));
