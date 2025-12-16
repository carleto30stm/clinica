import React from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
} from '@mui/material';
import { MonthlyStats, DoctorHoursSummary } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface DoctorsSummaryTableProps {
  stats: MonthlyStats | null;
  onDoctorClick?: (doctorId: string) => void;
  clickable?: boolean;
}

export const DoctorsSummaryTable: React.FC<DoctorsSummaryTableProps> = ({
  stats,
  onDoctorClick,
  clickable = false,
}) => (
  <TableContainer component={Paper}>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Médico</TableCell>
          <TableCell>Especialidad</TableCell>
          <TableCell align="center">Total Turnos</TableCell>
          <TableCell align="center">Turnos Fijos</TableCell>
          <TableCell align="center">Turnos Rotativos</TableCell>
          <TableCell align="center">Horas Turnos</TableCell>
          <TableCell align="center">H.Ext</TableCell>
          <TableCell align="center">Pago Bruto</TableCell>
          <TableCell align="center">Descuento</TableCell>
          <TableCell align="center">Pago Neto</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {(() => {
          const topEarners = (stats?.doctorsSummary || [])
            .slice()
            .sort((a, b) => (b.totalPayment || 0) - (a.totalPayment || 0))
            .slice(0, 3)
            .map((d) => d.doctorId);
          return (stats?.doctorsSummary || []).map((doctor: DoctorHoursSummary) => (
          <TableRow
            key={doctor.doctorId}
            hover={clickable}
            onClick={clickable ? () => onDoctorClick?.(doctor.doctorId) : undefined}
            sx={{ cursor: clickable ? 'pointer' : 'default', bgcolor: topEarners.includes(doctor.doctorId) ? 'info.50' : 'inherit' }}
          >
            <TableCell>{doctor.doctorName}</TableCell>
            <TableCell>
              <Chip label={doctor.specialty || 'N/A'} size="small" />
            </TableCell>
            <TableCell align="center">{doctor.shiftCount}</TableCell>
            <TableCell align="center">{doctor.fixedShifts}</TableCell>
            <TableCell align="center">{doctor.rotatingShifts}</TableCell>
            <TableCell align="center">
              <Typography fontWeight="bold">{doctor.totalHours}h</Typography>
            </TableCell>
            <TableCell align="center">
              <Typography fontWeight="bold" color={doctor.externalHours ? 'primary' : 'text.secondary'}>
                {doctor.externalHours ? `${doctor.externalHours}h` : '-'}
              </Typography>
            </TableCell>
            <TableCell align="center">
              <Typography fontWeight="bold">
                {formatCurrency(doctor.totalPayment || 0)}
              </Typography>
            </TableCell>
            <TableCell align="center">
              <Typography color={doctor.hasDiscount ? 'error' : 'text.disabled'}>
                {doctor.hasDiscount && doctor.discountAmount ? 
                  `-${formatCurrency(doctor.discountAmount)}` : 
                  '-'}
              </Typography>
            </TableCell>
            <TableCell align="center">
              <Typography fontWeight="bold" color="success.main">
                {formatCurrency(doctor.finalPayment || doctor.totalPayment || 0)}
              </Typography>
            </TableCell>
          </TableRow>
        ))})()}
      </TableBody>
    </Table>
  </TableContainer>
);

export default DoctorsSummaryTable;