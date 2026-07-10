export type Role = 'Senior' | 'Junior';

export interface WeekendEntry {
  id: string;
  date: string; // DD-MM-YYYY
  hours: number;
}

export interface Employee {
  id: string;
  name: string;
  employeeId: string;
  role: Role;
  month: number; // 1-12
  year: number;
  weekdayHours: number;
  weekendEntries: WeekendEntry[];
  leaves: number;
  remarks: string;
  sendToBd: boolean;
  // Computed fields
  totalWeekendHours: number;
  totalHours: number;
  extendedHoursIncentive: number;
  weekendIncentive: number;
  totalIncentive: number;
}

// A BaseEmployee is an Employee record without the calculated incentive fields.
// This is what the user inputs in the form before calculations are run.
export type BaseEmployee = Omit<
  Employee,
  'totalWeekendHours' | 'totalHours' | 'extendedHoursIncentive' | 'weekendIncentive' | 'totalIncentive'
>;

export interface ExtendedTier {
  id: string;
  from: number;       // hours (inclusive)
  to: number | null;  // hours (inclusive); null means "and above" (open-ended)
  seniorAmount: number;
  juniorAmount: number;
}

export interface WeekendAmounts {
  halfDay: number; // 0–4 hrs
  fullDay: number; // >4 hrs
}

export interface IncentiveSettings {
  minimumHours: number;        // Global floor — below this = 0 extended incentive
  extendedTiers: ExtendedTier[]; // Dynamic tiers, sorted by `from` at runtime
  weekendSenior: WeekendAmounts;
  weekendJunior: WeekendAmounts;
}

export type MonthName =
  | 'January' | 'February' | 'March' | 'April'
  | 'May' | 'June' | 'July' | 'August'
  | 'September' | 'October' | 'November' | 'December';

export const MONTHS: MonthName[] = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
];

export const MONTH_OPTIONS = MONTHS.map((name, idx) => ({
  label: name,
  value: idx + 1,
}));
