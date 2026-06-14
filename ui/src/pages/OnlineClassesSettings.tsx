/**
 * OnlineClassesSettings — Super Admin / Admin configuration panel
 * for the Online Classes module.
 *
 * Allows:
 * - Enabling / disabling the online_classes module per school
 * - Choosing provider (LiveKit / Zoom / Jitsi)
 * - Entering LiveKit/Zoom credentials (never displayed back)
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/apiClient';

interface ProviderConfig {
  defaultProvider: 'LiveKit' | 'Zoom' | 'Jitsi';
  useSharedVitanaAccount: boolean;
  liveKitServerUrl?: string;
  liveKitApiKey?: string;
  liveKitApiSecretSet?: boolean;
  zoomAccountId?: string;
  zoomClientId?: string;
  zoomClientSecretSet?: boolean;
}

interface ModuleStatus {
  enabled: boolean;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">{title}</h3>
      {children}
    </div>
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function OnlineClassesSettings() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const configQuery = useQuery({
    queryKey: ['meeting-provider-config'],
    queryFn: () => apiGet<ProviderConfig>('/school-config/meeting-provider'),
  });

  const [provider, setProvider] = useState<'LiveKit' | 'Zoom' | 'Jitsi'>('LiveKit');
  const [useShared, setUseShared] = useState(true);
  const [lkUrl, setLkUrl] = useState('');
  const [lkKey, setLkKey] = useState('');
  const [lkSecret, setLkSecret] = useState('');
  const [zoomAccount, setZoomAccount] = useState('');
  const [zoomClient, setZoomClient] = useState('');
  const [zoomSecret, setZoomSecret] = useState('');
  const [moduleEnabled, setModuleEnabled] = useState(false);

  useEffect(() => {
    if (configQuery.data) {
      setProvider(configQuery.data.defaultProvider ?? 'LiveKit');
      setUseShared(configQuery.data.useSharedVitanaAccount ?? true);
      setLkUrl(configQuery.data.liveKitServerUrl ?? '');
      setLkKey(configQuery.data.liveKitApiKey ?? '');
      setZoomAccount(configQuery.data.zoomAccountId ?? '');
      setZoomClient(configQuery.data.zoomClientId ?? '');
    }
  }, [configQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiPost('/school-config/meeting-provider', {
        defaultProvider: provider,
        useSharedVitanaAccount: useShared,
        liveKitServerUrl: lkUrl || undefined,
        liveKitApiKey: lkKey || undefined,
        liveKitApiSecret: lkSecret || undefined,
        zoomAccountId: zoomAccount || undefined,
        zoomClientId: zoomClient || undefined,
        zoomClientSecret: zoomSecret || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-provider-config'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const enableMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      apiPost('/school-config/meeting-provider/enable', { enabled }),
    onSuccess: (_, enabled) => setModuleEnabled(enabled),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Online Classes Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure virtual classroom provider and enable the module for this school.
        </p>
      </div>

      {/* Module enable toggle */}
      <SectionCard title="Module Access">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">Online Classes Module</p>
            <p className="text-sm text-gray-500">
              Enable to allow teachers to schedule and conduct virtual classes.
            </p>
          </div>
          <button
            onClick={() => enableMutation.mutate(!moduleEnabled)}
            disabled={enableMutation.isPending}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              moduleEnabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                moduleEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </SectionCard>

      {/* Provider selection */}
      <SectionCard title="Meeting Provider">
        <FormField label="Provider">
          <div className="grid grid-cols-3 gap-3">
            {(['LiveKit', 'Zoom', 'Jitsi'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                  provider === p
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {p}
                {p === 'LiveKit' && (
                  <span className="block text-xs font-normal text-green-600 mt-0.5">Recommended</span>
                )}
              </button>
            ))}
          </div>
        </FormField>

        {/* Shared account toggle (LiveKit only) */}
        {provider === 'LiveKit' && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 rounded-lg">
            <input
              type="checkbox"
              checked={useShared}
              onChange={(e) => setUseShared(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <div>
              <p className="text-sm font-semibold text-blue-800">Use Vitana Shared LiveKit Account</p>
              <p className="text-xs text-blue-600">
                Recommended for most schools. No setup needed — Vitana manages the infrastructure.
              </p>
            </div>
          </div>
        )}
      </SectionCard>

      {/* LiveKit custom credentials */}
      {provider === 'LiveKit' && !useShared && (
        <SectionCard title="LiveKit Credentials">
          <FormField
            label="LiveKit Server URL"
            hint="WebSocket URL from your LiveKit Cloud project, e.g. wss://myschool.livekit.cloud"
          >
            <input
              value={lkUrl}
              onChange={(e) => setLkUrl(e.target.value)}
              placeholder="wss://..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
          <FormField label="API Key">
            <input
              value={lkKey}
              onChange={(e) => setLkKey(e.target.value)}
              placeholder="APIxxxxxxxxxx"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
          <FormField
            label="API Secret"
            hint={configQuery.data?.liveKitApiSecretSet ? 'A secret is already saved. Enter a new value to replace it.' : undefined}
          >
            <input
              type="password"
              value={lkSecret}
              onChange={(e) => setLkSecret(e.target.value)}
              placeholder={configQuery.data?.liveKitApiSecretSet ? '••••••••••••• (leave blank to keep)' : 'Enter API secret'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
        </SectionCard>
      )}

      {/* Zoom credentials */}
      {provider === 'Zoom' && (
        <SectionCard title="Zoom App Credentials">
          <FormField label="Account ID">
            <input
              value={zoomAccount}
              onChange={(e) => setZoomAccount(e.target.value)}
              placeholder="Zoom Account ID"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
          <FormField label="Client ID">
            <input
              value={zoomClient}
              onChange={(e) => setZoomClient(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
          <FormField
            label="Client Secret"
            hint={configQuery.data?.zoomClientSecretSet ? 'A secret is already saved.' : undefined}
          >
            <input
              type="password"
              value={zoomSecret}
              onChange={(e) => setZoomSecret(e.target.value)}
              placeholder={configQuery.data?.zoomClientSecretSet ? '••••••••••••• (leave blank to keep)' : 'Enter client secret'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
        </SectionCard>
      )}

      {/* Save button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Saving...' : 'Save Configuration'}
        </button>
        {saved && (
          <span className="text-green-600 text-sm font-semibold">✓ Saved successfully</span>
        )}
        {saveMutation.isError && (
          <span className="text-red-500 text-sm">Failed to save. Please try again.</span>
        )}
      </div>
    </div>
  );
}
