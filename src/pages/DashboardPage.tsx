import React, { useMemo, useState } from 'react';
import {
  Box, Grid, Typography, MenuItem, TextField, Paper, Divider,
  Table, TableBody, TableCell, TableHead, TableRow, Chip,
  OutlinedInput, InputLabel, FormControl, Select, Checkbox, ListItemText,
  InputAdornment, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import {
  PeopleAltRounded, CurrencyRupeeRounded,
  CalendarMonthRounded, CalendarTodayRounded,
  BadgeRounded, FilterAltRounded,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useEmployeeStore } from '../store/employeeStore';
import { MONTH_OPTIONS, MONTHS } from '../types';
import StatCard from '../components/common/StatCard';
import { RoleChip } from '../components/common/StatusChips';
import { useTheme } from '@mui/material/styles';

const CURRENT_MONTH = new Date().getMonth() + 1;
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 2 + i);

const DashboardPage: React.FC = () => {
  const { employees } = useEmployeeStore();
  const theme = useTheme();

  // Filter States
  const [filterMonths, setFilterMonths] = useState<number[]>(() => [CURRENT_MONTH]);
  const [filterYear, setFilterYear] = useState<number>(CURRENT_YEAR);
  const [filterRole, setFilterRole] = useState<'All' | 'Senior' | 'Junior'>('All');
  const [filterEmployees, setFilterEmployees] = useState<string[]>([]);
  const [chartView, setChartView] = useState<'employee' | 'month'>('employee');

  // Unique employees list extracted from the store data for the multi-select filter, filtered by selected role
  const uniqueEmployeeList = useMemo(() => {
    const seen = new Set<string>();
    const list: { employeeId: string; name: string; role: 'Senior' | 'Junior' }[] = [];
    for (const emp of employees) {
      if (emp.employeeId && !seen.has(emp.employeeId)) {
        seen.add(emp.employeeId);
        list.push({ employeeId: emp.employeeId, name: emp.name, role: emp.role });
      }
    }
    const sorted = list.sort((a, b) => a.name.localeCompare(b.name));
    if (filterRole === 'All') {
      return sorted;
    }
    return sorted.filter((emp) => emp.role === filterRole);
  }, [employees, filterRole]);

  // Apply all filter states dynamically
  const filtered = useMemo(() => {
    return employees.filter((emp) => {
      const matchesYear = emp.year === filterYear;
      const matchesMonth = filterMonths.length === 0 || filterMonths.includes(emp.month);
      const matchesRole = filterRole === 'All' || emp.role === filterRole;
      const matchesEmployee = filterEmployees.length === 0 || filterEmployees.includes(emp.employeeId);

      return matchesYear && matchesMonth && matchesRole && matchesEmployee;
    });
  }, [employees, filterYear, filterMonths, filterRole, filterEmployees]);

  // Aggregate records by employee to prevent duplicates across multiple months
  const aggregatedEmployees = useMemo(() => {
    const map = new Map<string, { 
      id: string; 
      employeeId: string; 
      name: string; 
      role: 'Senior' | 'Junior'; 
      totalIncentive: number; 
      extendedHoursIncentive: number; 
      weekendIncentive: number; 
      weekdayHours: number;
      totalWeekendHours: number;
      totalHours: number;
      leaves: number;
    }>();
    
    for (const emp of filtered) {
      if (!map.has(emp.employeeId)) {
        map.set(emp.employeeId, {
          id: emp.employeeId,
          employeeId: emp.employeeId,
          name: emp.name,
          role: emp.role,
          totalIncentive: 0,
          extendedHoursIncentive: 0,
          weekendIncentive: 0,
          weekdayHours: 0,
          totalWeekendHours: 0,
          totalHours: 0,
          leaves: 0,
        });
      }
      const existing = map.get(emp.employeeId)!;
      existing.totalIncentive += emp.totalIncentive || 0;
      existing.extendedHoursIncentive += emp.extendedHoursIncentive || 0;
      existing.weekendIncentive += emp.weekendIncentive || 0;
      existing.weekdayHours += emp.weekdayHours || 0;
      existing.totalWeekendHours += emp.totalWeekendHours || 0;
      existing.totalHours += emp.totalHours || 0;
      existing.leaves += emp.leaves || 0;
    }
    
    return Array.from(map.values()).sort((a, b) => b.totalIncentive - a.totalIncentive);
  }, [filtered]);

  const totalEmployees = aggregatedEmployees.length;
  const totalIncentive = filtered.reduce((s, e) => s + e.totalIncentive, 0);
  const seniorCount = aggregatedEmployees.filter((e) => e.role === 'Senior').length;
  const juniorCount = aggregatedEmployees.filter((e) => e.role === 'Junior').length;

  // Subtitle showing selected months
  const subtitleLabel = useMemo(() => {
    if (filterMonths.length === 0) return 'No months selected';
    if (filterMonths.length === 12) return `All Months (${filterYear})`;
    if (filterMonths.length <= 4) {
      return filterMonths.map((m) => MONTHS[m - 1]).join(', ') + ` (${filterYear})`;
    }
    return `${filterMonths.length} Months (${filterYear})`;
  }, [filterMonths, filterYear]);

  // Value for the Period KPI Card
  const periodValue = useMemo(() => {
    if (filterMonths.length === 0) return 'No Month';
    if (filterMonths.length === 12) return 'All Months';
    if (filterMonths.length === 1) return MONTHS[filterMonths[0] - 1];
    return `${filterMonths.length} Months`;
  }, [filterMonths]);


  const chartData = aggregatedEmployees
    .slice(0, 10)
    .map((e) => ({
      name: e.name.split(' ')[0],
      Extended: e.extendedHoursIncentive,
      Weekend: e.weekendIncentive,
    }));

  const monthData = useMemo(() => {
    const monthsToShow = filterMonths.length === 0 ? Array.from({ length: 12 }, (_, i) => i + 1) : [...filterMonths].sort((a, b) => a - b);
    return monthsToShow.map((m) => {
      const monthRecords = filtered.filter((e) => e.month === m);
      const extendedSum = monthRecords.reduce((sum, e) => sum + e.extendedHoursIncentive, 0);
      const weekendSum = monthRecords.reduce((sum, e) => sum + e.weekendIncentive, 0);
      return {
        name: MONTHS[m - 1].substring(0, 3),
        Extended: extendedSum,
        Weekend: weekendSum,
      };
    });
  }, [filtered, filterMonths]);

  const topEarners = aggregatedEmployees.slice(0, 5);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {subtitleLabel} — Incentive Overview
          </Typography>
        </Box>
      </Box>

      {/* ── Filter Bar ── */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',
          borderRadius: 3,
          bgcolor: '#F8F9FA',
        }}
      >
        {/* Filters Header Label */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1.5, borderRight: '1px solid', borderColor: 'divider', minHeight: 32 }}>
          <FilterAltRounded fontSize="small" sx={{ color: 'text.secondary' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Filters
          </Typography>
        </Box>

        {/* Year Select */}
        <TextField
          id="dashboard-year"
          select
          size="small"
          label="Year"
          value={filterYear}
          onChange={(e) => setFilterYear(Number(e.target.value))}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <CalendarTodayRounded fontSize="small" sx={{ color: 'text.secondary', opacity: 0.8 }} />
                </InputAdornment>
              ),
            }
          }}
          sx={{ minWidth: 120, bgcolor: 'background.paper', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        >
          {YEAR_OPTIONS.map((y) => (
            <MenuItem key={y} value={y}>{y}</MenuItem>
          ))}
        </TextField>

        {/* Month Multi-Select */}
        <FormControl size="small" sx={{ minWidth: 180, bgcolor: 'background.paper', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
          <InputLabel id="month-filter-label">Months</InputLabel>
          <Select
            labelId="month-filter-label"
            id="month-filter"
            multiple
            value={filterMonths}
            onChange={(e) => setFilterMonths(e.target.value as number[])}
            input={<OutlinedInput label="Months" />}
            startAdornment={
              <InputAdornment position="start">
                <CalendarMonthRounded fontSize="small" sx={{ color: 'text.secondary', opacity: 0.8 }} />
              </InputAdornment>
            }
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as number[]).map((val) => (
                  <Chip
                    key={val}
                    label={MONTHS[val - 1]}
                    size="small"
                    variant="outlined"
                    sx={{ height: 22, fontSize: '0.75rem', fontWeight: 500 }}
                  />
                ))}
              </Box>
            )}
          >
            {MONTH_OPTIONS.map((m) => (
              <MenuItem key={m.value} value={m.value}>
                <Checkbox checked={filterMonths.includes(m.value)} size="small" />
                <ListItemText primary={m.label} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Role Select */}
        <TextField
          id="dashboard-role"
          select
          size="small"
          label="Role"
          value={filterRole}
          onChange={(e) => {
            const nextRole = e.target.value as 'All' | 'Senior' | 'Junior';
            setFilterRole(nextRole);
            if (nextRole !== 'All') {
              setFilterEmployees((prev) => {
                const allowedIds = new Set(
                  employees
                    .filter((emp) => emp.role === nextRole)
                    .map((emp) => emp.employeeId)
                );
                return prev.filter((id) => allowedIds.has(id));
              });
            }
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <BadgeRounded fontSize="small" sx={{ color: 'text.secondary', opacity: 0.8 }} />
                </InputAdornment>
              ),
            }
          }}
          sx={{ minWidth: 140, bgcolor: 'background.paper', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        >
          <MenuItem value="All">All Roles</MenuItem>
          <MenuItem value="Senior">Senior</MenuItem>
          <MenuItem value="Junior">Junior</MenuItem>
        </TextField>

        {/* Employee List Multi-Select */}
        <FormControl size="small" sx={{ minWidth: 240, flexGrow: 1, maxWidth: 380, bgcolor: 'background.paper', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
          <InputLabel id="employee-filter-label">Employees</InputLabel>
          <Select
            labelId="employee-filter-label"
            id="employee-filter"
            multiple
            value={filterEmployees}
            onChange={(e) => setFilterEmployees(e.target.value as string[])}
            input={<OutlinedInput label="Employees" />}
            startAdornment={
              <InputAdornment position="start">
                <PeopleAltRounded fontSize="small" sx={{ color: 'text.secondary', opacity: 0.8 }} />
              </InputAdornment>
            }
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as string[]).map((id) => {
                  const emp = employees.find((e) => e.employeeId === id);
                  return (
                    <Chip
                      key={id}
                      label={emp ? emp.name : id}
                      size="small"
                      variant="outlined"
                      sx={{ height: 22, fontSize: '0.75rem', fontWeight: 500 }}
                    />
                  );
                })}
              </Box>
            )}
          >
            {uniqueEmployeeList.length === 0 ? (
              <MenuItem disabled>No employees found</MenuItem>
            ) : (
              uniqueEmployeeList.map((emp) => (
                <MenuItem key={emp.employeeId} value={emp.employeeId}>
                  <Checkbox checked={filterEmployees.includes(emp.employeeId)} size="small" />
                  <ListItemText primary={`${emp.name} (${emp.employeeId})`} />
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      </Paper>

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Employees"
            value={totalEmployees}
            subtitle={`${seniorCount} Senior · ${juniorCount} Junior`}
            icon={<PeopleAltRounded />}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Incentive"
            value={`₹${totalIncentive.toLocaleString('en-IN')}`}
            subtitle="This period"
            icon={<CurrencyRupeeRounded />}
            color="success"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Period"
            value={periodValue}
            subtitle={`Year ${filterYear}`}
            icon={<CalendarMonthRounded />}
            color="secondary"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        {/* Bar Chart */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 2.5, height: 370 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {chartView === 'employee' ? 'Incentive Breakdown (Top 10)' : 'Incentive Breakdown by Month'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {chartView === 'employee'
                    ? 'Extended Hours vs Weekend/PH incentives per employee'
                    : 'Extended Hours vs Weekend/PH incentives per month'}
                </Typography>
              </Box>
              <ToggleButtonGroup
                value={chartView}
                exclusive
                onChange={(_, value) => {
                  if (value !== null) setChartView(value);
                }}
                size="small"
                aria-label="chart view"
                sx={{
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 0.25,
                  '& .MuiToggleButton-root': {
                    px: 1.5,
                    py: 0.5,
                    border: 'none',
                    borderRadius: 1.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    '&.Mui-selected': {
                      bgcolor: 'action.selected',
                    }
                  }
                }}
              >
                <ToggleButton value="employee" aria-label="by employee">
                  By Employee
                </ToggleButton>
                <ToggleButton value="month" aria-label="by month">
                  By Month
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {filtered.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
                <Typography variant="body2" color="text.secondary">
                  No data for this period
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={270}>
                <BarChart data={chartView === 'employee' ? chartData : monthData} margin={{ top: 12, right: 16, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} />
                  <YAxis
                    tickFormatter={(v) => `₹${v / 1000}k`}
                    tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                  />
                  <RTooltip
                    formatter={(value, name) => [`₹${Number(value ?? 0).toLocaleString('en-IN')}`, String(name)]}
                    contentStyle={{ borderRadius: 8, border: `1px solid ${theme.palette.divider}`, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Extended" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Weekend" fill={theme.palette.secondary.main} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Top Earners */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 2.5, height: 370, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>
              Top Earners
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Highest total incentives this period
            </Typography>
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', pl: 0 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }} align="right">Incentive</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topEarners.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                        No data for this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    topEarners.map((emp, idx) => (
                      <TableRow key={emp.id} hover>
                        <TableCell sx={{ pl: 0 }}>
                          <Chip
                            label={idx + 1}
                            size="small"
                            color={idx === 0 ? 'warning' : 'default'}
                            sx={{ width: 28, height: 22, fontSize: '0.7rem', fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{emp.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{emp.employeeId}</Typography>
                        </TableCell>
                        <TableCell><RoleChip role={emp.role} /></TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 700 }} color="success.main">
                            ₹{emp.totalIncentive.toLocaleString('en-IN')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </Grid>

        {/* Full Summary Table */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>
              All Employees Summary
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Month / Year</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Wkday Hrs</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Wknd Hrs</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Total Hrs</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Ext. Inc.</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Wknd Inc.</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Total Inc.</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {aggregatedEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                        No records found matching the selected filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    aggregatedEmployees.map((emp) => (
                      <TableRow key={emp.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{emp.name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">{emp.employeeId}</Typography>
                        </TableCell>
                        <TableCell><RoleChip role={emp.role} /></TableCell>
                        <TableCell>
                          <Typography variant="body2">{periodValue}</Typography>
                        </TableCell>
                        <TableCell align="right">{emp.weekdayHours}</TableCell>
                        <TableCell align="right">{emp.totalWeekendHours}</TableCell>
                        <TableCell align="right"><strong>{emp.totalHours}</strong></TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 500 }} color="primary.main">
                            {emp.extendedHoursIncentive > 0 ? `₹${emp.extendedHoursIncentive.toLocaleString('en-IN')}` : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 500 }} color="secondary.main">
                            {emp.weekendIncentive > 0 ? `₹${emp.weekendIncentive.toLocaleString('en-IN')}` : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={emp.totalIncentive > 0 ? `₹${emp.totalIncentive.toLocaleString('en-IN')}` : '₹0'}
                            size="small"
                            color={emp.totalIncentive > 0 ? 'success' : 'default'}
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
