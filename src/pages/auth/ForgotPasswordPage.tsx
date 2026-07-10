import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Alert, Link, InputAdornment } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { EmailRounded } from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';

const ForgotPasswordPage: React.FC = () => {
  const { sendPasswordResetEmail, loading, error } = useAuthStore();

  const [email, setEmail] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccess(false);

    if (!email) {
      setLocalError('Please enter your email address.');
      return;
    }

    try {
      await sendPasswordResetEmail(email);
      setSuccess(true);
      setEmail('');
    } catch (err: any) {
      // Error handled by store
    }
  };

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
            Reset Password
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enter your email to receive a password reset link
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
            Password reset link has been sent to your email! Please check your inbox.
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            id="forgot-email"
            label="Email Address"
            type="email"
            fullWidth
            required
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailRounded fontSize="small" color="action" />
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
            disabled={loading}
            sx={{ mt: 2, py: 1.2, borderRadius: 2, fontWeight: 600 }}
          >
            {loading ? 'Sending link...' : 'Send Reset Link'}
          </Button>
        </form>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Remembered your password?{' '}
            <Link component={RouterLink} to="/login" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
              Sign In Here
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default ForgotPasswordPage;
