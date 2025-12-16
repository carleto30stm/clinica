import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Skeleton,
} from '@mui/material';
import {
  People as PeopleIcon,
  CalendarMonth as CalendarIcon,
  EventAvailable as AvailableIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { MonthlyStats } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, loading = false }) => (
  <Card>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="text.secondary" gutterBottom variant="body2">
            {title}
          </Typography>
          {loading ? (
            <Skeleton variant="text" width={60} height={32} />
          ) : (
            <Typography variant="h4" component="div">
              {value}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            bgcolor: color,
            borderRadius: 2,
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

interface MetricsCardsProps {
  stats: MonthlyStats | null;
  loading?: boolean;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ stats, loading = false }) => (
  <Grid container spacing={3}>
    <Grid item xs={12} sm={6} md={3}>
      <StatCard
        title="Total de Turnos"
        value={stats?.totalShifts || 0}
        icon={<CalendarIcon sx={{ color: 'white' }} />}
        color="primary.main"
        loading={loading}
      />
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <StatCard
        title="Turnos Asignados"
        value={stats?.assignedShifts || 0}
        icon={<PeopleIcon sx={{ color: 'white' }} />}
        color="success.main"
        loading={loading}
      />
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <StatCard
        title="Turnos Disponibles"
        value={stats?.availableShifts || 0}
        icon={<AvailableIcon sx={{ color: 'white' }} />}
        color="warning.main"
        loading={loading}
      />
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <StatCard
        title="Horas Totales"
        value={`${stats?.totalHours || 0}h`}
        icon={<TimeIcon sx={{ color: 'white' }} />}
        color="secondary.main"
        loading={loading}
      />
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <StatCard
        title="Pago Total Estimado"
        value={formatCurrency(stats?.totalPayment)}
        icon={<TimeIcon sx={{ color: 'white' }} />}
        color="info.main"
        loading={loading}
      />
    </Grid>
  </Grid>
);

export default MetricsCards;