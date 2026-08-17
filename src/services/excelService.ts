import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
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
  { header: 'Employee ID', key: 'id', width: 14 },
  { header: 'Name', key: 'name', width: 22 },
  { header: 'Role', key: 'role', width: 10 },
  { header: 'Month', key: 'month', width: 12 },
  { header: 'Year', key: 'year', width: 8 },
  { header: 'Weekday Hours', key: 'weekday', width: 14 },
  { header: 'Weekend Entries (DD-MM-YYYY:hrs;...)', key: 'weekendLog', width: 40 },
  { header: 'Total Weekend Hours', key: 'totalWeekend', width: 20 },
  { header: 'Total Hours', key: 'totalHours', width: 12 },
  { header: 'Leaves', key: 'leaves', width: 8 },
  { header: 'Remarks', key: 'remarks', width: 25 },
  { header: 'Extended Hours Incentive', key: 'extendedInc', width: 24 },
  { header: 'Weekend Incentive', key: 'weekendInc', width: 20 },
  { header: 'Total Incentive', key: 'totalInc', width: 16 },
];

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1976D2' }, // MUI Primary blue
    };
    cell.font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
      size: 11,
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
  row.height = 30;
}

/**
 * Export all employees to an Excel file and trigger download.
 */
export async function exportEmployeesToExcel(employees: Employee[]): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Employees');

  ws.columns = HEADERS;

  styleHeaderRow(ws.getRow(1));

  employees.forEach((emp) => {
    const row = ws.addRow({
      id: emp.employeeId,
      name: emp.name,
      role: emp.role,
      month: MONTHS[emp.month - 1],
      year: emp.year,
      weekday: emp.weekdayHours,
      weekendLog: serializeWeekendEntries(emp.weekendEntries),
      totalWeekend: emp.totalWeekendHours,
      totalHours: emp.totalHours,
      leaves: emp.leaves,
      remarks: emp.remarks,
      extendedInc: emp.extendedHoursIncentive,
      weekendInc: emp.weekendIncentive,
      totalInc: emp.totalIncentive,
    });
    
    // Add border to data cells
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      };
      if (typeof cell.value === 'number') {
        cell.alignment = { horizontal: 'right' };
      }
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `incentive_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Export a blank template for import.
 */
export async function exportTemplate(): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Template');

  // For template, we only need the input columns (first 11)
  ws.columns = HEADERS.slice(0, 11);

  styleHeaderRow(ws.getRow(1));

  const sampleRows = [
    { id: 'EMP001', name: 'John Doe', role: 'Senior', month: 'January', year: 2026, weekday: 180, weekendLog: '03-01-2026:3;10-01-2026:8', totalWeekend: '', totalHours: '', leaves: 0, remarks: 'Sample remark' },
    { id: 'EMP002', name: 'Jane Smith', role: 'Junior', month: 'January', year: 2026, weekday: 160, weekendLog: '', totalWeekend: '', totalHours: '', leaves: 1, remarks: '' },
  ];

  sampleRows.forEach(data => {
    const row = ws.addRow(data);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      };
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, 'incentive_import_template.xlsx');
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
            const key = '9999-12';
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
