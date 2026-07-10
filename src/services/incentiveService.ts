import type { Employee, IncentiveSettings, WeekendEntry, ExtendedTier, BaseEmployee } from '../types';

/**
 * Sort tiers by `from` ascending (lowest range first).
 */
export function getSortedTiers(settings: IncentiveSettings): ExtendedTier[] {
  return [...settings.extendedTiers].sort((a, b) => a.from - b.from);
}

/**
 * Find the matching tier for a given weekday hours value.
 * Returns the tier where `hours >= from` and (`to === null` OR `hours <= to`).
 * If multiple tiers match (overlapping ranges), the one with the highest `from` wins.
 */
export function findMatchingTier(
  weekdayHours: number,
  settings: IncentiveSettings
): ExtendedTier | null {
  // Loop through all tiers and return the one that matches our hours range
  for (const tier of settings.extendedTiers) {
    const hoursAtLeastFrom = weekdayHours >= tier.from;
    const hoursAtMostTo = tier.to === null || weekdayHours <= tier.to;
    if (hoursAtLeastFrom && hoursAtMostTo) {
      return tier;
    }
  }
  return null;
}

/**
 * Calculate extended hours incentive based ONLY on weekday hours.
 * 1. Returns 0 if weekday hours are below the global minimumHours threshold.
 * 2. Finds the matching tier for the weekday hours.
 * 3. Returns the amount based on the employee's role (Senior vs Junior).
 */
export function calcExtendedHoursIncentive(
  weekdayHours: number,
  role: 'Senior' | 'Junior',
  settings: IncentiveSettings
): number {
  if (weekdayHours < settings.minimumHours) return 0;
  const tier = findMatchingTier(weekdayHours, settings);
  if (!tier) return 0;
  return role === 'Senior' ? tier.seniorAmount : tier.juniorAmount;
}

export function calcWeekendIncentive(
  entries: WeekendEntry[],
  role: 'Senior' | 'Junior',
  settings: IncentiveSettings
): number {
  const amounts = role === 'Senior' ? settings.weekendSenior : settings.weekendJunior;
  let total = 0;

  // Use a simple loop to calculate the rate for each weekend entry
  for (const entry of entries) {
    if (entry.hours > 0) {
      if (entry.hours <= 4) {
        total = total + amounts.halfDay; // Half Day rate
      } else {
        total = total + amounts.fullDay; // Full Day rate
      }
    }
  }

  return total;
}

export function calcTotalWeekendHours(entries: WeekendEntry[]): number {
  let total = 0;
  for (const entry of entries) {
    total = total + (entry.hours || 0);
  }
  return total;
}

/**
 * Fully compute all derived fields for an employee.
 * Takes the raw employee details (BaseEmployee) and returns a complete Employee object
 * containing computed total weekend hours, total hours, and calculated incentives.
 */
export function computeEmployee(
  employee: BaseEmployee,
  settings: IncentiveSettings
): Employee {
  const totalWeekendHours = calcTotalWeekendHours(employee.weekendEntries);
  const totalHours = (employee.weekdayHours || 0) + totalWeekendHours;
  const extendedHoursIncentive = calcExtendedHoursIncentive(
    employee.weekdayHours,
    employee.role,
    settings
  );
  const weekendIncentive = calcWeekendIncentive(
    employee.weekendEntries,
    employee.role,
    settings
  );
  const totalIncentive = extendedHoursIncentive + weekendIncentive;

  return {
    ...employee,
    totalWeekendHours,
    totalHours,
    extendedHoursIncentive,
    weekendIncentive,
    totalIncentive,
  };
}

/**
 * Recompute all employees with new settings.
 */
export function recomputeAll(
  employees: Employee[],
  settings: IncentiveSettings
): Employee[] {
  return employees.map((emp) => computeEmployee(emp, settings));
}

/**
 * Get weekend entry type label for display.
 */
export function getWeekendEntryType(
  hours: number,
  role: 'Senior' | 'Junior',
  settings: IncentiveSettings
): { label: string; amount: number } {
  if (hours <= 0) return { label: '—', amount: 0 };
  const amounts = role === 'Senior' ? settings.weekendSenior : settings.weekendJunior;
  if (hours <= 4) return { label: 'Half Day', amount: amounts.halfDay };
  return { label: 'Full Day', amount: amounts.fullDay };
}

/**
 * Get extended hours tier label for display in forms.
 */
export function getExtendedSlabLabel(
  weekdayHours: number,
  settings: IncentiveSettings
): string {
  if (weekdayHours < settings.minimumHours) return 'Below Minimum — No Extended Incentive';
  const tier = findMatchingTier(weekdayHours, settings);
  if (!tier) return 'No Matching Tier';
  const toStr = tier.to !== null ? `–${tier.to}` : '+';
  return `Tier: ${tier.from}${toStr} hrs`;
}

/**
 * Parse weekend entries from Excel serial string format:
 * "03-05-2026:2;10-05-2026:8;24-05-2026:6"
 */
export function parseWeekendEntriesFromString(
  raw: string
): Omit<WeekendEntry, 'id'>[] {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [date, hoursStr] = part.split(':');
      const hours = parseFloat(hoursStr);
      return { date: date?.trim() || '', hours: isNaN(hours) ? 0 : hours };
    })
    .filter((e) => e.date);
}

/**
 * Serialize weekend entries to string for Excel export.
 * Format: "03-05-2026:2;10-05-2026:8"
 */
export function serializeWeekendEntries(entries: WeekendEntry[]): string {
  return entries.map((e) => `${e.date}:${e.hours}`).join(';');
}
