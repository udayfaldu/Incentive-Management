import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Alert, Link, InputAdornment, IconButton, Grid, FormHelperText } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { EmailRounded, LockRounded, PersonRounded, VisibilityOffRounded, VisibilityRounded } from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';

// Regex validation rules:
// - At least 1 Cap letter: (?=.*[A-Z])
// - At least 1 small letter: (?=.*[a-z])
// - At least 1 digit: (?=.*\d)
// - At least 1 special char: (?=.*[!@#$%^&*(),.?":{}|<>_+\-\[\]\\\/])
// - Length 8 to 10: ^.{8,10}$
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_+\-\[\]\\\/]).{8,10}$/;

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, loading, error } = useAuthStore();

  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccess(false);

    if (!fname || !lname || !email || !password || !confirmPassword) {
      setLocalError('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    // Validate password pattern
    if (!PASSWORD_REGEX.test(password)) {
      setLocalError('Password must be 8 to 10 characters long, and contain at least one uppercase letter, one lowercase letter, one digit, and one special character.');
      return;
    }

    try {
      await signUp(fname, lname, email, password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
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
          maxWidth: 450,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Register Account
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
            Registration successful! Redirecting to login...
          </Alert>
        )}



        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                id="reg-fname"
                label="First Name"
                fullWidth
                required
                value={fname}
                onChange={(e) => setFname(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonRounded fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                id="reg-lname"
                label="Last Name"
                fullWidth
                required
                value={lname}
                onChange={(e) => setLname(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonRounded fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                id="reg-email"
                label="Email Address"
                type="email"
                fullWidth
                required
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
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                id="reg-password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                required
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
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                id="reg-confirm-password"
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                fullWidth
                required
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
            </Grid>
          </Grid>

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disableElevation
            disabled={loading || success}
            sx={{ mt: 3, py: 1.2, borderRadius: 2, fontWeight: 600 }}
          >
            {loading ? 'Creating Account...' : 'Register'}
          </Button>
        </form>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Link component={RouterLink} to="/login" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
              Sign In Here
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default RegisterPage;
