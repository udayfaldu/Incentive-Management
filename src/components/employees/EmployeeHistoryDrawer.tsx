import React, { useMemo, useState } from 'react';
import {
  Drawer, Box, Typography, IconButton, Divider, Stack,
  Table, TableHead, TableBody, TableRow, TableCell,
  Chip, Tooltip, Button,
} from '@mui/material';
import {
  CloseRounded, EditRounded, DeleteRounded, AddRounded,
  CalendarMonthRounded, CurrencyRupeeRounded, PersonRounded,
  VisibilityRounded,
} from '@mui/icons-material';
import { useEmployeeStore } from '../../store/employeeStore';
import type { Employee } from '../../types';
import { MONTHS } from '../../types';
import { RoleChip, IncentiveChip } from '../common/StatusChips';
import EmployeeForm from './EmployeeForm';
import ConfirmDialog from '../common/ConfirmDialog';

interface EmployeeHistoryDrawerProps {
  /** The string employeeId (e.g. "EMP001") whose history to show. Null = closed. */
  employeeId: string | null;
  onClose: () => void;
}

const EmployeeHistoryDrawer: React.FC<EmployeeHistoryDrawerProps> = ({ employeeId, onClose }) => {
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useEmployeeStore();

  // All records for this employeeId, sorted newest first
  const records: Employee[] = useMemo(() => {
    if (!employeeId) return [];
    return employees
      .filter((e) => e.employeeId === employeeId)
      .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);
  }, [employees, employeeId]);

  // Summary employee info from the most recent record
  const baseEmployee = records[0] ?? null;

  // Totals across all months
  const totalIncentive = records.reduce((s, e) => s + e.totalIncentive, 0);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [formReadOnly, setFormReadOnly] = useState(false);
  const [editRecord, setEditRecord] = useState<Employee | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const handleAddMonth = () => {
    setEditRecord(null);
    setFormReadOnly(false);
    setFormOpen(true);
  };

  const handleEdit = (record: Employee) => {
    setEditRecord(record);
    setFormReadOnly(false);
    setFormOpen(true);
  };

  const handleView = (record: Employee) => {
    setEditRecord(record);
    setFormReadOnly(true);
    setFormOpen(true);
  };

  const handleSave = (emp: Employee) => {
    if (editRecord) updateEmployee(emp);
    else addEmployee(emp);
    setFormOpen(false);
    setEditRecord(null);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) deleteEmployee(deleteTarget.id);
    setDeleteTarget(null);
  };

  // Pre-fill form with base employee info when adding a new month
  const formInitialEmployee: Employee | null = editRecord
    ? editRecord
    : baseEmployee
    ? {
        ...baseEmployee,
        id: '',            // will get a new UUID on save
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        weekdayHours: 0,
        weekendEntries: [],
        leaves: 0,
        remarks: '',
        sendToBd: false,
        totalWeekendHours: 0,
        totalHours: 0,
        extendedHoursIncentive: 0,
        weekendIncentive: 0,
        totalIncentive: 0,
      }
    : null;

  return (
    <>
      <Drawer
        anchor="right"
        open={!!employeeId}
        onClose={onClose}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 750, md: 850 }, display: 'flex', flexDirection: 'column' } } }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 3, py: 2,
            background: (theme) =>
              theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #1a237e 0%, #283593 100%)'
                : 'linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          }}
        >
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
              <PersonRounded fontSize="small" color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {baseEmployee?.name ?? '—'}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {baseEmployee?.employeeId ?? '—'}
              </Typography>
              {baseEmployee && <RoleChip role={baseEmployee.role} />}
            </Stack>
          </Box>
          <IconButton onClick={onClose} size="small" id="close-history-drawer">
            <CloseRounded />
          </IconButton>
        </Box>

        {/* Summary Chips */}
        <Box sx={{ px: 3, py: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip
            icon={<CalendarMonthRounded fontSize="small" />}
            label={`${records.length} Month${records.length !== 1 ? 's' : ''} Tracked`}
            size="small"
            variant="outlined"
          />
          <Chip
            icon={<CurrencyRupeeRounded fontSize="small" />}
            label={`Total: ₹${totalIncentive.toLocaleString('en-IN')}`}
            size="small"
            color={totalIncentive > 0 ? 'success' : 'default'}
            variant="outlined"
          />
        </Box>

        <Divider />

        {/* Add Month Button */}
        <Box sx={{ px: 3, py: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            size="small"
            disableElevation
            startIcon={<AddRounded />}
            onClick={handleAddMonth}
            id="add-month-btn"
          >
            Add Month
          </Button>
        </Box>

        {/* Month Records Table */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, pb: 3 }}>
          {records.length === 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
              <Typography variant="body2" color="text.secondary">
                No records found for this employee.
              </Typography>
            </Box>
          ) : (
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Month / Year</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }} align="right">Wkday Hrs</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }} align="right">Wknd Hrs</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }} align="right">Ext. Inc.</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }} align="right">Wknd Inc.</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }} align="right">Total Inc.</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((rec) => (
                  <TableRow key={rec.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {MONTHS[rec.month - 1]}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {rec.year}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{rec.weekdayHours}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{rec.totalWeekendHours}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IncentiveChip amount={rec.extendedHoursIncentive} />
                    </TableCell>
                    <TableCell align="right">
                      <IncentiveChip amount={rec.weekendIncentive} />
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`₹${rec.totalIncentive.toLocaleString('en-IN')}`}
                        size="small"
                        color={rec.totalIncentive > 0 ? 'success' : 'default'}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center' }}>
                        <Tooltip title={`View ${MONTHS[rec.month - 1]} ${rec.year}`}>
                          <IconButton
                            size="small"
                            color="info"
                            id={`history-view-${rec.id}`}
                            onClick={() => handleView(rec)}
                          >
                            <VisibilityRounded fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={`Edit ${MONTHS[rec.month - 1]} ${rec.year}`}>
                          <IconButton
                            size="small"
                            color="primary"
                            id={`history-edit-${rec.id}`}
                            onClick={() => handleEdit(rec)}
                          >
                            <EditRounded fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={`Delete ${MONTHS[rec.month - 1]} ${rec.year}`}>
                          <IconButton
                            size="small"
                            color="error"
                            id={`history-delete-${rec.id}`}
                            onClick={() => setDeleteTarget(rec)}
                          >
                            <DeleteRounded fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Box>
      </Drawer>

      {/* Reuse the existing EmployeeForm — pre-filled for new month or edit */}
      <EmployeeForm
        open={formOpen}
        employee={formInitialEmployee}
        readOnly={formReadOnly}
        onSave={handleSave}
        onClose={() => { setFormOpen(false); setEditRecord(null); }}
      />

      {/* Confirm delete with clear context */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Month Record"
        message={
          deleteTarget
            ? `Delete ${deleteTarget.name}'s data for ${MONTHS[deleteTarget.month - 1]} ${deleteTarget.year}? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        severity="error"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
};

export default EmployeeHistoryDrawer;
