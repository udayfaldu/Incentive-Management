import React, { useRef, useState } from 'react';
import {
  Box, Grid, Typography, Button, Paper, Divider, Alert, Chip,
  LinearProgress, Table, TableBody, TableCell, TableHead, TableRow,
  Stack, MenuItem, TextField,
} from '@mui/material';
import {
  FileUploadRounded, FileDownloadRounded, CheckCircleRounded,
  ErrorRounded, CloudUploadRounded, DescriptionRounded,
} from '@mui/icons-material';
import { useEmployeeStore } from '../store/employeeStore';
import { useSettingsStore } from '../store/settingsStore';
import type { Employee } from '../types';
import { MONTHS, MONTH_OPTIONS } from '../types';
import {
  exportEmployeesToExcel,
  exportTemplate,
  importEmployeesFromExcel,
  type ImportResult,
} from '../services/excelService';
import { RoleChip } from '../components/common/StatusChips';
import ConfirmDialog from '../components/common/ConfirmDialog';

const ImportExportPage: React.FC = () => {
  const { employees, bulkImport, updateMultipleEmployees } = useEmployeeStore();
  const { settingsByMonth } = useSettingsStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  // Export filters
  const CURRENT_MONTH = new Date().getMonth() + 1;
  const CURRENT_YEAR = new Date().getFullYear();
  const YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - 2 + i);
  const [exportMonth, setExportMonth] = useState<number | 'all'>(CURRENT_MONTH);
  const [exportYear, setExportYear] = useState<number | 'all'>(CURRENT_YEAR);

  const exportFiltered = employees.filter((e) => {
    const matchMonth = exportMonth === 'all' || e.month === exportMonth;
    const matchYear = exportYear === 'all' || e.year === exportYear;
    return matchMonth && matchYear;
  });

  const exportLabel =
    exportMonth !== 'all' && exportYear !== 'all'
      ? `${MONTHS[Number(exportMonth) - 1]} ${exportYear}`
      : exportMonth !== 'all'
      ? MONTHS[Number(exportMonth) - 1]
      : exportYear !== 'all'
      ? String(exportYear)
      : 'All';

  const [preview, setPreview] = useState<Employee[] | null>(null);
  const [importErrors, setImportErrors] = useState<{ row: number; message: string }[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setImportErrors([{ row: 0, message: 'Please upload a valid Excel file (.xlsx or .xls)' }]);
      return;
    }
    setImporting(true);
    setPreview(null);
    setImportErrors([]);
    setSuccessMsg('');
    try {
      const result: ImportResult = await importEmployeesFromExcel(file, settingsByMonth);
      setPreview(result.success);
      setImportErrors(result.errors);
    } catch (err) {
      setImportErrors([{ row: 0, message: String(err) }]);
    } finally {
      setImporting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (preview) {
      bulkImport(preview, importMode);
      setSuccessMsg(`Successfully imported ${preview.length} employee records.`);
      setPreview(null);
    }
    setConfirmOpen(false);
  };

  const handleExport = async (recordsToExport: Employee[]) => {
    exportEmployeesToExcel(recordsToExport);

    const recordsToUpdate = recordsToExport
      .filter((rec) => !rec.sendToBd)
      .map((rec) => ({ ...rec, sendToBd: true }));

    if (recordsToUpdate.length > 0) {
      await updateMultipleEmployees(recordsToUpdate);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
          Import / Export
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Import employee data from Excel or export all records to a spreadsheet.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Export Section */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{
                width: 40, height: 40, borderRadius: 2, bgcolor: 'success.main',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
              }}>
                <FileDownloadRounded />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Export Data</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Filter by month/year and download employee records as an Excel file,
              including all incentive calculations.
            </Typography>

            {/* Month / Year filter */}
            <Stack direction="row" spacing={1.5} sx={{ mb: 2.5 }}>
              <TextField
                id="export-month"
                select size="small" label="Month"
                value={exportMonth}
                onChange={(e) => setExportMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                sx={{ flex: 1 }}
              >
                <MenuItem value="all">All Months</MenuItem>
                {MONTH_OPTIONS.map((m) => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                ))}
              </TextField>
              <TextField
                id="export-year"
                select size="small" label="Year"
                value={exportYear}
                onChange={(e) => setExportYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                sx={{ flex: 1 }}
              >
                <MenuItem value="all">All Years</MenuItem>
                {YEAR_OPTIONS.map((y) => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack spacing={1.5}>
              <Button
                variant="contained" color="success"
                startIcon={<FileDownloadRounded />}
                onClick={() => handleExport(exportFiltered)}
                fullWidth disableElevation id="export-filtered-btn"
                disabled={exportFiltered.length === 0}
              >
                Export {exportLabel} ({exportFiltered.length} records)
              </Button>
              <Button variant="outlined" color="inherit" startIcon={<DescriptionRounded />}
                onClick={exportTemplate} fullWidth id="download-template-btn">
                Download Import Template
              </Button>
            </Stack>
            {exportFiltered.length === 0 && (
              <Alert severity="warning" sx={{ mt: 2, fontSize: '0.8rem' }}>
                No records found for the selected period.
              </Alert>
            )}
            <Alert severity="info" sx={{ mt: 2, fontSize: '0.8rem' }}>
              Weekend entries are exported as: <code>DD-MM-YYYY:hrs;DD-MM-YYYY:hrs</code>
            </Alert>
          </Paper>
        </Grid>

        {/* Import Section */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{
                width: 40, height: 40, borderRadius: 2, bgcolor: 'primary.main',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
              }}>
                <FileUploadRounded />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Import from Excel</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Import Mode:</Typography>
              <TextField id="import-mode" select size="small" value={importMode}
                onChange={(e) => setImportMode(e.target.value as 'merge' | 'replace')} sx={{ minWidth: 160 }}>
                <MenuItem value="merge">Merge (update + add)</MenuItem>
                <MenuItem value="replace">Replace all</MenuItem>
              </TextField>
            </Box>

            <Box
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: '2px dashed', borderColor: dragging ? 'primary.main' : 'divider',
                borderRadius: 3, p: 4, textAlign: 'center', cursor: 'pointer',
                bgcolor: dragging ? 'primary.main' + '10' : 'background.default',
                transition: 'all 0.2s ease',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.main' + '08' },
              }}
            >
              <CloudUploadRounded sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body1" sx={{ fontWeight: 600 }} gutterBottom>
                {dragging ? 'Drop your file here' : 'Drag & drop an Excel file'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                or click to browse (.xlsx, .xls)
              </Typography>
            </Box>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls"
              onChange={handleFileInput} style={{ display: 'none' }} id="file-import-input" />

            {importing && <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />}

            {successMsg && (
              <Alert severity="success" icon={<CheckCircleRounded />} sx={{ mt: 2 }}>
                {successMsg}
              </Alert>
            )}

            {importErrors.length > 0 && (
              <Alert severity="error" icon={<ErrorRounded />} sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {importErrors.length} error(s) during import:
                </Typography>
                {importErrors.map((err, i) => (
                  <Typography key={i} variant="caption" sx={{ display: 'block' }}>
                    {err.row > 0 ? `Row ${err.row}: ` : ''}{err.message}
                  </Typography>
                ))}
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Import Preview */}
        {preview && preview.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Import Preview</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {preview.length} records ready to import. Review before confirming.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button variant="outlined" color="inherit" onClick={() => setPreview(null)} id="cancel-import-btn">
                    Cancel
                  </Button>
                  <Button variant="contained" color="primary" onClick={() => setConfirmOpen(true)}
                    disableElevation id="confirm-import-btn">
                    Confirm Import ({preview.length})
                  </Button>
                </Stack>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Period</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Wkday Hrs</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Wknd Entries</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Total Inc.</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="center">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.map((emp) => {
                      const getImportStatus = () => {
                        if (importMode === 'replace') {
                          return { label: 'Create New', color: 'info' as const };
                        }
                        const cleanId = emp.employeeId.trim().toLowerCase();
                        const hasEmployee = employees.some(e => e.employeeId.trim().toLowerCase() === cleanId);
                        if (!hasEmployee) {
                          return { label: 'New Employee', color: 'info' as const };
                        }
                        const hasMonthRecord = employees.some(
                          e =>
                            e.employeeId.trim().toLowerCase() === cleanId &&
                            e.month === emp.month &&
                            e.year === emp.year
                        );
                        if (hasMonthRecord) {
                          return { label: 'Update Month', color: 'warning' as const };
                        }
                        return { label: 'Add Month', color: 'success' as const };
                      };
                      const status = getImportStatus();

                      return (
                        <TableRow key={emp.id} hover>
                          <TableCell>{emp.employeeId}</TableCell>
                          <TableCell>{emp.name}</TableCell>
                          <TableCell><RoleChip role={emp.role} /></TableCell>
                          <TableCell>{MONTHS[emp.month - 1]} {emp.year}</TableCell>
                          <TableCell align="right">{emp.weekdayHours}</TableCell>
                          <TableCell align="right">
                            <Chip label={emp.weekendEntries.length} size="small"
                              color={emp.weekendEntries.length > 0 ? 'primary' : 'default'} variant="outlined" />
                          </TableCell>
                          <TableCell align="right">
                            <Chip label={`₹${emp.totalIncentive.toLocaleString('en-IN')}`} size="small"
                              color={emp.totalIncentive > 0 ? 'success' : 'default'} sx={{ fontWeight: 700 }} />
                          </TableCell>
                          <TableCell align="center">
                            <Chip label={status.label} size="small" color={status.color} sx={{ fontWeight: 600 }} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm Import"
        message={`This will ${importMode === 'replace' ? 'replace ALL existing records' : 'merge'} with ${preview?.length || 0} imported records. Continue?`}
        confirmLabel="Import"
        severity={importMode === 'replace' ? 'error' : 'info'}
        onConfirm={handleConfirmImport}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  );
};

export default ImportExportPage;
