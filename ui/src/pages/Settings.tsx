
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Download, Upload, Bell } from "lucide-react";
import { SettingsManager } from "@/components/settings/SettingsManager";
import BiometricSettings from "@/components/settings/BiometricSettings";
import { DataImportManager } from "@/components/superadmin/DataImportManager";
import { DataExportManager } from "@/components/superadmin/DataExportManager";
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

        <TabsContent value="export" className="mt-6">
          <DataExportManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
