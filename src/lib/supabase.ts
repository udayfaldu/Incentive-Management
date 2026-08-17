import { createClient } from '@supabase/supabase-js';
import type { IncentiveSettings, Employee } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper to get current authenticated user's ID
export async function getCurrentUserId(): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('User is not authenticated.');
  return user.id;
}

// ---------- Settings Operations ----------

export async function fetchSettingsFromSupabase(): Promise<Record<string, IncentiveSettings>> {
  if (!supabase) return {};

  const userId = await getCurrentUserId();

  const { data: settingsData, error: settingsError } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', userId)
    .eq('year', 9999)
    .eq('month', 12);

  if (settingsError) throw settingsError;

  const { data: tiersData, error: tiersError } = await supabase
    .from('extended_tiers')
    .select('*')
    .eq('user_id', userId)
    .eq('year', 9999)
    .eq('month', 12);

  if (tiersError) throw tiersError;

  const result: Record<string, IncentiveSettings> = {};

  for (const s of settingsData || []) {
    const key = `${s.year}-${s.month}`;
    const matchedTiers = (tiersData || [])
      .filter((t) => t.year === s.year && t.month === s.month)
      .map((t) => ({
        id: t.id,
        from: t.from,
        to: t.to,
        seniorAmount: Number(t.senior_amount),
        juniorAmount: Number(t.junior_amount),
      }));

    result[key] = {
      minimumHours: s.minimum_hours,
      weekendSenior: {
        halfDay: Number(s.weekend_senior_half),
        fullDay: Number(s.weekend_senior_full),
      },
      weekendJunior: {
        halfDay: Number(s.weekend_junior_half),
        fullDay: Number(s.weekend_junior_full),
      },
      extendedTiers: matchedTiers,
    };
  }

  return result;
}

export async function saveSettingsToSupabase(
  _month: number,
  _year: number,
  settings: IncentiveSettings
): Promise<void> {
  if (!supabase) return;

  const userId = await getCurrentUserId();

  const GLOBAL_YEAR = 9999;
  const GLOBAL_MONTH = 12;

  // 1. Upsert primary settings row
  const { error: settingsError } = await supabase
    .from('settings')
    .upsert({
      user_id: userId,
      year: GLOBAL_YEAR,
      month: GLOBAL_MONTH,
      minimum_hours: settings.minimumHours,
      weekend_senior_half: settings.weekendSenior.halfDay,
      weekend_senior_full: settings.weekendSenior.fullDay,
      weekend_junior_half: settings.weekendJunior.halfDay,
      weekend_junior_full: settings.weekendJunior.fullDay,
    });

  if (settingsError) throw settingsError;

  // 2. Delete ALL existing tiers for this user to avoid ID conflicts with old month-based tiers
  const { error: deleteTiersError } = await supabase
    .from('extended_tiers')
    .delete()
    .eq('user_id', userId);

  if (deleteTiersError) throw deleteTiersError;

  // 3. Insert new tiers
  if (settings.extendedTiers.length > 0) {
    const tiersToInsert = settings.extendedTiers.map((t) => ({
      id: t.id,
      user_id: userId,
      year: GLOBAL_YEAR,
      month: GLOBAL_MONTH,
      from: t.from,
      to: t.to,
      senior_amount: t.seniorAmount,
      junior_amount: t.juniorAmount,
    }));

    const { error: tiersError } = await supabase
      .from('extended_tiers')
      .insert(tiersToInsert);

    if (tiersError) throw tiersError;
  }
}

export async function resetSettingsFromSupabase(month: number, year: number): Promise<void> {
  if (!supabase) return;

  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from('settings')
    .delete()
    .eq('user_id', userId)
    .eq('year', year)
    .eq('month', month);

  if (error) throw error;
}

// ---------- Employee Operations ----------

