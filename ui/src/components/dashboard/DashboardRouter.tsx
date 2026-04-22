
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import SuperAdminDashboard from '../../pages/dashboards/SuperAdminDashboard';
import AdminDashboard from '../../pages/dashboards/AdminDashboard';
import StaffDashboard from '../../pages/dashboards/StaffDashboard';
import UpdatedParentDashboard from '../../pages/dashboards/UpdatedParentDashboard';

export const DashboardRouter: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  switch (user.role) {
    case 'super_admin':
      return <SuperAdminDashboard />;
    case 'admin':
      return <AdminDashboard />;
    case 'staff':
      return <StaffDashboard />;
    case 'parent':
      return <UpdatedParentDashboard />;
    default:
      return <AdminDashboard />;
  }
};
