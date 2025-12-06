import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LockReset as ResetIcon,
} from '@mui/icons-material';
import { userApi, CreateUserData, UpdateUserData } from '../../api/users';
import { User } from '../../types';

export const DoctorManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordDialog, setResetPasswordDialog] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Form state
  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    password: '',
    name: '',
    role: 'DOCTOR',
    specialty: '',
    phone: '',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await userApi.getAll();
      setUsers(data);
    } catch (err) {
      setError('Error al cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        password: '',
        name: user.name,
        role: user.role,
        specialty: user.specialty || '',
        phone: user.phone || '',
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        password: '',
        name: '',
        role: 'DOCTOR',
        specialty: '',
        phone: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
  };

  const handleSave = async () => {
    try {
      if (editingUser) {
        const updateData: UpdateUserData = {
          name: formData.name,
          specialty: formData.specialty,
          phone: formData.phone,
        };
        await userApi.update(editingUser.id, updateData);
      } else {
        await userApi.create(formData);
      }
      handleCloseDialog();
      loadUsers();
    } catch (err) {
      setError('Error al guardar el usuario');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro de eliminar este usuario?')) {
      try {
        await userApi.delete(id);
        loadUsers();
      } catch (err) {
        setError('Error al eliminar el usuario');
      }
    }
  };

  const handleResetPassword = async () => {
    if (resetPasswordDialog && newPassword) {
      try {
        await userApi.resetPassword(resetPasswordDialog, newPassword);
        setResetPasswordDialog(null);
        setNewPassword('');
      } catch (err) {
        setError('Error al restablecer la contraseña');
      }
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await userApi.update(user.id, { isActive: !user.isActive });
      loadUsers();
    } catch (err) {
      setError('Error al actualizar el estado');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Gestión de Médicos</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nuevo Usuario
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Especialidad</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}
                    <Typography variant="body2" color="text.secondary">{user.phone}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.role === 'ADMIN' ? 'Administrador' : 'Médico'}
                    color={user.role === 'ADMIN' ? 'secondary' : 'primary'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{user.specialty || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={user.isActive ? 'Activo' : 'Inactivo'}
                    color={user.isActive ? 'success' : 'default'}
                    size="small"
                    onClick={() => handleToggleActive(user)}
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton onClick={() => handleOpenDialog(user)} title="Editar">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => setResetPasswordDialog(user.id)} title="Restablecer contraseña">
                    <ResetIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(user.id)} color="error" title="Eliminar">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Nombre"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Correo electrónico"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              margin="normal"
              required
              disabled={!!editingUser}
            />
            {!editingUser && (
              <TextField
                fullWidth
                label="Contraseña"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                margin="normal"
                required
              />
            )}
            <FormControl fullWidth margin="normal">
              <InputLabel>Rol</InputLabel>
              <Select
                value={formData.role}
                label="Rol"
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'DOCTOR' })}
                disabled={!!editingUser}
              >
                <MenuItem value="DOCTOR">Médico</MenuItem>
                <MenuItem value="ADMIN">Administrador</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Especialidad"
              value={formData.specialty}
              onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Teléfono"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={!!resetPasswordDialog}
        onClose={() => setResetPasswordDialog(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Restablecer Contraseña</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Nueva Contraseña"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            margin="normal"
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetPasswordDialog(null)}>Cancelar</Button>
          <Button onClick={handleResetPassword} variant="contained">
            Restablecer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DoctorManagement;
