import React, { useState, useMemo } from 'react';
import {
  Box, Button, MenuItem, TextField, Typography, Chip,
  IconButton, Tooltip, Paper, Stack, Divider, Checkbox,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import {
  AddRounded, EditRounded, DeleteRounded,
  FileDownloadRounded, FilterListRounded, HistoryRounded,
  VisibilityRounded,
} from '@mui/icons-material';
import { useEmployeeStore } from '../store/employeeStore';
import type { Employee } from '../types';
import { MONTH_OPTIONS, MONTHS } from '../types';
import { exportEmployeesToExcel } from '../services/excelService';
import SearchBar from '../components/common/SearchBar';
import { RoleChip, IncentiveChip } from '../components/common/StatusChips';
import EmployeeForm from '../components/employees/EmployeeForm';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EmployeeHistoryDrawer from '../components/employees/EmployeeHistoryDrawer';

const CURRENT_MONTH = new Date().getMonth() + 1;
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - 2 + i);

const EmployeesPage: React.FC = () => {
  const { employees, addEmployee, updateEmployee, deleteEmployee, updateMultipleEmployees } = useEmployeeStore();

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<number | 'all'>(CURRENT_MONTH);
  const [filterYear, setFilterYear] = useState<number | 'all'>(CURRENT_YEAR);
  const [showFilters, setShowFilters] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formReadOnly, setFormReadOnly] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [historyEmpId, setHistoryEmpId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q) ||
        e.remarks.toLowerCase().includes(q);
      const matchRole = filterRole === 'all' || e.role === filterRole;
      const matchMonth = filterMonth === 'all' || e.month === filterMonth;
      const matchYear = filterYear === 'all' || e.year === filterYear;
      return matchSearch && matchRole && matchMonth && matchYear;
    });
  }, [employees, search, filterRole, filterMonth, filterYear]);

  const totalExtended = useMemo(() => filtered.reduce((sum, e) => sum + (e.extendedHoursIncentive || 0), 0), [filtered]);
  const totalWeekend = useMemo(() => filtered.reduce((sum, e) => sum + (e.weekendIncentive || 0), 0), [filtered]);
  const totalIncentive = useMemo(() => filtered.reduce((sum, e) => sum + (e.totalIncentive || 0), 0), [filtered]);

  const handleAdd = () => { setEditEmployee(null); setFormReadOnly(false); setFormOpen(true); };
  const handleEdit = (emp: Employee) => { setEditEmployee(emp); setFormReadOnly(false); setFormOpen(true); };
  const handleView = (emp: Employee) => { setEditEmployee(emp); setFormReadOnly(true); setFormOpen(true); };
  const handleSave = (emp: Employee) => {
    if (editEmployee) updateEmployee(emp);
    else addEmployee(emp);
    setFormOpen(false);
    setEditEmployee(null);
  };
  const handleDeleteConfirm = () => {
    if (deleteTarget) deleteEmployee(deleteTarget.id);
    setDeleteTarget(null);
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

  const columns: GridColDef[] = [
    { field: 'employeeId', headerName: 'Emp ID', width: 110 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
    {
      field: 'role', headerName: 'Role', width: 100,
      renderCell: (params: GridRenderCellParams) => <RoleChip role={params.value} />,
    },
    {
      field: 'month', headerName: 'Month / Year', width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Typography variant="body2">{MONTHS[params.row.month - 1]} {params.row.year}</Typography>
        </Box>
      ),
    },
    { field: 'weekdayHours', headerName: 'Weekday Hrs', width: 110, type: 'number' },
    { field: 'totalWeekendHours', headerName: 'Weekend Hrs', width: 110, type: 'number' },
    { field: 'totalHours', headerName: 'Total Hrs', width: 100, type: 'number' },
    { field: 'leaves', headerName: 'Leaves', width: 80, type: 'number' },
    {
      field: 'extendedHoursIncentive', headerName: 'Ext. Incentive', width: 125,
      renderCell: (params: GridRenderCellParams) => <IncentiveChip amount={params.value} />,
    },
    {
      field: 'weekendIncentive', headerName: 'Wknd Incentive', width: 130,
      renderCell: (params: GridRenderCellParams) => <IncentiveChip amount={params.value} />,
    },
    {
      field: 'totalIncentive', headerName: 'Total Incentive', width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={`₹${Number(params.value).toLocaleString('en-IN')}`}
          size="small"
          color={params.value > 0 ? 'success' : 'default'}
          sx={{ fontWeight: 700 }}
        />
      ),
    },
    {
      field: 'sendToBd', headerName: 'Send to BD', width: 120, sortable: true,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Checkbox
            checked={!!params.value}
            onChange={async (e) => {
              const checked = e.target.checked;
              const updatedEmp = { ...params.row, sendToBd: checked } as Employee;
              await updateEmployee(updatedEmp);
            }}
            size="small"
            id={`send-to-bd-${params.row.id}`}
          />
        </Box>
      )
    },
    {
      field: 'actions', headerName: 'Actions', width: 170, sortable: false, filterable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Month History">
            <IconButton size="small" color="secondary" id={`history-emp-${params.row.id}`}
              onClick={() => setHistoryEmpId((params.row as Employee).employeeId)}>
              <HistoryRounded fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="View">
            <IconButton size="small" color="info" id={`view-emp-${params.row.id}`}
              onClick={() => handleView(params.row as Employee)}>
              <VisibilityRounded fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" color="primary" id={`edit-emp-${params.row.id}`}
              onClick={() => handleEdit(params.row as Employee)}>
              <EditRounded fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete this month">
            <IconButton size="small" color="error" id={`delete-emp-${params.row.id}`}
              onClick={() => setDeleteTarget(params.row as Employee)}>
              <DeleteRounded fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
            Employee Records
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filtered.length} of {employees.length} records
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<FileDownloadRounded />}
            onClick={() => handleExport(filtered)} id="export-employees-btn">
            Export
          </Button>
          <Button variant="contained" startIcon={<AddRounded />} onClick={handleAdd}
            disableElevation id="add-employee-btn">
            Add Employee
          </Button>
        </Stack>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
          <SearchBar id="employee-search" value={search} onChange={setSearch}
            placeholder="Search name, ID, remarks…" />
          <Button size="small" variant={showFilters ? 'contained' : 'outlined'}
            startIcon={<FilterListRounded />} onClick={() => setShowFilters(!showFilters)}
            disableElevation id="toggle-filters-btn">
            Filters
          </Button>
          {showFilters && (
            <>
              <TextField id="filter-role" select size="small" label="Role"
                value={filterRole} onChange={(e) => setFilterRole(e.target.value)} sx={{ minWidth: 110 }}>
                <MenuItem value="all">All Roles</MenuItem>
                <MenuItem value="Senior">Senior</MenuItem>
                <MenuItem value="Junior">Junior</MenuItem>
              </TextField>
              <TextField id="filter-month" select size="small" label="Month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                sx={{ minWidth: 120 }}>
                <MenuItem value="all">All Months</MenuItem>
                {MONTH_OPTIONS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </TextField>
              <TextField id="filter-year" select size="small" label="Year"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                sx={{ minWidth: 100 }}>
                <MenuItem value="all">All Years</MenuItem>
                {YEAR_OPTIONS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </TextField>
              <Button size="small" color="inherit" id="clear-filters-btn"
                onClick={() => { setSearch(''); setFilterRole('all'); setFilterMonth('all'); setFilterYear('all'); }}>
                Clear
              </Button>
            </>
          )}
        </Box>
      </Paper>

      <Paper sx={{ height: 520 }}>
        <DataGrid
          rows={filtered}
          columns={columns}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
          getRowHeight={() => 52}
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': { backgroundColor: '#F1F3F5', fontWeight: 600 },
            '& .MuiDataGrid-cell': { borderColor: '#F1F3F5' },
            '& .MuiDataGrid-row:hover': { backgroundColor: '#F8F9FA' },
            '& .MuiDataGrid-footerContainer': { borderTop: '1px solid', borderColor: 'divider' },
          }}
        />
      </Paper>

      {/* ── Summary Card ── */}
      <Paper sx={{ p: 2, mt: 2, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Box>
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>
            FILTERED SUMMARY:
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Weekday Extended: <strong>₹{totalExtended.toLocaleString('en-IN')}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Weekend/Holiday: <strong>₹{totalWeekend.toLocaleString('en-IN')}</strong>
          </Typography>
          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
          <Typography variant="subtitle1" color="success.main" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            Total Incentive: <strong>₹{totalIncentive.toLocaleString('en-IN')}</strong>
          </Typography>
        </Box>
      </Paper>

      <EmployeeForm open={formOpen} employee={editEmployee} readOnly={formReadOnly} onSave={handleSave} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Month Record"
        message={
          deleteTarget
            ? `Delete ${deleteTarget.name}'s record for ${MONTHS[deleteTarget.month - 1]} ${deleteTarget.year}? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        severity="error"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
      <EmployeeHistoryDrawer
        employeeId={historyEmpId}
        onClose={() => setHistoryEmpId(null)}
      />
    </Box>
  );
};

export default EmployeesPage;
