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
          <TableCell align="center">Total Horas</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {stats?.doctorsSummary.map((doctor: DoctorHoursSummary) => (
          <TableRow
            key={doctor.doctorId}
            hover={clickable}
            onClick={clickable ? () => onDoctorClick?.(doctor.doctorId) : undefined}
            sx={{ cursor: clickable ? 'pointer' : 'default' }}
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

export default DoctorsSummaryTable;