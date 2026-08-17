import React, { useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Grid, TextField, MenuItem, Box, Typography, Divider, Chip,
  IconButton, Checkbox, FormControlLabel,
} from '@mui/material';
import { CloseRounded } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { v4 as uuidv4 } from 'uuid';
import type { Employee, WeekendEntry } from '../../types';
import { MONTH_OPTIONS } from '../../types';
import { useSettingsStore, DEFAULT_SETTINGS } from '../../store/settingsStore';
import { useEmployeeStore } from '../../store/employeeStore';
import { computeEmployee, getExtendedSlabLabel } from '../../services/incentiveService';
import WeekendEntryEditor from './WeekendEntryEditor';

// Define FormValues explicitly so react-hook-form gets proper types
interface FormValues {
  name: string;
  employeeId: string;
  role: 'Senior' | 'Junior';
  month: number;
  year: number;
  weekdayHours: number;
  leaves: number;
  remarks?: string;
  sendToBd?: boolean;
}

// Converts empty, undefined, or text inputs into a number (defaults to 0 if invalid/empty)
const toNum = (val: unknown) => Number(val) || 0;

// Define validation rules using Zod.
// We use z.preprocess to convert input strings (like "180") to numbers before validating values.
const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  employeeId: z.string().min(1, 'Employee ID is required').max(30),
  role: z.enum(['Senior', 'Junior']),
  month: z.preprocess(toNum, z.number().min(1).max(12)),
  year: z.preprocess(toNum, z.number().min(2020).max(2099)),
  weekdayHours: z.preprocess(toNum, z.number().min(0, 'Must be ≥ 0').max(744, 'Too many hours')),
  leaves: z.preprocess(toNum, z.number().min(0).max(31)),
  remarks: z.string().max(500).optional(),
  sendToBd: z.boolean().optional().default(false),
});


interface EmployeeFormProps {
  open: boolean;
  employee?: Employee | null;
  onSave: (employee: Employee) => void;
  onClose: () => void;
  readOnly?: boolean;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - 2 + i);

