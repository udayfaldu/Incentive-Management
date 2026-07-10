import React from 'react';
import {
  Box, Button, IconButton, TextField, Typography,
  Table, TableBody, TableCell, TableHead, TableRow, Chip, Tooltip,
} from '@mui/material';
import { AddRounded, DeleteRounded } from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import type { WeekendEntry, Role, IncentiveSettings } from '../../types';
import { getWeekendEntryType } from '../../services/incentiveService';

interface WeekendEntryEditorProps {
  entries: WeekendEntry[];
  role: Role;
  onChange: (entries: WeekendEntry[]) => void;
  error?: string;
  settings: IncentiveSettings;
  disabled?: boolean;
}

const WeekendEntryEditor: React.FC<WeekendEntryEditorProps> = ({ entries, role, onChange, error, settings, disabled }) => {

  const addRow = () => onChange([...entries, { id: uuidv4(), date: '', hours: 0 }]);

  const updateRow = (id: string, field: 'date' | 'hours', value: string | number) => {
    onChange(entries.map((e) =>
      e.id === id ? { ...e, [field]: field === 'hours' ? Number(value) : value } : e
    ));
  };

  const removeRow = (id: string) => onChange(entries.filter((e) => e.id !== id));

  const totalHours = entries.reduce((s, e) => s + (e.hours || 0), 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          Weekend / Public Holiday Entries
        </Typography>
        {!disabled && (
          <Button size="small" startIcon={<AddRounded />} onClick={addRow} variant="outlined" id="add-weekend-entry-btn">
            Add Entry
          </Button>
        )}
      </Box>

      {error && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
          {error}
        </Typography>
      )}

      {entries.length === 0 ? (
        <Box sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2, p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {disabled ? 'No weekend entries.' : 'No weekend entries. Click "Add Entry" to add one.'}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem' }}>Date (DD-MM-YYYY)</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem' }}>Hours</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '0.78rem' }}>Amount</TableCell>
                {!disabled && <TableCell width={40} />}
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry, idx) => {
                const { label, amount } = getWeekendEntryType(entry.hours, role, settings);
                return (
                  <TableRow key={entry.id} hover>
                    <TableCell>
                      <TextField
                        id={`weekend-date-${idx}`}
                        size="small"
                        placeholder="DD-MM-YYYY"
                        value={entry.date}
                        onChange={(e) => updateRow(entry.id, 'date', e.target.value)}
                        sx={{ minWidth: 130 }}
                        disabled={disabled}
                        slotProps={{ htmlInput: { pattern: '\\d{2}-\\d{2}-\\d{4}' } }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        id={`weekend-hours-${idx}`}
                        size="small"
                        type="number"
                        value={entry.hours}
                        onChange={(e) => updateRow(entry.id, 'hours', e.target.value)}
                        disabled={disabled}
                        slotProps={{ htmlInput: { min: 0, max: 24, step: 0.5 } }}
                        sx={{ width: 80 }}
                      />
                    </TableCell>
                    <TableCell>
                      {entry.hours > 0 ? (
                        <Chip label={label} size="small"
                          color={label === 'Full Day' ? 'primary' : 'warning'} variant="outlined"
                          sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
                      ) : (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'success.main' }}>
                        {entry.hours > 0 ? `₹${amount.toLocaleString('en-IN')}` : '—'}
                      </Typography>
                    </TableCell>
                    {!disabled && (
                      <TableCell>
                        <Tooltip title="Remove">
                          <IconButton size="small" color="error" onClick={() => removeRow(entry.id)}
                            id={`remove-weekend-${idx}`}>
                            <DeleteRounded fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Box sx={{ px: 2, py: 1, bgcolor: 'background.default', display: 'flex', justifyContent: 'flex-end', gap: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Total Weekend Hours: <strong>{totalHours}</strong>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Entries: <strong>{entries.length}</strong>
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default WeekendEntryEditor;
