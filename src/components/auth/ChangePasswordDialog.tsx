import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Alert, InputAdornment, IconButton, FormHelperText,
} from '@mui/material';
import { LockRounded, VisibilityOffRounded, VisibilityRounded } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_+\-\[\]\\\/]).{8,10}$/;

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { changePassword, signOut, loading } = useAuthStore();

  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccess(false);

    if (!oldPassword || !password || !confirmPassword) {
      setLocalError('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('New passwords do not match.');
      return;
    }

    if (!PASSWORD_REGEX.test(password)) {
      setLocalError('Password must be 8 to 10 characters long, and contain at least one uppercase letter, one lowercase letter, one digit, and one special character.');
      return;
    }

    try {
      await changePassword(oldPassword, password);
      setSuccess(true);
      setOldPassword('');
      setPassword('');
      setConfirmPassword('');
      
      // Successfully changed password: log out and navigate to login screen
      setTimeout(async () => {
        setSuccess(false);
        onClose();
        await signOut();
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to change password.');
    }
  };

  const handleCancel = () => {
    setOldPassword('');
    setPassword('');
    setConfirmPassword('');
    setLocalError(null);
    setSuccess(false);
    onClose();
  };

  const handleClose = (_event: any, reason: 'backdropClick' | 'escapeKeyDown') => {
    if (reason === 'backdropClick') return; // Prevent closing on backdrop click
    handleCancel();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Change Password</DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {localError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {localError}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
              Password updated successfully! Logging you out to sign in again...
            </Alert>
          )}

          <TextField
            id="change-old-pass"
            label="Current Password"
            type={showOldPassword ? 'text' : 'password'}
            fullWidth
            required
            margin="normal"
            size="small"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockRounded fontSize="small" color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowOldPassword(!showOldPassword)} edge="end">
                      {showOldPassword ? <VisibilityOffRounded fontSize="small" /> : <VisibilityRounded fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            id="change-pass"
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            required
            margin="normal"
            size="small"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockRounded fontSize="small" color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOffRounded fontSize="small" /> : <VisibilityRounded fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <FormHelperText sx={{ mx: 1.5, mt: 0.5, lineHeight: 1.25 }}>
            Must be 8 to 10 characters with at least 1 Capital letter, 1 small letter, 1 digit, and 1 special character.
          </FormHelperText>

          <TextField
            id="change-confirm-pass"
            label="Confirm New Password"
            type={showConfirmPassword ? 'text' : 'password'}
            fullWidth
            required
            margin="normal"
            size="small"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockRounded fontSize="small" color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                      {showConfirmPassword ? <VisibilityOffRounded fontSize="small" /> : <VisibilityRounded fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCancel} color="inherit" variant="outlined" size="small">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disableElevation disabled={loading || success} size="small">
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ChangePasswordDialog;
