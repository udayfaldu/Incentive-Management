import React, { useState } from 'react';
import {
  Box, Grid, Typography, TextField, Button, Paper, Divider, Alert,
  InputAdornment, Slider, Stack, Chip, Table, TableBody, TableCell,
  TableHead, TableRow, IconButton, Tooltip,
} from '@mui/material';
import {
  SaveRounded, RestartAltRounded, InfoOutlined,
  AddRounded, DeleteRounded, DragHandleRounded,
} from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import { useSettingsStore, DEFAULT_SETTINGS } from '../store/settingsStore';
import type { IncentiveSettings, ExtendedTier } from '../types';
import {
  getSortedTiers,
} from '../services/incentiveService';
import ConfirmDialog from '../components/common/ConfirmDialog';

// ─── Reusable amount field ─────────────────────────────────────────────────
const AmountField = ({ label, value, onChange, id }: {
  label: string; value: number; onChange: (v: number) => void; id: string;
}) => (
  <TextField
    id={id}
    label={label}
    type="number"
    size="small"
    fullWidth
    value={value || ''} // Show empty string if value is 0
    onChange={(e) => onChange(Number(e.target.value) || 0)} // Fallback to 0 if cleared
    onFocus={(e) => e.target.select()} // Auto-select text on click
    slotProps={{
      input: {
        startAdornment: <InputAdornment position="start"><Typography variant="body2" sx={{ color: 'text.secondary' }}>₹</Typography></InputAdornment>,
      },
      htmlInput: { min: 0, step: 50 },
    }}
  />
);

