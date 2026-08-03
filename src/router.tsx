import React, { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import SettingsPage from './pages/SettingsPage';
import ImportExportPage from './pages/ImportExportPage';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

import { useAuthStore } from './store/authStore';

// Loading Spinner Component
const FullScreenLoader: React.FC = () => (
  <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
    <CircularProgress size={48} />
  </Box>
);

// Protected Route Guard
const ProtectedRoute: React.FC = () => {
  const { session, initialized } = useAuthStore();

  if (!initialized) {
    return <FullScreenLoader />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

// Public Route Guard (Redirects to dashboard if already logged in)
const PublicRoute: React.FC = () => {
  const { session, initialized } = useAuthStore();

  if (!initialized) {
    return <FullScreenLoader />;
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

const router = createBrowserRouter([
  // Standalone Auth Routes (Reset password needs temporary recovery session)
  { path: 'reset-password', element: <ResetPasswordPage /> },
  
  // Public Auth Routes
  {
    element: <PublicRoute />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
    ],
  },
  // Protected Admin Routes
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'employees', element: <EmployeesPage /> },
          { path: 'import-export', element: <ImportExportPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  // Catch-all
  { path: '*', element: <Navigate to="/" replace /> },
]);

const AppRouter: React.FC = () => {
  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return <RouterProvider router={router} />;
};

export default AppRouter;
