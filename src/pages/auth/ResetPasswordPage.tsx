import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Paper, Alert, InputAdornment, IconButton, FormHelperText, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { LockRounded, VisibilityOffRounded, VisibilityRounded } from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_+\-\[\]\\\/]).{8,10}$/;

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { resetPassword, loading, error } = useAuthStore();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isChecking, setIsChecking] = useState(true);
  const [isExpired, setIsExpired] = useState(false);
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    const checkRecoveryStatus = () => {
      const hash = window.location.hash;
      const search = window.location.search;

      // 1. Check if URL contains error params indicating an invalid/expired link
      const hasUrlError =
        hash.includes('error=') ||
        search.includes('error=') ||
        hash.includes('error_description=') ||
        hash.includes('error_description=');

      if (hasUrlError) {
        setIsExpired(true);
        setIsChecking(false);
        return;
      }

      // 2. Check if URL contains active recovery token parameters (Supabase processing)
      const isProcessing =
        (hash.includes('access_token=') && hash.includes('type=recovery')) ||
        search.includes('code=');

      if (isProcessing) {
        // Set this immediately so the page knows it is in recovery mode
        sessionStorage.setItem('is_recovering_password', 'true');
        setIsExpired(false);
        setIsChecking(false);
        return;
      }

      // 3. Verify user has a valid recovery flow flag in sessionStorage
      const isRecovering = sessionStorage.getItem('is_recovering_password') === 'true';
      if (isRecovering) {
        setIsChecking(false);
      } else {
        setIsExpired(true);
        setIsChecking(false);
      }
    };

    checkRecoveryStatus();
  }, []);

  useEffect(() => {
    if (isExpired) {
      // Clear any potential session so they don't get redirected to the dashboard
      useAuthStore.getState().signOut();
      sessionStorage.removeItem('is_recovering_password');
    }
  }, [isExpired]);

  useEffect(() => {
    if (!isExpired) return;

    if (countdown <= 0) {
      navigate('/login');
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isExpired, countdown, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccess(false);

    if (!password || !confirmPassword) {
      setLocalError('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    if (!PASSWORD_REGEX.test(password)) {
      setLocalError('Password must be 8 to 10 characters long, and contain at least one uppercase letter, one lowercase letter, one digit, and one special character.');
      return;
    }

    try {
      await resetPassword(password);
      // Immediately sign out to clear recovery session and force login
      await useAuthStore.getState().signOut();
      sessionStorage.removeItem('is_recovering_password');
      setSuccess(true);
      setTimeout(() => {
        navigate('/login', { state: { message: 'Password reset successful! Please sign in with your new password.' } });
      }, 3000);
    } catch (err: any) {
      // Error handled by store
    }
  };

  if (isChecking) {
    return (
      <Box sx={{ display: 'flex', minHeight: '85vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (isExpired) {
    return (
      <Box sx={{ display: 'flex', minHeight: '85vh', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            width: '100%',
            maxWidth: 400,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            textAlign: 'center',
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: 'error.main' }}>
            Link Expired
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
            This password reset link has expired or has already been used. Please request a new password reset link.
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>
            Redirecting to login in {countdown} seconds...
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '85vh', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Set New Password
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Incentive Management System
          </Typography>
        </Box>

        {localError && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
            {localError}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2 }}>
            Password reset successful! Redirecting to login...
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            id="reset-pass"
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            required
            margin="normal"
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
            id="reset-confirm-pass"
            label="Confirm New Password"
            type={showConfirmPassword ? 'text' : 'password'}
            fullWidth
            required
            margin="normal"
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

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disableElevation
            disabled={loading || success}
            sx={{ mt: 3, py: 1.2, borderRadius: 2, fontWeight: 600 }}
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default ResetPasswordPage;
