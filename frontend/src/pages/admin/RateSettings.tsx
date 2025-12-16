import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  InputAdornment,
  Divider,
  Chip,
} from '@mui/material';
import {
  WbSunny as DayIcon,
  NightsStay as NightIcon,
  Weekend as WeekendIcon,
  Today as WeekdayIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useRates, useUpdateRates } from '../../hooks/useRates';
import { RatePeriodType, UpdateHourlyRateData } from '../../types';
import { formatCurrencyInput, parseCurrencyInput } from '../../utils/formatters';

interface RateConfig {
  periodType: RatePeriodType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'warning' | 'info';
}

const RATE_CONFIGS: RateConfig[] = [
  {
    periodType: 'WEEKDAY_DAY',
    label: 'Día de Semana - Diurno',
    description: 'Lunes a Viernes, 9:00 - 21:00',
    icon: <WeekdayIcon />,
    color: 'primary',
  },
  {
    periodType: 'WEEKDAY_NIGHT',
    label: 'Día de Semana - Nocturno',
    description: 'Lunes a Viernes, 21:00 - 9:00',
    icon: <NightIcon />,
    color: 'secondary',
  },
  {
    periodType: 'WEEKEND_HOLIDAY_DAY',
    label: 'Fin de Semana/Feriado - Diurno',
    description: 'Sábado, Domingo y Feriados, 9:00 - 21:00',
    icon: <WeekendIcon />,
    color: 'warning',
  },
  {
    periodType: 'WEEKEND_HOLIDAY_NIGHT',
    label: 'Fin de Semana/Feriado - Nocturno',
    description: 'Sábado, Domingo y Feriados, 21:00 - 9:00',
    icon: <NightIcon />,
    color: 'info',
  },
];

export const RateSettings: React.FC = () => {
  const { data: rates, isLoading, error } = useRates();
  const updateRates = useUpdateRates();
  const isUpdating = (updateRates as any).isPending || (updateRates as any).isLoading;

  const [formValues, setFormValues] = useState<Record<RatePeriodType, string>>({
    WEEKDAY_DAY: '',
    WEEKDAY_NIGHT: '',
    WEEKEND_HOLIDAY_DAY: '',
    WEEKEND_HOLIDAY_NIGHT: '',
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Initialize form values when rates load
  useEffect(() => {
    if (rates) {
      const values: Record<RatePeriodType, string> = {
        WEEKDAY_DAY: '',
        WEEKDAY_NIGHT: '',
        WEEKEND_HOLIDAY_DAY: '',
        WEEKEND_HOLIDAY_NIGHT: '',
      };
      rates.forEach((rate) => {
        values[rate.periodType] = String(rate.rate);
      });
      setFormValues(values);
      setHasChanges(false);
    }
  }, [rates]);

  const handleChange = (periodType: RatePeriodType) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    const formatted = formatCurrencyInput(value);
    setFormValues((prev) => ({ ...prev, [periodType]: formatted }));
    setHasChanges(true);
    setSuccess('');
  };

  const handleEdit = () => {
    setIsEditing(true);
    setSuccess('');
  };

  const handleCancel = () => {
    // Revert form values to last saved rates
    if (rates) {
      const values: Record<RatePeriodType, string> = {
        WEEKDAY_DAY: '',
        WEEKDAY_NIGHT: '',
        WEEKEND_HOLIDAY_DAY: '',
        WEEKEND_HOLIDAY_NIGHT: '',
      };
      rates.forEach((rate) => {
        values[rate.periodType] = String(rate.rate);
      });
      setFormValues(values);
    }
    setHasChanges(false);
    setIsEditing(false);
    setSuccess('');
  };

  const handleSave = async () => {
    const ratesToUpdate: UpdateHourlyRateData[] = RATE_CONFIGS.map((config) => {
      const parsedRate = parseCurrencyInput(formValues[config.periodType]);
      return {
        periodType: config.periodType,
        rate: parsedRate || 0,
      };
    });

    try {
      await updateRates.mutateAsync(ratesToUpdate);
      setSuccess('Tarifas actualizadas correctamente');
      setHasChanges(false);
      setIsEditing(false);
    } catch {
      // Error is handled by mutation
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error al cargar las tarifas. Por favor, recarga la página.
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Configuración de Tarifas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Define el valor por hora para cada tipo de turno
          </Typography>
        </Box>
        {!isEditing ? (
          <Button variant="outlined" startIcon={<EditIcon />} onClick={handleEdit}>
            Editar
          </Button>
        ) : (
          <Box display="flex" gap={1}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!hasChanges || isUpdating}
            >
              {isUpdating ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={handleCancel}
              disabled={isUpdating}
            >
              Cancelar
            </Button>
          </Box>
        )} 
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {updateRates.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error al guardar las tarifas. Por favor, intenta de nuevo.
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <DayIcon color="warning" />
          <Typography variant="h6">Horario Diurno</Typography>
          <Chip label="9:00 - 21:00" size="small" variant="outlined" />
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          <NightIcon color="primary" />
          <Typography variant="h6">Horario Nocturno</Typography>
          <Chip label="21:00 - 9:00" size="small" variant="outlined" />
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {RATE_CONFIGS.map((config) => (
          <Grid item xs={12} sm={6} key={config.periodType}>
            <Card 
              elevation={2}
              sx={{ 
                height: '100%',
                borderLeft: 4,
                borderColor: `${config.color}.main`,
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Box sx={{ color: `${config.color}.main` }}>
                    {config.icon}
                  </Box>
                  <Typography variant="h6" component="h3">
                    {config.label}
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {config.description}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <TextField
                  fullWidth
                  label="Valor por hora"
                  value={formValues[config.periodType]}
                  onChange={handleChange(config.periodType)}
                  type="text"
                  inputMode="decimal"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    endAdornment: <InputAdornment position="end">/hora</InputAdornment>,
                  }}
                  placeholder="0,00"
                  helperText={
                    rates?.find((r) => r.periodType === config.periodType)?.updatedAt
                      ? `Última actualización: ${new Date(
                          rates.find((r) => r.periodType === config.periodType)!.updatedAt
                        ).toLocaleDateString('es-AR')}. Use punto (.) para miles, coma (,) para decimales`
                      : 'Use punto (.) para miles, coma (,) para decimales. Ejemplo: 1.500,00'
                  }
                  disabled={!isEditing}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 3, mt: 3, bgcolor: 'grey.50' }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          ¿Cómo se calculan los pagos?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          El sistema calcula automáticamente el pago de cada turno basándose en:
        </Typography>
        <Box component="ul" sx={{ mt: 1, pl: 2 }}>
          <Typography component="li" variant="body2" color="text.secondary">
            Las horas trabajadas en horario diurno (9:00-21:00) vs nocturno (21:00-9:00)
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            Si el turno cae en día de semana o fin de semana/feriado
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            Un turno de 24 horas combina horas diurnas y nocturnas con sus respectivas tarifas
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default RateSettings;
