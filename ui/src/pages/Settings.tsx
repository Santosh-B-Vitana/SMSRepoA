
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Download, Upload, Bell, Palette, Globe } from "lucide-react";
import { SettingsManager } from "@/components/settings/SettingsManager";
import BiometricSettings from "@/components/settings/BiometricSettings";
import { DataImportManager } from "@/components/superadmin/DataImportManager";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Settings() {
  const { t } = useLanguage();
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-display flex items-center gap-3">
          <SettingsIcon className="h-8 w-8" />
          {t('settings.title')}
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your school's system settings, permissions, and configurations
        </p>
      </div>

      {/* Settings Content */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="general" className="flex items-center gap-2 py-3">
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.general')}</span>
          </TabsTrigger>
          <TabsTrigger value="biometric" className="flex items-center gap-2 py-3">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.biometric')}</span>
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2 py-3">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.import')}</span>
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2 py-3">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.export')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <SettingsManager />
        </TabsContent>

        <TabsContent value="biometric" className="mt-6">
          <BiometricSettings />
        </TabsContent>

        <TabsContent value="import" className="mt-6">
          <DataImportManager />
        </TabsContent>

        <TabsContent value="export" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.exportData')}</CardTitle>
              <CardDescription>
                {t('settings.exportDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  t('nav.students'),
                  t('nav.staff'),
                  t('nav.attendance'),
                  t('nav.fees'),
                  t('nav.examinations'),
                  t('nav.library'),
                  t('nav.transport'),
                  t('common.inventory'),
                  t('common.sales')
                ].map((module) => (
                  <Card key={module} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-2">{module}</h3>
                      <button 
                        className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                        onClick={() => {
                          // Export functionality will be implemented per module
                          console.log(`Exporting ${module}`);
                        }}
                      >
                        <Download className="h-4 w-4" />
                        {t('settings.exportToExcel')}
                      </button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
