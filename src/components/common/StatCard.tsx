import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  trend?: { value: number; label: string };
}

const StatCard: React.FC<StatCardProps> = ({
  title, value, subtitle, icon, color = 'primary', trend,
}) => {
  const theme = useTheme();
  const palette = theme.palette[color];

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}
            >
              {title}
            </Typography>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, color: 'text.primary', mt: 0.5, mb: 0.25, lineHeight: 1.2 }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: trend.value >= 0 ? 'success.main' : 'error.main',
                  display: 'block',
                  mt: 0.5,
                }}
              >
                {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value)}% {trend.label}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              width: 48, height: 48, borderRadius: 2.5,
              background: `linear-gradient(135deg, ${palette.light}25, ${palette.main}30)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: palette.main, flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;
