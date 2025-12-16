import React from 'react';
import { Button, Box, Typography } from '@mui/material';
import { FileDownload as DownloadIcon } from '@mui/icons-material';
import { MonthlyStats } from '../../types';

interface ExportDataProps {
  stats: MonthlyStats | null;
  filename?: string;
}

export const ExportData: React.FC<ExportDataProps> = ({
  stats,
  filename = 'estadisticas-clinica'
}) => {
  const exportToCSV = () => {
    if (!stats) return;

    // Preparar datos para exportación
    const data = [
      // Encabezados
      ['Estadísticas Mensuales', '', ''],
      ['Mes', stats.month, ''],
      ['Año', stats.year, ''],
      ['', '', ''],
      ['Métricas Generales', '', ''],
      ['Total de Turnos', stats.totalShifts, ''],
      ['Turnos Asignados', stats.assignedShifts, ''],
      ['Turnos Disponibles', stats.availableShifts, ''],
      ['Horas Totales', stats.totalHours, ''],
      ['Pago Total Estimado', stats.totalPayment || 0, ''],
      ['Tasa de Ocupación (%)', stats.totalShifts > 0 ? ((stats.assignedShifts / stats.totalShifts) * 100).toFixed(1) : '0', ''],
      ['', '', ''],
      ['Resumen por Médico', '', ''],
      ['Médico', 'Especialidad', 'Horas Totales', 'Turnos Fijos', 'Turnos Rotativos', 'Pago Estimado (ARS)'],
      ...stats.doctorsSummary.map(doctor => [
        doctor.doctorName,
        doctor.specialty || 'Sin especialidad',
        doctor.totalHours,
        doctor.fixedShifts,
        doctor.rotatingShifts,
        doctor.totalPayment || 0
      ])
    ];

    // Convertir a CSV
    const csvContent = data
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Crear y descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${stats.year}-${stats.month.toString().padStart(2, '0')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportDoctorsSummary = () => {
    if (!stats) return;

    const data = [
      ['Resumen de Médicos', '', '', '', ''],
      ['Mes', stats.month, '', '', ''],
      ['Año', stats.year, '', '', ''],
      ['', '', '', '', ''],
      ['Médico', 'Especialidad', 'Horas Totales', 'Turnos Fijos', 'Turnos Rotativos', 'Pago Estimado (ARS)'],
      ...stats.doctorsSummary.map(doctor => [
        doctor.doctorName,
        doctor.specialty || 'Sin especialidad',
        doctor.totalHours,
        doctor.fixedShifts,
        doctor.rotatingShifts,
        doctor.totalPayment || 0
      ])
    ];

    const csvContent = data
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `resumen-medicos-${stats.year}-${stats.month.toString().padStart(2, '0')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!stats) return null;

  return (
    <Box sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      <Typography variant="h6" gutterBottom>
        Exportar Datos
      </Typography>
      <Box display="flex" gap={2}>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={exportToCSV}
          size="small"
        >
          Exportar Todo (CSV)
        </Button>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={exportDoctorsSummary}
          size="small"
        >
          Resumen Médicos (CSV)
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Los archivos se descargan en formato CSV compatible con Excel
      </Typography>
    </Box>
  );
};

export default ExportData;