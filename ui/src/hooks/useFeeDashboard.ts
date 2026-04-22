import { useState, useEffect, useCallback } from 'react';
import { feeService } from '@/services/feeService';

interface DashboardStats {
  totalPending: number;
  overdueCount: number;
  monthlyCollection: number;
  onlinePaymentPercentage: number;
  totalStudents: number;
  totalCollected: number;
}

export function useFeeDashboard(schoolId: string) {
  const [stats, setStats] = useState<DashboardStats>({
    totalPending: 0,
    overdueCount: 0,
    monthlyCollection: 0,
    onlinePaymentPercentage: 0,
    totalStudents: 0,
    totalCollected: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const dashboardStats = await feeService.getDashboardStats(schoolId);
      setStats(dashboardStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard stats');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const refresh = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refresh
  };
}
