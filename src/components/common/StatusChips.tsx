import React from 'react';
import { Chip } from '@mui/material';
import type { Role } from '../../types';

interface RoleChipProps {
  role: Role;
}

export const RoleChip: React.FC<RoleChipProps> = ({ role }) => (
  <Chip
    label={role}
    size="small"
    color={role === 'Senior' ? 'primary' : 'secondary'}
    variant="outlined"
    sx={{ fontWeight: 600, fontSize: '0.72rem' }}
  />
);

interface IncentiveChipProps {
  amount: number;
}

export const IncentiveChip: React.FC<IncentiveChipProps> = ({ amount }) => (
  <Chip
    label={`₹${amount.toLocaleString('en-IN')}`}
    size="small"
    color={amount > 0 ? 'success' : 'default'}
    variant={amount > 0 ? 'filled' : 'outlined'}
    sx={{ fontWeight: 600, fontSize: '0.72rem' }}
  />
);
