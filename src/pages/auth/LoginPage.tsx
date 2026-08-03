import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Alert, Link, InputAdornment, IconButton } from '@mui/material';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { EmailRounded, LockRounded, VisibilityOffRounded, VisibilityRounded } from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, loading, error } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Successful reset redirect message
  const [redirectSuccessMessage, setRedirectSuccessMessage] = useState<string | null>(
    (location.state as any)?.message || null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    try {
      await signIn(email, password);
      navigate('/');
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
            Sign In
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Incentive Management System
          </Typography>
        </Box>

        {redirectSuccessMessage && (
          <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setRedirectSuccessMessage(null)}>
            {redirectSuccessMessage}
          </Alert>
        )}

        {(localError || error) && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
            {localError || error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            id="login-email"
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

          <TextField
            id="login-password"
            label="Password"
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

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, mb: 2.5 }}>
            <Link component={RouterLink} to="/forgot-password" variant="body2" color="primary" sx={{ fontWeight: 500 }}>
              Forgot Password?
            </Link>
          </Box>

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disableElevation
            disabled={loading}
            sx={{ py: 1.2, borderRadius: 2, fontWeight: 600 }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default LoginPage;
