import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import { Work as WorkIcon } from '@mui/icons-material';
import { useMyExternalHours } from '../../hooks';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { getErrorMessage } from '../../utils/helpers';
import { MonthFilter } from '../../components/filters/MonthFilter';

export const MyExternalHours: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [appliedMonth, setAppliedMonth] = useState(selectedMonth);

  const monthParts = appliedMonth.split('-');
  const year = parseInt(monthParts[0]);
  const month = parseInt(monthParts[1]);

  const { data: externalHours = [], isLoading, error } = useMyExternalHours({ month, year });

  const handleApplyFilter = () => {
    setAppliedMonth(selectedMonth);
  };

  const getTotalHours = () => externalHours.reduce((sum, e) => sum + Number(e.hours), 0);
  const getTotalPayment = () => externalHours.reduce((sum, e) => sum + (Number(e.hours) * Number(e.rate)), 0);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Error al cargar datos: {getErrorMessage(error)}</Alert>;
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <WorkIcon fontSize="large" color="primary" />
        <Typography variant="h4">Mis Horas de Consultorio Externo</Typography>
      </Box>

      <MonthFilter
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        onApply={handleApplyFilter}
      />

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Horas — {new Date(year, month - 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
              </Typography>
              <Typography variant="h3">{getTotalHours().toFixed(1)}h</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Pago Estimado — {new Date(year, month - 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
              </Typography>
              <Typography variant="h3" color="success.main">
                {formatCurrency(getTotalPayment())}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell align="center">Horas</TableCell>
              <TableCell align="right">Tarifa/Hora</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Descripción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {externalHours.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary" py={4}>
                    No hay registros de horas externas para este mes
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              externalHours.map((ext) => (
                <TableRow key={ext.id} hover>
                  <TableCell>
                    <Typography fontWeight="medium">{formatDate(ext.date)}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={`${ext.hours}h`} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">{formatCurrency(ext.rate)}</TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="bold" color="success.main">
                      {formatCurrency(ext.hours * ext.rate)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {ext.description || '-'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {externalHours.length > 0 && (
        <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Nota:</strong> Las horas de consultorio externo se liquidan junto con tus turnos regulares. Este
            monto se suma automáticamente a tu liquidación mensual.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default MyExternalHours;
