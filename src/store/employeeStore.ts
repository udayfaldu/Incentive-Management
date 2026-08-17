import { create } from 'zustand';
import type { Employee } from '../types';
import {
  isSupabaseConfigured,
  fetchEmployeesFromSupabase,
  saveEmployeeToSupabase,
  deleteEmployeeFromSupabase,
  bulkImportEmployeesToSupabase,
  bulkSaveEmployeesToSupabase,
} from '../lib/supabase';

interface EmployeeState {
  employees: Employee[];
  loading: boolean;
  error: string | null;
  fetchEmployees: () => Promise<void>;
  addEmployee: (emp: Employee) => Promise<void>;
  updateEmployee: (emp: Employee) => Promise<void>;
  updateMultipleEmployees: (emps: Employee[]) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  bulkImport: (employees: Employee[], mode: 'replace' | 'merge') => Promise<void>;
}

export const useEmployeeStore = create<EmployeeState>((set, get) => ({
  employees: [],
  loading: false,
  error: null,

  fetchEmployees: async () => {
    set({ loading: true, error: null });
    try {
      if (isSupabaseConfigured) {
        const rawList = await fetchEmployeesFromSupabase();
        
        // We no longer recompute on load, we just use the raw list that has saved computations.
        set({ employees: rawList });
      } else {
        set({ employees: [] });
      }
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch employees' });
    } finally {
      set({ loading: false });
    }
  },

  addEmployee: async (emp) => {
    set({ loading: true, error: null });
    try {
      const cleanId = emp.employeeId.trim().toLowerCase();
      const existing = get().employees.find(
        (e) =>
          e.id === emp.id ||
          (e.employeeId.trim().toLowerCase() === cleanId &&
            e.month === emp.month &&
            e.year === emp.year)
      );

      const empToSave = existing ? { ...emp, id: existing.id } : emp;

      if (isSupabaseConfigured) {
        await saveEmployeeToSupabase(empToSave);
      }

      let nextEmployees: Employee[];
      if (existing) {
        nextEmployees = get().employees.map((e) => (e.id === existing.id ? empToSave : e));
      } else {
        nextEmployees = [...get().employees, empToSave];
      }

      set({ employees: nextEmployees });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to add employee' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  updateEmployee: async (emp) => {
    set({ loading: true, error: null });
    try {
      if (isSupabaseConfigured) {
        await saveEmployeeToSupabase(emp);
      }

      const nextEmployees = get().employees.map((e) => (e.id === emp.id ? emp : e));
      set({ employees: nextEmployees });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to update employee' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  updateMultipleEmployees: async (emps) => {
    set({ loading: true, error: null });
    try {
      if (isSupabaseConfigured) {
        await bulkSaveEmployeesToSupabase(emps);
      }

      const updatedMap = new Map(emps.map((e) => [e.id, e]));
      const nextEmployees = get().employees.map((e) => {
        const updated = updatedMap.get(e.id);
        return updated ? updated : e;
      });
      set({ employees: nextEmployees });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to update multiple employees' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  deleteEmployee: async (id) => {
    set({ loading: true, error: null });
    try {
      if (isSupabaseConfigured) {
        await deleteEmployeeFromSupabase(id);
      }

      const nextEmployees = get().employees.filter((e) => e.id !== id);
      set({ employees: nextEmployees });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to delete employee' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  bulkImport: async (newEmployees, mode) => {
    set({ loading: true, error: null });
    try {
      const existing = get().employees;
      let processedEmployees = [...newEmployees];

      if (mode === 'merge') {
        processedEmployees = newEmployees.map((newEmp) => {
          const match = existing.find(
            (e) =>
              e.employeeId.trim().toLowerCase() === newEmp.employeeId.trim().toLowerCase() &&
              e.month === newEmp.month &&
              e.year === newEmp.year
          );
          if (match) {
            return { ...newEmp, id: match.id };
          }
          return newEmp;
        });
      }

      if (isSupabaseConfigured) {
        await bulkImportEmployeesToSupabase(processedEmployees, mode);
      }

      let nextEmployees: Employee[] = [];
      if (mode === 'replace') {
        nextEmployees = processedEmployees;
      } else {
        const updatedIds = processedEmployees.map((emp) => emp.id);
        const remainingCurrent = existing.filter((emp) => !updatedIds.includes(emp.id));
        nextEmployees = [...remainingCurrent, ...processedEmployees];
      }

      set({ employees: nextEmployees });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to import employees' });
      throw err;
    } finally {
      set({ loading: false });
    }
  },


}));
