import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Card,
  CardContent,
  CardActions,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useDiscounts, useActiveDiscount, useCreateDiscount, useDeleteDiscount } from '../../hooks/useDiscounts';
import { formatDate, formatCurrency, formatCurrencyInput, parseCurrencyInput } from '../../utils/formatters';
import { getErrorMessage } from '../../utils/helpers';

export const DiscountManagement: React.FC = () => {
  const [newAmount, setNewAmount] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState('');

  const { data: discounts = [], isLoading: loadingDiscounts, error: fetchError } = useDiscounts();
  const { data: activeDiscount } = useActiveDiscount();
  const createDiscount = useCreateDiscount();
  const deleteDiscount = useDeleteDiscount();

  const handleCreate = async () => {
    try {
      setError('');
      const amount = parseCurrencyInput(newAmount);
      if (amount === null || amount <= 0) {
        setError('Ingrese un monto válido mayor a 0');
        return;
      }

      await createDiscount.mutateAsync({ amount });
      setNewAmount('');
      setIsDialogOpen(false);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      console.error('Error creating discount:', err);
      setError(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar este descuento?')) {
      return;
    }
    try {
      await deleteDiscount.mutateAsync(id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (loadingDiscounts) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (fetchError) {
    return (
      <Alert severity="error">
        Error al cargar descuentos: {getErrorMessage(fetchError)}
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Gestión de Descuentos
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsDialogOpen(true)}
        >
          Nuevo Descuento
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {activeDiscount && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'success.50', border: 2, borderColor: 'success.main' }}>
          <Typography variant="h6" gutterBottom color="success.dark">
            Descuento Activo
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h4" color="success.main">
              {formatCurrency(activeDiscount.amount)}
            </Typography>
            <Chip label="ACTIVO" color="success" />
          </Box>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Válido desde: {formatDate(activeDiscount.validFrom)}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mt={1}>
            Este monto se descuenta automáticamente del pago total de los médicos que tengan el descuento habilitado.
          </Typography>
        </Paper>
      )}

      {!activeDiscount && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No hay descuento activo. Cree uno para aplicar descuentos a los médicos.
        </Alert>
      )}

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Historial de Descuentos
      </Typography>

      <Box display="flex" flexDirection="column" gap={2}>
        {discounts && discounts.length > 0 ? (
          discounts.map((discount) => (
            <Card key={discount.id} variant="outlined">
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h6">
                      {formatCurrency(discount.amount)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Válido desde: {formatDate(discount.validFrom)}
                    </Typography>
                  </Box>
                  <Chip
                    label={discount.isActive ? 'ACTIVO' : 'INACTIVO'}
                    color={discount.isActive ? 'success' : 'default'}
                  />
                </Box>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleDelete(discount.id)}
                  disabled={discount.isActive}
                >
                  Eliminar
                </Button>
              </CardActions>
            </Card>
          ))
        ) : (
          <Alert severity="info">No hay descuentos registrados</Alert>
        )}
      </Box>

      {/* Dialog para crear descuento */}
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Crear Nuevo Descuento</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            El descuento anterior se desactivará automáticamente al crear uno nuevo.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Monto del Descuento"
            type="text"
            inputMode="decimal"
            fullWidth
            value={newAmount}
            onChange={(e) => setNewAmount(formatCurrencyInput(e.target.value))}
            placeholder="0,00"
            InputProps={{
              startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
            }}
            helperText="Use punto (.) para miles y coma (,) para decimales. Ejemplo: 150.000,50"
          />
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={createDiscount.isPending}
          >
            {createDiscount.isPending ? <CircularProgress size={24} /> : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DiscountManagement;
