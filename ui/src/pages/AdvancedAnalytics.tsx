import { AdvancedAnalytics as AdvancedAnalyticsWidget } from '@/components/analytics/AdvancedAnalytics';
import { SEO } from '@/components/common/SEO';

export default function AdvancedAnalytics() {
  return (
    <>
      <SEO 
        title="Advanced Analytics"
        description="Comprehensive analytics dashboard with insights into student enrollment, fee collection, attendance trends, and class distribution"
      />
      <AdvancedAnalyticsWidget />
    </>
  );
}