const EmployeeForm: React.FC<EmployeeFormProps> = ({ open, employee, onSave, onClose, readOnly }) => {
  const { settingsByMonth } = useSettingsStore();
  const { employees } = useEmployeeStore();
  const isEdit = !!employee;

  const [weekendEntries, setWeekendEntries] = React.useState<WeekendEntry[]>([]);

  const { control, handleSubmit, reset, watch, setValue, setError, formState: { errors, isSubmitting } } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: '', employeeId: '', role: 'Senior',
      month: new Date().getMonth() + 1, year: CURRENT_YEAR,
      weekdayHours: 0, leaves: 0, remarks: '',
      sendToBd: false,
    },
  });

  useEffect(() => {
    if (open) {
      if (employee) {
        reset({
          name: employee.name, employeeId: employee.employeeId, role: employee.role,
          month: employee.month, year: employee.year, weekdayHours: employee.weekdayHours,
          leaves: employee.leaves, remarks: employee.remarks,
          sendToBd: employee.sendToBd,
        });
        setWeekendEntries(employee.weekendEntries);
      } else {
        reset({ name: '', employeeId: '', role: 'Senior', month: new Date().getMonth() + 1,
          year: CURRENT_YEAR, weekdayHours: 0, leaves: 0, remarks: '', sendToBd: false });
        setWeekendEntries([]);
      }
    }
  }, [open, employee, reset]);

  const watchedValues = watch();

  const watchedEmployeeId = watchedValues.employeeId;
  const matchedEmployee = React.useMemo(() => {
    if (!watchedEmployeeId) return null;
    const cleanId = watchedEmployeeId.trim().toLowerCase();
    return employees
      .filter((e) => e.employeeId.trim().toLowerCase() === cleanId)
      .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month)[0] || null;
  }, [employees, watchedEmployeeId]);

  // Autofill name and role when matchedEmployee changes in add mode
  useEffect(() => {
    if (!isEdit && matchedEmployee) {
      setValue('name', matchedEmployee.name);
      setValue('role', matchedEmployee.role);
    }
  }, [matchedEmployee, isEdit, setValue]);

  const currentSettings = React.useMemo(() => {
    const key = '9999-12';
    return settingsByMonth[key] || DEFAULT_SETTINGS;
  }, [settingsByMonth]);

  const preview = React.useMemo(() => {
    return computeEmployee({
      id: employee?.id || '',
      name: watchedValues.name || '',
      employeeId: watchedValues.employeeId || '',
      role: watchedValues.role || 'Senior',
      month: Number(watchedValues.month) || 1,
      year: Number(watchedValues.year) || CURRENT_YEAR,
      weekdayHours: Number(watchedValues.weekdayHours) || 0,
      weekendEntries,
      leaves: Number(watchedValues.leaves) || 0,
      remarks: watchedValues.remarks || '',
      sendToBd: !!watchedValues.sendToBd,
    }, currentSettings);
  }, [watchedValues, weekendEntries, currentSettings, employee?.id]);

  const hasChangesExceptSendToBd = React.useMemo(() => {
    if (!employee) return false;
    return (
      watchedValues.name !== employee.name ||
      watchedValues.employeeId !== employee.employeeId ||
      watchedValues.role !== employee.role ||
      Number(watchedValues.month) !== employee.month ||
      Number(watchedValues.year) !== employee.year ||
      Number(watchedValues.weekdayHours) !== employee.weekdayHours ||
      Number(watchedValues.leaves) !== employee.leaves ||
      (watchedValues.remarks || '') !== (employee.remarks || '') ||
      JSON.stringify(weekendEntries) !== JSON.stringify(employee.weekendEntries)
    );
  }, [watchedValues, weekendEntries, employee]);

  const onSubmit = (data: FormValues) => {
    const cleanId = data.employeeId.trim().toLowerCase();
    const duplicate = employees.find(
      (e) =>
        e.id !== employee?.id &&
        e.employeeId.trim().toLowerCase() === cleanId &&
        e.month === Number(data.month) &&
        e.year === Number(data.year)
    );

    if (duplicate) {
      setError('employeeId', {
        type: 'manual',
        message: `This employee already has data for ${MONTH_OPTIONS.find(m => m.value === Number(data.month))?.label} ${data.year}.`,
      });
      return;
    }

    const computed = computeEmployee({
      id: employee?.id || uuidv4(),
      name: data.name, employeeId: data.employeeId, role: data.role,
      month: data.month, year: data.year, weekdayHours: data.weekdayHours,
      weekendEntries, leaves: data.leaves, remarks: data.remarks || '',
      sendToBd: hasChangesExceptSendToBd ? false : !!data.sendToBd,
    }, currentSettings);
    onSave(computed);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{readOnly ? 'View Employee' : isEdit ? 'Edit Employee' : 'Add Employee'}</span>
        <IconButton onClick={onClose} size="small" id="close-employee-form">
          <CloseRounded />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent dividers>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }} color="text.secondary" gutterBottom>
                BASIC INFORMATION
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="name" control={control} render={({ field }) => (
                <TextField {...field} id="emp-name" label="Full Name" fullWidth
                  error={!!errors.name} helperText={errors.name?.message} required
                  disabled={readOnly || (!isEdit && !!matchedEmployee)} />
              )} />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="employeeId" control={control} render={({ field }) => (
                <Box>
                  <TextField {...field} id="emp-id" label="Employee ID" fullWidth
                    error={!!errors.employeeId} helperText={errors.employeeId?.message} required
                    disabled={readOnly} />
                  {!isEdit && matchedEmployee && (
                    <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block', fontWeight: 600 }}>
                      Matched: {matchedEmployee.name} ({matchedEmployee.role})
                    </Typography>
                  )}
                </Box>
              )} />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="role" control={control} render={({ field }) => (
                <TextField {...field} id="emp-role" label="Role" select fullWidth
                  error={!!errors.role} helperText={errors.role?.message} required
                  disabled={readOnly || (!isEdit && !!matchedEmployee)}>
                  <MenuItem value="Senior">Senior</MenuItem>
                  <MenuItem value="Junior">Junior</MenuItem>
                </TextField>
              )} />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="month" control={control} render={({ field }) => (
                <TextField {...field} id="emp-month" label="Month" select fullWidth
                  error={!!errors.month} helperText={errors.month?.message} required
                  disabled={readOnly}>
                  {MONTH_OPTIONS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                </TextField>
              )} />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <Controller name="year" control={control} render={({ field }) => (
                <TextField {...field} id="emp-year" label="Year" select fullWidth
                  error={!!errors.year} helperText={errors.year?.message} required
                  disabled={readOnly}>
                  {YEAR_OPTIONS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                </TextField>
              )} />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Divider />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }} color="text.secondary" gutterBottom>
                HOURS & ATTENDANCE
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="weekdayHours" control={control} render={({ field }) => (
                <TextField {...field} id="emp-weekday-hours" label="Weekday Hours" type="number"
                  fullWidth error={!!errors.weekdayHours}
                  helperText={errors.weekdayHours?.message || `Slab: ${getExtendedSlabLabel(Number(field.value), currentSettings)}`}
                  disabled={readOnly}
                  slotProps={{ htmlInput: { min: 0, max: 744, step: 0.5 } }} required />
              )} />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller name="leaves" control={control} render={({ field }) => (
                <TextField {...field} id="emp-leaves" label="Leaves" type="number" fullWidth
                  error={!!errors.leaves} helperText={errors.leaves?.message}
                  disabled={readOnly}
                  slotProps={{ htmlInput: { min: 0, max: 31 } }} />
              )} />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <WeekendEntryEditor entries={weekendEntries} role={watchedValues.role}
                onChange={setWeekendEntries} settings={currentSettings} disabled={readOnly} />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Controller name="remarks" control={control} render={({ field }) => (
                <TextField {...field} id="emp-remarks" label="Remarks" fullWidth
                  multiline rows={2} error={!!errors.remarks} helperText={errors.remarks?.message}
                  disabled={readOnly} />
              )} />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Controller name="sendToBd" control={control} render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      disabled={readOnly}
                      id="emp-send-to-bd"
                    />
                  }
                  label="Send to BD"
                />
              )} />
            </Grid>

            {/* Incentive Preview */}
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }} color="text.secondary" gutterBottom>
                INCENTIVE PREVIEW
              </Typography>
              <Box sx={{
                display: 'flex', flexWrap: 'wrap', gap: 1.5, p: 2,
                bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider',
              }}>
                {[
                  { label: 'Total Hours', value: preview.totalHours, color: undefined as 'primary' | 'secondary' | 'success' | undefined },
                  { label: 'Extended Hrs Incentive', value: `₹${preview.extendedHoursIncentive.toLocaleString('en-IN')}`, color: preview.extendedHoursIncentive > 0 ? 'primary' as const : undefined },
                  { label: 'Weekend Incentive', value: `₹${preview.weekendIncentive.toLocaleString('en-IN')}`, color: preview.weekendIncentive > 0 ? 'secondary' as const : undefined },
                  { label: 'Total Incentive', value: `₹${preview.totalIncentive.toLocaleString('en-IN')}`, color: preview.totalIncentive > 0 ? 'success' as const : undefined },
                ].map((item) => (
                  <Box key={item.label} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{item.label}</Typography>
                    <Chip label={item.value} size="small" color={item.color || 'default'}
                      sx={{ fontWeight: item.label === 'Total Incentive' ? 700 : 500 }} />
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} variant="outlined" color="inherit" id="cancel-employee-form">
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
          {!readOnly && (
            <Button type="submit" variant="contained" disableElevation disabled={isSubmitting} id="save-employee-form">
              {isEdit ? 'Save Changes' : 'Add Employee'}
            </Button>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EmployeeForm;
