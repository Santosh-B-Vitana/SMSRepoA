import { SecurityDashboard as SecurityDashboardWidget, SecurityStatusBadge } from "@/components/common/SecurityDashboard";
import { SEO } from "@/components/common/SEO";
import { Shield } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SecurityDashboardPage() {
  const { t } = useLanguage();

  return (
    <>
      <SEO
        title="Security Dashboard"
        description="Frontend security posture — session management, RBAC, input validation, data masking, and network resilience status"
      />
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('security.dashboard.title')}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {t('security.dashboard.subtitle')}
            </p>
          </div>
          <div className="ml-auto">
            <SecurityStatusBadge />
          </div>
        </div>

        <SecurityDashboardWidget />
      </div>
    </>
  );
}
