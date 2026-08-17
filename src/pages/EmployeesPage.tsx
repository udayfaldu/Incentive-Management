import React, { useState, useMemo } from 'react';
import {
  Box, Button, MenuItem, TextField, Typography, Chip,
  IconButton, Tooltip, Paper, Stack, Divider, Checkbox,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import {
  AddRounded, FileDownloadRounded, FilterListRounded, HistoryRounded,
} from '@mui/icons-material';
import { useEmployeeStore } from '../store/employeeStore';
import type { Employee } from '../types';
import { exportEmployeesToExcel } from '../services/excelService';
import SearchBar from '../components/common/SearchBar';
import { RoleChip, IncentiveChip } from '../components/common/StatusChips';
import EmployeeForm from '../components/employees/EmployeeForm';
import EmployeeHistoryDrawer from '../components/employees/EmployeeHistoryDrawer';
import { MONTH_OPTIONS } from '../types';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - 2 + i);

const EmployeesPage: React.FC = () => {
  const { employees, addEmployee, updateEmployee, updateMultipleEmployees } = useEmployeeStore();

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all');
  const [filterYear, setFilterYear] = useState<number | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [historyEmpId, setHistoryEmpId] = useState<string | null>(null);

  const isMonthMode = filterMonth !== 'all';

  const filteredData = useMemo(() => {
    let sourceData = employees;

    if (!isMonthMode) {
      // Directory Mode: Group records by employeeId to only show one row per employee
      const map = new Map<string, Employee>();
      // Pre-filter by year if selected so directory only shows employees active that year
      const yearFiltered = filterYear === 'all' ? employees : employees.filter(e => e.year === filterYear);

      yearFiltered.forEach((e) => {
        const existing = map.get(e.employeeId);
        // Keep the most recent record
        if (!existing || e.year > existing.year || (e.year === existing.year && e.month > existing.month)) {
          map.set(e.employeeId, e);
        }
      });
      sourceData = Array.from(map.values());
    }

    return sourceData.filter((e) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q) ||
        e.remarks.toLowerCase().includes(q);
      const matchRole = filterRole === 'all' || e.role === filterRole;
      
      if (isMonthMode) {
        const matchMonth = e.month === filterMonth;
        const matchYear = filterYear === 'all' || e.year === filterYear;
        return matchSearch && matchRole && matchMonth && matchYear;
      }
      
      // In directory mode, we don't apply month/year to individual rows again
      return matchSearch && matchRole;
    });
  }, [employees, search, filterRole, filterMonth, filterYear, isMonthMode]);

  const recordsToExport = useMemo(() => {
    if (isMonthMode) {
      return filteredData;
    } else {
      const validIds = new Set(filteredData.map(e => e.employeeId));
      return employees.filter(e => validIds.has(e.employeeId));
    }
  }, [employees, filteredData, isMonthMode]);

  const totalExtended = useMemo(() => filteredData.reduce((sum, e) => sum + (e.extendedHoursIncentive || 0), 0), [filteredData]);
  const totalWeekend = useMemo(() => filteredData.reduce((sum, e) => sum + (e.weekendIncentive || 0), 0), [filteredData]);
  const totalIncentive = useMemo(() => filteredData.reduce((sum, e) => sum + (e.totalIncentive || 0), 0), [filteredData]);

  const handleAdd = () => { setFormOpen(true); };
  
  const handleSave = (emp: Employee) => {
    addEmployee(emp);
    setFormOpen(false);
  };

  const handleExport = async () => {
    exportEmployeesToExcel(recordsToExport);

    // If exporting in month mode, optionally mark them as sent to BD
    if (isMonthMode) {
      const recordsToUpdate = recordsToExport
        .filter((rec) => !rec.sendToBd)
        .map((rec) => ({ ...rec, sendToBd: true }));

      if (recordsToUpdate.length > 0) {
        await updateMultipleEmployees(recordsToUpdate);
      }
    }
  };

  const baseColumns: GridColDef[] = [
    { field: 'employeeId', headerName: 'Emp ID', width: 130 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 200 },
    {
      field: 'role', headerName: 'Role', width: 100,
      renderCell: (params: GridRenderCellParams) => <RoleChip role={params.value} />,
    },
  ];

  const monthColumns: GridColDef[] = [
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
  ];

  const actionColumn: GridColDef = {
    field: 'actions', headerName: 'Actions', width: 150, sortable: false, filterable: false,
    renderCell: (params: GridRenderCellParams) => (
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', height: '100%' }}>
        <Tooltip title="View Records / History">
          <IconButton size="small" color="primary" id={`history-emp-${params.row.id}`}
            onClick={() => setHistoryEmpId((params.row as Employee).employeeId)}>
            <HistoryRounded fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    ),
  };

  const columns = isMonthMode ? [...baseColumns, ...monthColumns, actionColumn] : [...baseColumns, actionColumn];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
            Employee Directory
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filteredData.length} records
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<FileDownloadRounded />}
            onClick={handleExport} id="export-employees-btn">
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
          rows={filteredData}
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

      {/* ── Summary Card for Month Mode ── */}
      {isMonthMode && (
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
      )}

      <EmployeeForm open={formOpen} employee={null} readOnly={false} onSave={handleSave} onClose={() => setFormOpen(false)} />
      
      <EmployeeHistoryDrawer
        employeeId={historyEmpId}
        onClose={() => setHistoryEmpId(null)}
      />
    </Box>
  );
};

export default EmployeesPage;
