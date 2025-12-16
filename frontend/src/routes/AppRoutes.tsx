import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { useAuthStore } from "@/store/authStore";
import { LoginPage } from '@/pages/auth/LoginPage';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import MainLayout from '@/components/layout/MainLayout';
import AdminDashboard from '@/pages/admin/Dashboard';
import DoctorManagement from '@/pages/admin/DoctorManagement';
import MonthlyCalendar from '@/pages/admin/MonthlyCalendar';
import HolidayManagement from '@/pages/admin/HolidayManagement';
import RateSettings from '@/pages/admin/RateSettings';
import DiscountManagement from '@/pages/admin/DiscountManagement';
import ShiftGenerator from '@/pages/admin/ShiftGenerator';
import ShiftManagement from '@/pages/admin/ShiftManagement';
import Statistics from '@/pages/admin/Statistics';
import WeekendView from '@/pages/admin/WeekendView';
import AvailableShifts from '@/pages/doctor/AvailableShifts';
import DoctorCalendar from '@/pages/doctor/DoctorCalendar';
import MyShifts from '@/pages/doctor/MyShifts';





export const AppRoutes: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  useEffect(() => {
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
      <Route path="/login" element={<LoginPage />} />
      
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
        <Route path="rates" element={<RateSettings />} />
        <Route path="discounts" element={<DiscountManagement />} />
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