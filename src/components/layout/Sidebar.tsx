import React, { useState } from 'react';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Typography, Divider, Avatar, Menu, MenuItem,
  useTheme,
} from '@mui/material';
import {
  DashboardRounded,
  PeopleAltRounded,
  SettingsRounded,
  ImportExportRounded,
  LogoutRounded,
  VpnKeyRounded,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import ChangePasswordDialog from '../auth/ChangePasswordDialog';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <DashboardRounded />, path: '/' },
  { label: 'Employees', icon: <PeopleAltRounded />, path: '/employees' },
  { label: 'Import / Export', icon: <ImportExportRounded />, path: '/import-export' },
  { label: 'Settings', icon: <SettingsRounded />, path: '/settings' },
];

interface SidebarProps {
  width: number;
}

const SidebarContent: React.FC<{ width: number }> = ({ width }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();

  const { profile, signOut } = useAuthStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await signOut();
    navigate('/login');
  };

  const handleChangePassword = () => {
    handleMenuClose();
    setChangePasswordOpen(true);
  };

  const userInitial = profile?.first_name ? profile.first_name[0].toUpperCase() : 'U';
  const fullName = profile ? `${profile.first_name} ${profile.last_name}` : 'User';

  return (
    <Box
      sx={{
        width,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: `1px solid ${theme.palette.divider}`,
      }}
    >
      {/* Logo */}
      <Box sx={{ px: 2.5, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 36, height: 36, borderRadius: 2,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 18, fontWeight: 700,
          }}
        >
          I
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
            Incentive
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Management System
          </Typography>
        </Box>
      </Box>

      <Divider />

      {/* Nav */}
      <List sx={{ px: 1.5, pt: 1.5, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: 2, px: 1.5, py: 1,
                  bgcolor: isActive ? 'primary.main' : 'transparent',
                  color: isActive ? 'primary.contrastText' : 'text.secondary',
                  '&:hover': { bgcolor: isActive ? 'primary.dark' : 'action.hover' },
                  transition: 'all 0.2s ease',
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: isActive ? 'inherit' : 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{
                    primary: { style: { fontWeight: isActive ? 600 : 500, fontSize: '0.875rem' } },
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider />

      {/* Profile Section */}
      <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={handleMenuOpen}>
        <Avatar
          sx={{
            width: 32,
            height: 32,
            bgcolor: 'primary.light',
            color: 'primary.contrastText',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          {userInitial}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {fullName}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', display: 'block' }}>
            {profile?.email || 'Logged in'}
          </Typography>
        </Box>
      </Box>

      {/* User Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        slotProps={{
          paper: {
            sx: {
              width: 180,
              mt: -1,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
            },
          },
        }}
      >
        <MenuItem onClick={handleChangePassword}>
          <ListItemIcon sx={{ minWidth: 28 }}>
            <VpnKeyRounded fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Change Password" slotProps={{ primary: { style: { fontSize: '0.85rem' } } }} />
        </MenuItem>
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon sx={{ minWidth: 28, color: 'error.main' }}>
            <LogoutRounded fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Log Out" slotProps={{ primary: { style: { fontSize: '0.85rem' } } }} />
        </MenuItem>
      </Menu>

      <ChangePasswordDialog open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </Box>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ width }) => {
  return (
    <Drawer variant="permanent"
      sx={{ '& .MuiDrawer-paper': { width, boxSizing: 'border-box', border: 'none' }, width, flexShrink: 0 }}
      open>
      <SidebarContent width={width} />
    </Drawer>
  );
};

export default Sidebar;
