import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import type { Employee, IncentiveSettings } from '../types';
import {
  computeEmployee,
  parseWeekendEntriesFromString,
  serializeWeekendEntries,
} from './incentiveService';
import { MONTHS } from '../types';
import { DEFAULT_SETTINGS } from '../store/settingsStore';


const HEADERS = [
  'Employee ID',
  'Name',
  'Role',
  'Month',
  'Year',
  'Weekday Hours',
  'Weekend Entries (DD-MM-YYYY:hrs;...)',
  'Total Weekend Hours',
  'Total Hours',
  'Leaves',
  'Remarks',
  'Extended Hours Incentive',
  'Weekend Incentive',
  'Total Incentive',
];

/**
 * Export all employees to an Excel file and trigger download.
 */
export function exportEmployeesToExcel(employees: Employee[]): void {
  const rows = employees.map((emp) => [
    emp.employeeId,
    emp.name,
    emp.role,
    MONTHS[emp.month - 1],
    emp.year,
    emp.weekdayHours,
    serializeWeekendEntries(emp.weekendEntries),
    emp.totalWeekendHours,
    emp.totalHours,
    emp.leaves,
    emp.remarks,
    emp.extendedHoursIncentive,
    emp.weekendIncentive,
    emp.totalIncentive,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);

  // Style column widths
  ws['!cols'] = [
    { wch: 14 }, // Employee ID
    { wch: 22 }, // Name
    { wch: 10 }, // Role
    { wch: 12 }, // Month
    { wch: 8 },  // Year
    { wch: 14 }, // Weekday Hours
    { wch: 40 }, // Weekend Entries
    { wch: 20 }, // Total Weekend Hours
    { wch: 12 }, // Total Hours
    { wch: 8 },  // Leaves
    { wch: 25 }, // Remarks
    { wch: 24 }, // Extended Hours Incentive
    { wch: 20 }, // Weekend Incentive
    { wch: 16 }, // Total Incentive
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Employees');
  XLSX.writeFile(wb, `incentive_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Export a blank template for import.
 */
export function exportTemplate(): void {
  const sampleRows = [
    ['EMP001', 'John Doe', 'Senior', 'January', 2026, 180, '03-01-2026:3;10-01-2026:8', '', '', 0, 'Sample remark'],
    ['EMP002', 'Jane Smith', 'Junior', 'January', 2026, 160, '', '', '', 1, ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet([
    HEADERS.slice(0, 11), // exclude computed columns for template
    ...sampleRows,
  ]);
  ws['!cols'] = [
    { wch: 14 }, { wch: 22 }, { wch: 10 }, { wch: 12 }, { wch: 8 },
    { wch: 14 }, { wch: 40 }, { wch: 20 }, { wch: 12 }, { wch: 8 }, { wch: 25 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, 'incentive_import_template.xlsx');
}

export interface ImportResult {
  success: Employee[];
  errors: { row: number; message: string }[] ;
}

/**
 * Parse an uploaded Excel file and compute incentives.
 * This function returns a Promise containing the successfully parsed records and a list of row errors.
 */
export function importEmployeesFromExcel(
  file: File,
  settingsByMonth: Record<string, IncentiveSettings>
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    // Triggered when file has finished loading
    reader.onload = (e) => {
      try {
        // 1. Convert Excel file buffer into a XLSX workbook
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        
        // 2. Read the first worksheet from the Excel workbook
        const ws = wb.Sheets[wb.SheetNames[0]];
        
        // 3. Convert spreadsheet rows into a JSON array of row objects
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: '',
          raw: false,
        });

        const success: Employee[] = [];
        const errors: { row: number; message: string }[] = [];

        // 4. Process each row. Excel rows in the UI are (index + 2) because headers take row 1
        rows.forEach((row, idx) => {
          try {
            // Find month index (0 to 11) from name
            const rawMonth = String(row['Month'] || '').trim();
            const monthIndex = MONTHS.findIndex(
              (m) => m.toLowerCase() === rawMonth.toLowerCase()
            );
            if (monthIndex === -1) {
              errors.push({ row: idx + 2, message: `Invalid month: "${rawMonth}"` });
              return;
            }

            // Verify role
            const rawRole = String(row['Role'] || '').trim();
            if (rawRole !== 'Senior' && rawRole !== 'Junior') {
              errors.push({ row: idx + 2, message: `Invalid role: "${rawRole}"` });
              return;
            }

            const weekdayHours = parseFloat(String(row['Weekday Hours'] || '0'));
            
            // Extract and parse weekend entries log format: "01-01-2026:4;02-01-2026:8"
            const weekendRaw = String(
              row['Weekend Entries (DD-MM-YYYY:hrs;...)'] || row['Weekend Entries'] || ''
            );
            const parsedEntries = parseWeekendEntriesFromString(weekendRaw);
            const weekendEntries = parsedEntries.map((e) => ({ ...e, id: uuidv4() }));

            // Construct the basic employee input data
            const base = {
              id: uuidv4(),
              employeeId: String(row['Employee ID'] || '').trim(),
              name: String(row['Name'] || '').trim(),
              role: rawRole as 'Senior' | 'Junior',
              month: monthIndex + 1,
              year: parseInt(String(row['Year'] || new Date().getFullYear())),
              weekdayHours: isNaN(weekdayHours) ? 0 : weekdayHours,
              weekendEntries,
              leaves: parseInt(String(row['Leaves'] || '0')) || 0,
              remarks: String(row['Remarks'] || '').trim(),
              sendToBd: false,
            };

            if (!base.name) {
              errors.push({ row: idx + 2, message: 'Employee name is required' });
              return;
            }

            // 5. Look up month settings and compute calculated fields
            const key = `${base.year}-${base.month}`;
            const empSettings = settingsByMonth[key] || DEFAULT_SETTINGS;
            success.push(computeEmployee(base, empSettings));
          } catch (err) {
            errors.push({ row: idx + 2, message: String(err) });
          }
        });

        resolve({ success, errors });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    
    // Begin reading the file as an ArrayBuffer
    reader.readAsArrayBuffer(file);
  });
}
