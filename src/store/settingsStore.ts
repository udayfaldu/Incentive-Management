import { create } from 'zustand';
import type { IncentiveSettings } from '../types';
import {
  isSupabaseConfigured,
  fetchSettingsFromSupabase,
  saveSettingsToSupabase,
  resetSettingsFromSupabase,
  supabase,
} from '../lib/supabase';

export const DEFAULT_SETTINGS: IncentiveSettings = {
  minimumHours: 170,
  extendedTiers: [
    { id: 'tier-default-1', from: 170, to: 185, seniorAmount: 2000, juniorAmount: 1500 },
    { id: 'tier-default-2', from: 186, to: null, seniorAmount: 3500, juniorAmount: 2500 },
  ],
  weekendSenior: {
    halfDay: 750,
    fullDay: 1500,
  },
  weekendJunior: {
    halfDay: 500,
    fullDay: 1000,
  },
};

interface SettingsState {
  settingsByMonth: Record<string, IncentiveSettings>;
  loading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateSettingsForMonth: (month: number, year: number, updates: Partial<IncentiveSettings>) => Promise<void>;
  resetSettingsForMonth: (month: number, year: number) => Promise<void>;
  resetAllSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settingsByMonth: {},
  loading: false,
  error: null,

  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      if (isSupabaseConfigured) {
        const settings = await fetchSettingsFromSupabase();
        set({ settingsByMonth: settings });
      } else {
        set({ settingsByMonth: {} });
      }
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch settings' });
    } finally {
      set({ loading: false });
    }
  },

  updateSettingsForMonth: async (month, year, updates) => {
    set({ loading: true, error: null });
    const key = `${year}-${month}`;
    const current = get().settingsByMonth[key] || DEFAULT_SETTINGS;

    const updated: IncentiveSettings = {
      ...current,
      ...updates,
      weekendSenior: {
        ...current.weekendSenior,
        ...updates.weekendSenior,
      },
      weekendJunior: {
        ...current.weekendJunior,
        ...updates.weekendJunior,
      },
      extendedTiers: updates.extendedTiers
        ? updates.extendedTiers.map((t) => ({ ...t }))
        : current.extendedTiers.map((t) => ({ ...t })),
    };

    try {
      if (isSupabaseConfigured) {
        await saveSettingsToSupabase(month, year, updated);
      }

      // Sync state
      const nextSettings = {
        ...get().settingsByMonth,
        [key]: updated,
      };
      set({ settingsByMonth: nextSettings });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to update settings' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  resetSettingsForMonth: async (month, year) => {
    set({ loading: true, error: null });
    const key = `${year}-${month}`;
    try {
      if (isSupabaseConfigured) {
        await resetSettingsFromSupabase(month, year);
      }

      const nextSettings = { ...get().settingsByMonth };
      delete nextSettings[key];
      set({ settingsByMonth: nextSettings });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to reset settings' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  resetAllSettings: async () => {
    set({ loading: true, error: null });
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('settings')
          .delete()
          .neq('year', 0); // clear all
        if (error) throw error;
      }

      set({ settingsByMonth: {} });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to reset all settings' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },
}));
