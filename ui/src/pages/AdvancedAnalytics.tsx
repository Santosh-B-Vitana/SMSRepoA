import { AdvancedAnalyticsDashboard } from '@/components/analytics/AdvancedAnalyticsDashboard';
import { SEO } from '@/components/common/SEO';

export default function AdvancedAnalytics() {
  return (
    <>
      <SEO 
        title="Advanced Analytics"
        description="Comprehensive analytics dashboard with insights into student enrollment, fee collection, attendance trends, and class distribution"
      />
      <AdvancedAnalyticsDashboard />
    </>
  );
}