const SettingsPage: React.FC = () => {
  const settingsByMonth = useSettingsStore((s) => s.settingsByMonth);
  const { updateSettingsForMonth, resetSettingsForMonth } = useSettingsStore();

  const selectedMonth = new Date().getMonth() + 1;
  const selectedYear = new Date().getFullYear();

  const currentMonthSettings = React.useMemo(() => {
    const key = `${selectedYear}-${selectedMonth}`;
    if (settingsByMonth[key]) return settingsByMonth[key];
    
    // If no settings exist for the current month, inherit the most recent settings
    const sortedKeys = Object.keys(settingsByMonth).sort((a, b) => {
      const [yearA, monthA] = a.split('-').map(Number);
      const [yearB, monthB] = b.split('-').map(Number);
      if (yearA !== yearB) return yearB - yearA;
      return monthB - monthA;
    });
    
    if (sortedKeys.length > 0) {
      return settingsByMonth[sortedKeys[0]];
    }
    
    return DEFAULT_SETTINGS;
  }, [settingsByMonth, selectedMonth, selectedYear]);

  const [local, setLocal] = useState<IncentiveSettings>(() => ({
    ...currentMonthSettings,
    extendedTiers: currentMonthSettings.extendedTiers.map((t) => ({ ...t })),
  }));

  React.useEffect(() => {
    setLocal({
      ...currentMonthSettings,
      extendedTiers: currentMonthSettings.extendedTiers.map((t) => ({ ...t })),
    });
  }, [currentMonthSettings]);

  const [saved, setSaved] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const updateWeekendAmount = (role: 'Senior' | 'Junior', field: 'halfDay' | 'fullDay', value: number) => {
    setLocal((prev) => {
      if (role === 'Senior') {
        return {
          ...prev,
          weekendSenior: {
            ...prev.weekendSenior,
            [field]: value,
          },
        };
      } else {
        return {
          ...prev,
          weekendJunior: {
            ...prev.weekendJunior,
            [field]: value,
          },
        };
      }
    });
  };

  const updateTier = (id: string, field: keyof ExtendedTier, value: string | number | null) => {
    setLocal((prev) => ({
      ...prev,
      extendedTiers: prev.extendedTiers.map((t) =>
        t.id === id ? { ...t, [field]: value } : t
      ),
    }));
  };

  const addTier = () => {
    const sorted = getSortedTiers(local);
    const lastTier = sorted[sorted.length - 1];
    const newFrom = lastTier ? (lastTier.to !== null ? lastTier.to + 1 : lastTier.from + 20) : local.minimumHours;
    const newTier: ExtendedTier = {
      id: uuidv4(),
      from: newFrom,
      to: null,
      seniorAmount: 0,
      juniorAmount: 0,
    };
    // Make the previous last tier's `to` finite if it was open-ended
    const updatedTiers = local.extendedTiers.map((t) =>
      t.id === lastTier?.id && t.to === null
        ? { ...t, to: newFrom - 1 }
        : t
    );
    setLocal((prev) => ({ ...prev, extendedTiers: [...updatedTiers, newTier] }));
  };

  const deleteTier = (id: string) => {
    setLocal((prev) => ({
      ...prev,
      extendedTiers: prev.extendedTiers.filter((t) => t.id !== id),
    }));
  };

  // ─── Save / Reset ─────────────────────────────────────────────────────────
  const handleSave = () => {
    updateSettingsForMonth(selectedMonth, selectedYear, local);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    resetSettingsForMonth(selectedMonth, selectedYear);
    setResetOpen(false);
  };



  const sortedTiers = getSortedTiers(local);



  return (
    <Box>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>Settings</Typography>
          <Typography variant="body2" color="text.secondary">
            Configure incentive rules. Changes apply automatically to all future calculations. Historical data is preserved.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" color="inherit" startIcon={<RestartAltRounded />}
            onClick={() => setResetOpen(true)} id="reset-settings-btn">
            Reset
          </Button>
          <Button variant="contained" startIcon={<SaveRounded />} onClick={handleSave}
            disableElevation id="save-settings-btn">
            Save & Apply
          </Button>
        </Stack>
      </Box>



      {saved && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Settings saved successfully! Future calculations will use these settings.
        </Alert>
      )}

      <Grid container spacing={3}>

        {/* ── Minimum Hours ── */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>
              Minimum Hours Threshold
            </Typography>
            <Divider sx={{ mb: 2.5 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }} gutterBottom>
              Below this value = <strong>₹0</strong> extended incentive regardless of tiers.
              Currently: <strong>{local.minimumHours} hrs</strong>
            </Typography>
            <Slider
              id="min-hours-slider"
              value={local.minimumHours}
              onChange={(_, v) => setLocal((p) => ({ ...p, minimumHours: v as number }))}
              min={100}
              max={220}
              step={1}
              marks={[
                { value: 140, label: '140' },
                { value: 160, label: '160' },
                { value: 170, label: '170' },
                { value: 185, label: '185' },
                { value: 200, label: '200' },
              ]}
              valueLabelDisplay="auto"
              sx={{ mt: 3 }}
            />
            <Alert severity="info" icon={<InfoOutlined fontSize="small" />} sx={{ mt: 2 }}>
              The first tier's <strong>From</strong> value should typically match or exceed this threshold.
            </Alert>
          </Paper>
        </Grid>

        {/* ── Weekend Incentives ── */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>
              Weekend / Public Holiday Incentives
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
              ≤ 4 hrs per entry = Half Day &nbsp;|&nbsp; &gt; 4 hrs per entry = Full Day
            </Typography>
            <Divider sx={{ mb: 2.5 }} />

            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }} gutterBottom>Senior</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <AmountField id="wknd-senior-half" label="Half Day (≤ 4 hrs)" value={local.weekendSenior.halfDay}
                  onChange={(v) => updateWeekendAmount('Senior', 'halfDay', v)} />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <AmountField id="wknd-senior-full" label="Full Day (> 4 hrs)" value={local.weekendSenior.fullDay}
                  onChange={(v) => updateWeekendAmount('Senior', 'fullDay', v)} />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'secondary.main', mt: 1 }} gutterBottom>Junior</Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <AmountField id="wknd-junior-half" label="Half Day (≤ 4 hrs)" value={local.weekendJunior.halfDay}
                  onChange={(v) => updateWeekendAmount('Junior', 'halfDay', v)} />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <AmountField id="wknd-junior-full" label="Full Day (> 4 hrs)" value={local.weekendJunior.fullDay}
                  onChange={(v) => updateWeekendAmount('Junior', 'fullDay', v)} />
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* ── Extended Hours Tiers ── */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Extended Hours Incentive Tiers
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Add unlimited tiers. For each weekday hours value, the matching tier's amount is awarded.
                  Leave <strong>To</strong> empty for an open-ended (∞) tier.
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddRounded />}
                onClick={addTier}
                disableElevation
                id="add-tier-btn"
              >
                Add Tier
              </Button>
            </Box>

            <Divider sx={{ my: 2 }} />

            {sortedTiers.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  No tiers defined. All weekday hours above the minimum will earn ₹0 extended incentive.
                </Typography>
                <Button variant="outlined" size="small" startIcon={<AddRounded />} onClick={addTier} sx={{ mt: 1 }}>
                  Add First Tier
                </Button>
              </Box>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.8rem', bgcolor: '#F1F3F5' } }}>
                      <TableCell sx={{ width: 36 }} />
                      <TableCell>From (hrs, inclusive)</TableCell>
                      <TableCell>To (hrs, inclusive)</TableCell>
                      <TableCell>Senior Amount (₹)</TableCell>
                      <TableCell>Junior Amount (₹)</TableCell>
                      <TableCell sx={{ width: 80 }}>Preview</TableCell>
                      <TableCell sx={{ width: 50 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedTiers.map((tier, idx) => {
                      const isLast = idx === sortedTiers.length - 1;
                      const rangeLabel = tier.to !== null
                        ? `${tier.from}–${tier.to}`
                        : `${tier.from}+`;
                      return (
                        <TableRow key={tier.id} hover sx={{ '& td': { py: 1 } }}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.disabled' }}>
                              <DragHandleRounded fontSize="small" />
                            </Box>
                          </TableCell>

                          {/* From */}
                          <TableCell>
                            <TextField
                              id={`tier-from-${idx}`}
                              size="small"
                              type="number"
                              value={tier.from || ''}
                              onChange={(e) => updateTier(tier.id, 'from', Number(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              slotProps={{ htmlInput: { min: 0, step: 1 } }}
                              sx={{ width: 100 }}
                            />
                          </TableCell>

                          {/* To */}
                          <TableCell>
                            <TextField
                              id={`tier-to-${idx}`}
                              size="small"
                              type="number"
                              value={tier.to ?? ''}
                              placeholder="∞ (open)"
                              onChange={(e) => {
                                const val = e.target.value;
                                updateTier(tier.id, 'to', val === '' ? null : Number(val));
                              }}
                              onFocus={(e) => e.target.select()}
                              slotProps={{ htmlInput: { min: tier.from, step: 1 } }}
                              sx={{ width: 120 }}
                            />
                          </TableCell>

                          {/* Senior Amount */}
                          <TableCell>
                            <TextField
                              id={`tier-senior-${idx}`}
                              size="small"
                              type="number"
                              value={tier.seniorAmount || ''}
                              onChange={(e) => updateTier(tier.id, 'seniorAmount', Number(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              slotProps={{
                                input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
                                htmlInput: { min: 0, step: 50 },
                              }}
                              sx={{ width: 130 }}
                            />
                          </TableCell>

                          {/* Junior Amount */}
                          <TableCell>
                            <TextField
                              id={`tier-junior-${idx}`}
                              size="small"
                              type="number"
                              value={tier.juniorAmount || ''}
                              onChange={(e) => updateTier(tier.id, 'juniorAmount', Number(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              slotProps={{
                                input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
                                htmlInput: { min: 0, step: 50 },
                              }}
                              sx={{ width: 130 }}
                            />
                          </TableCell>

                          {/* Preview badge */}
                          <TableCell>
                            <Chip
                              label={rangeLabel}
                              size="small"
                              color={isLast ? 'primary' : 'default'}
                              variant={isLast ? 'filled' : 'outlined'}
                              sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                            />
                          </TableCell>

                          {/* Delete */}
                          <TableCell>
                            <Tooltip title="Delete tier">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => deleteTier(tier.id)}
                                id={`delete-tier-${idx}`}
                              >
                                <DeleteRounded fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Summary row */}
                <Box sx={{ mt: 1.5, px: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {sortedTiers.length} tier{sortedTiers.length !== 1 ? 's' : ''} defined
                  </Typography>
                  {sortedTiers.some((t) => t.to === null) && (
                    <Chip label="Has open-ended tier ✓" size="small" color="success" variant="outlined"
                      sx={{ fontSize: '0.68rem', height: 18 }} />
                  )}
                  {!sortedTiers.some((t) => t.to === null) && sortedTiers.length > 0 && (
                    <Chip label="⚠ No open-ended tier — some hours may not match" size="small" color="warning"
                      variant="outlined" sx={{ fontSize: '0.68rem', height: 18 }} />
                  )}
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>



      </Grid>

      <ConfirmDialog
        open={resetOpen}
        title={`Reset settings`}
        message={`This will reset the global settings (including custom tiers) to defaults.`}
        confirmLabel="Reset"
        severity="warning"
        onConfirm={handleReset}
        onCancel={() => setResetOpen(false)}
      />
    </Box>
  );
};

export default SettingsPage;
