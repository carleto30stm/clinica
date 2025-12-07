import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

import theme from './theme';
import { queryClient } from './lib/queryClient';
import { useAuthStore } from './store/authStore';

// Components
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginForm } from './components/auth/LoginForm';
import { MainLayout } from './components/layout/MainLayout';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import DoctorManagement from './pages/admin/DoctorManagement';
import MonthlyCalendar from './pages/admin/MonthlyCalendar';
import ShiftManagement from './pages/admin/ShiftManagement';
import ShiftGenerator from './pages/admin/ShiftGenerator';
import WeekendView from './pages/admin/WeekendView';
import Statistics from './pages/admin/Statistics';
import HolidayManagement from './pages/admin/HolidayManagement';

// Doctor Pages
import MyShifts from './pages/doctor/MyShifts';
import AvailableShifts from './pages/doctor/AvailableShifts';
import DoctorCalendar from './pages/doctor/DoctorCalendar';

const AppRoutes: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  React.useEffect(() => {
    useAuthStore.getState().checkAuth();
  }, []);

  if (isLoading) {
    return null; // or a loading spinner
  }

  const getDefaultRoute = () => {
    if (!isAuthenticated) return '/login';
    return user?.role === 'ADMIN' ? '/admin' : '/doctor';
  };

  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      
      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="ADMIN">
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="doctors" element={<DoctorManagement />} />
        <Route path="calendar" element={<MonthlyCalendar />} />
        <Route path="shifts" element={<ShiftManagement />} />
        <Route path="shifts/generate" element={<ShiftGenerator />} />
        <Route path="holidays" element={<HolidayManagement />} />
        <Route path="weekends" element={<WeekendView />} />
        <Route path="stats" element={<Statistics />} />
      </Route>

      {/* Doctor Routes */}
      <Route
        path="/doctor"
        element={
          <ProtectedRoute requiredRole="DOCTOR">
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<MyShifts />} />
        <Route path="available" element={<AvailableShifts />} />
        <Route path="calendar" element={<DoctorCalendar />} />
        <Route path="general-calendar" element={<MonthlyCalendar readOnly />} />
      </Route>

      {/* Redirect */}
      <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
          <CssBaseline />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </LocalizationProvider>
      </ThemeProvider>
      {/* DevTools solo en desarrollo */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default App;