export async function fetchEmployeesFromSupabase(): Promise<Employee[]> {
  if (!supabase) return [];

  const userId = await getCurrentUserId();

  // Fetch all employee records for the user
  const { data: records, error: recordsError } = await supabase
    .from('employee_records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (recordsError) throw recordsError;

  // Fetch all weekend entries for those record IDs
  const recordIds = (records || []).map((r) => r.id);
  let weekendEntries: any[] = [];
  if (recordIds.length > 0) {
    const { data: entries, error: entriesError } = await supabase
      .from('weekend_entries')
      .select('*')
      .in('employee_record_id', recordIds);

    if (entriesError) throw entriesError;
    weekendEntries = entries || [];
  }

  return (records || []).map((row) => {
    const matchedEntries = weekendEntries
      .filter((e) => e.employee_record_id === row.id)
      .map((e) => ({
        id: e.id,
        date: e.date,
        hours: Number(e.hours),
      }));

    return {
      id: row.id,
      employeeId: row.employee_id,
      name: row.name,
      role: row.role as 'Senior' | 'Junior',
      month: row.month,
      year: row.year,
      weekdayHours: Number(row.weekday_hours),
      weekendEntries: matchedEntries,
      leaves: Number(row.leaves),
      remarks: row.remarks || '',
      sendToBd: !!row.send_to_bd,
      totalWeekendHours: Number(row.total_weekend_hours || 0),
      totalHours: Number(row.total_hours || 0),
      extendedHoursIncentive: Number(row.extended_hours_incentive || 0),
      weekendIncentive: Number(row.weekend_incentive || 0),
      totalIncentive: Number(row.total_incentive || 0),
    };
  });
}

export async function saveEmployeeToSupabase(emp: Employee): Promise<void> {
  if (!supabase) return;

  const userId = await getCurrentUserId();

  // 1. Upsert employee record
  const { error: recordError } = await supabase
    .from('employee_records')
    .upsert({
      id: emp.id,
      user_id: userId,
      employee_id: emp.employeeId,
      name: emp.name,
      role: emp.role,
      month: emp.month,
      year: emp.year,
      weekday_hours: emp.weekdayHours,
      leaves: emp.leaves,
      remarks: emp.remarks,
      send_to_bd: emp.sendToBd || false,
      total_weekend_hours: emp.totalWeekendHours,
      total_hours: emp.totalHours,
      extended_hours_incentive: emp.extendedHoursIncentive,
      weekend_incentive: emp.weekendIncentive,
      total_incentive: emp.totalIncentive,
    });

  if (recordError) throw recordError;

  // 2. Delete existing weekend entries for this record ID
  const { error: deleteError } = await supabase
    .from('weekend_entries')
    .delete()
    .eq('employee_record_id', emp.id);

  if (deleteError) throw deleteError;

  // 3. Insert new weekend entries
  if (emp.weekendEntries.length > 0) {
    const entriesToInsert = emp.weekendEntries.map((e) => ({
      id: e.id,
      employee_record_id: emp.id,
      date: e.date,
      hours: e.hours,
    }));

    const { error: insertError } = await supabase
      .from('weekend_entries')
      .insert(entriesToInsert);

    if (insertError) throw insertError;
  }
}

export async function bulkSaveEmployeesToSupabase(emps: Employee[]): Promise<void> {
  if (!supabase || emps.length === 0) return;

  const userId = await getCurrentUserId();

  const records = emps.map((emp) => ({
    id: emp.id,
    user_id: userId,
    employee_id: emp.employeeId,
    name: emp.name,
    role: emp.role,
    month: emp.month,
    year: emp.year,
    weekday_hours: emp.weekdayHours,
    leaves: emp.leaves,
    remarks: emp.remarks,
    send_to_bd: emp.sendToBd || false,
    total_weekend_hours: emp.totalWeekendHours,
    total_hours: emp.totalHours,
    extended_hours_incentive: emp.extendedHoursIncentive,
    weekend_incentive: emp.weekendIncentive,
    total_incentive: emp.totalIncentive,
  }));

  const { error: recordError } = await supabase
    .from('employee_records')
    .upsert(records);

  if (recordError) throw recordError;

  const recordIds = emps.map((emp) => emp.id);
  const { error: deleteError } = await supabase
    .from('weekend_entries')
    .delete()
    .in('employee_record_id', recordIds);

  if (deleteError) throw deleteError;

  const weekendEntriesToInsert = emps.flatMap((emp) =>
    emp.weekendEntries.map((e: any) => ({
      id: e.id,
      employee_record_id: emp.id,
      date: e.date,
      hours: e.hours,
    }))
  );

  if (weekendEntriesToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('weekend_entries')
      .insert(weekendEntriesToInsert);

    if (insertError) throw insertError;
  }
}

export async function deleteEmployeeFromSupabase(id: string): Promise<void> {
  if (!supabase) return;

  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from('employee_records')
    .delete()
    .eq('user_id', userId)
    .eq('id', id);

  if (error) throw error;
}

export async function bulkImportEmployeesToSupabase(
  employees: Employee[],
  mode: 'replace' | 'merge'
): Promise<void> {
  if (!supabase) return;

  const userId = await getCurrentUserId();

  if (mode === 'replace') {
    // Clear all employee records for the user
    const { error: clearError } = await supabase
      .from('employee_records')
      .delete()
      .eq('user_id', userId);

    if (clearError) throw clearError;
  }

  // Insert all new records
  for (const emp of employees) {
    await saveEmployeeToSupabase(emp);
  }
}
