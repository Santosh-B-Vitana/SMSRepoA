import { AdvancedAnalytics as AdvancedAnalyticsWidget } from '@/components/analytics/AdvancedAnalytics';
import { SEO } from '@/components/common/SEO';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdvancedAnalyticsPage() {
  const { t } = useLanguage();

  return (
    <>
      <SEO 
        title="Advanced Analytics"
        description="Comprehensive analytics dashboard with insights into student enrollment, fee collection, attendance trends, and class distribution"
      />
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div>
          <h1 className="text-display">{t('analytics.advanced.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('analytics.advanced.subtitle')}</p>
        </div>
        <AdvancedAnalyticsWidget />
      </div>
    </>
  );
}
