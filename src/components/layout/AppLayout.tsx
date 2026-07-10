import React, { useEffect } from 'react';
import { Box, LinearProgress, Alert } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useEmployeeStore } from '../../store/employeeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

const SIDEBAR_WIDTH = 220;

const AppLayout: React.FC = () => {
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);

  const loadingEmployees = useEmployeeStore((s) => s.loading);
  const loadingSettings = useSettingsStore((s) => s.loading);
  const errorEmployees = useEmployeeStore((s) => s.error);
  const errorSettings = useSettingsStore((s) => s.error);

  const session = useAuthStore((s) => s.session);

  // 1. Load data on mount and whenever user session changes
  useEffect(() => {
    const loadData = async () => {
      await fetchSettings();
      await fetchEmployees(useSettingsStore.getState().settingsByMonth);
    };
    loadData();
  }, [session, fetchSettings, fetchEmployees]);

  const isLoading = loadingEmployees || loadingSettings;
  const globalError = errorEmployees || errorSettings;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar width={SIDEBAR_WIDTH} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          width: `calc(100% - ${SIDEBAR_WIDTH}px)`,
        }}
      >
        {/* Loading Indicator at top of content area */}
        {isLoading && (
          <LinearProgress
            sx={{
              position: 'absolute',
              top: 0,
              left: SIDEBAR_WIDTH,
              right: 0,
              zIndex: 1100,
            }}
          />
        )}

        <Box sx={{ flex: 1, p: 2.5, maxWidth: '100%', overflowX: 'hidden', position: 'relative', pt: 4 }}>
          {/* Supabase Not Configured Warning Banner */}
          {!isSupabaseConfigured && (
            <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
              Supabase is not configured. The application is running in local offline mode.
              Please copy your database credentials into a <strong>.env.local</strong> file to connect to the backend.
            </Alert>
          )}

          {/* Global Database Error Banner */}
          {globalError && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              Database Error: {globalError}
            </Alert>
          )}

          <Outlet />
        </Box>
      </Box>    </Box>
  );
};

export default AppLayout;
