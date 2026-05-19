
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Users, UserCheck, Calendar, DollarSign, BookOpen, ClipboardList } from "lucide-react";
import { StatsCard } from "../components/dashboard/StatsCard";
import { QuickActions } from "../components/dashboard/QuickActions";
import { RecentActivity } from "../components/dashboard/RecentActivity";
import { analyticsApi, DashboardSummary } from "../services/api/analyticsApi";
import { useLanguage } from "../contexts/LanguageContext";

export default function Dashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect staff, parent, and super_admin to their dashboards
    if (user) {
      if (user.role === 'staff') {
        navigate('/staff-dashboard', { replace: true });
        return;
      }
      if (user.role === 'parent') {
        navigate('/parent-dashboard', { replace: true });
        return;
      }
      if (user.role === 'super_admin') {
        navigate('/super-admin-dashboard', { replace: true });
        return;
      }
    }
    const fetchStats = async () => {
      try {
        const data = await analyticsApi.getDashboardSummary();
        setStats(data);
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
        setError(t('dashboard.loadError'));
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 bg-muted rounded-lg"></div>
          <div className="h-64 bg-muted rounded-lg lg:col-span-2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">{error}</p>
          <button
            className="text-sm text-primary underline"
            onClick={() => window.location.reload()}
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div>
        <h1 className="text-display">{t('nav.dashboard')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title={t('dashboard.totalStudents')}
          value={stats?.totalStudents ?? 0}
          icon={Users}
        />
        <StatsCard
          title={t('dashboard.totalStaff')}
          value={stats?.totalStaff ?? 0}
          icon={UserCheck}
        />
        <StatsCard
          title={t('dashboard.todayAttendance')}
          value={`${stats?.todayAttendancePercentage?.toFixed(1) ?? 0}%`}
          icon={Calendar}
        />
        <StatsCard
          title={t('dashboard.pendingFees')}
          value={`₹${stats?.pendingFees?.toLocaleString('en-IN') ?? 0}`}
          icon={DollarSign}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title={t('dashboard.upcomingExams')}
          value={stats?.upcomingExams ?? 0}
          icon={BookOpen}
        />
        <StatsCard
          title={t('dashboard.pendingAssignments')}
          value={stats?.pendingAssignments ?? 0}
          icon={ClipboardList}
        />
        <StatsCard
          title={t('dashboard.absentToday')}
          value={stats?.todayAbsentStudents ?? 0}
          icon={Users}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="space-y-6">
          <QuickActions />
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
