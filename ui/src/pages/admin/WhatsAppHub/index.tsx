import { useEffect, useState } from "react";
import { MessageSquare, CheckCircle, XCircle, Clock, TrendingUp, AlertTriangle, RefreshCw, Settings, Send, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import * as waApi from "@/services/api/whatsappApi";
import type { WhatsAppUsageSummary } from "@/services/api/whatsappApi";

export default function WhatsAppHubDashboard() {
  const navigate = useNavigate();
  const [usage, setUsage] = useState<WhatsAppUsageSummary | null>(null);
  const [settings, setSettings] = useState<{ isEnabled: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      waApi.getUsage().then(setUsage),
      waApi.getSettings().then(setSettings),
    ])
      .catch(() => toast.error("Failed to load WhatsApp data"))
      .finally(() => setLoading(false));
  }, []);

  const usedPct = usage?.usedPct ?? 0;
  const quotaBarColor =
    usedPct >= 90 ? "bg-red-500" :
    usedPct >= 75 ? "bg-amber-500" :
    "bg-green-500";

  const quickActions = [
    { label: "Manage Templates", href: "/whatsapp/templates", icon: FileText, color: "text-blue-600" },
    { label: "Message History", href: "/whatsapp/messages", icon: MessageSquare, color: "text-purple-600" },
    { label: "Testing Console", href: "/whatsapp/test", icon: Send, color: "text-green-600" },
    { label: "Settings", href: "/whatsapp/settings", icon: Settings, color: "text-gray-600" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Hub</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your school's WhatsApp communication</p>
        </div>
        <div className="flex items-center gap-2">
          {settings?.isEnabled ? (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" /> Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-gray-500">
              <XCircle className="h-3 w-3 mr-1" /> Not Connected
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() =>
            Promise.all([waApi.getUsage().then(setUsage), waApi.getSettings().then(setSettings)])
          }>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Not Enabled Banner */}
      {!settings?.isEnabled && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-amber-800 font-medium text-sm">WhatsApp is not enabled for your school</p>
            <p className="text-amber-700 text-xs mt-0.5">Contact your administrator to activate the WhatsApp Communication Hub.</p>
          </div>
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => navigate("/whatsapp/settings")}>
            Setup Now
          </Button>
        </div>
      )}

      {/* Quota Card */}
      <Card className="shadow-sm border-0 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Monthly Message Quota</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {(usage?.used ?? 0).toLocaleString()}
                <span className="text-lg font-normal text-gray-500"> / {(usage?.quota ?? 0).toLocaleString()}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{usage?.plan ?? "—"}</p>
              <p className="text-xs text-gray-400 mt-1">{usage?.remaining?.toLocaleString() ?? 0} remaining</p>
              {(usage?.carryForward ?? 0) > 0 && (
                <p className="text-xs text-emerald-600 mt-1">+{usage!.carryForward.toLocaleString()} carry-forward</p>
              )}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`${quotaBarColor} h-2 rounded-full transition-all`}
              style={{ width: `${Math.min(100, usedPct)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{usedPct.toFixed(1)}% used</p>
        </CardContent>
      </Card>

      {/* Today's Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Sent Today", value: usage?.sentToday ?? 0, icon: Send, color: "text-blue-600" },
          { label: "Delivered Today", value: usage?.deliveredToday ?? 0, icon: CheckCircle, color: "text-green-600" },
          { label: "Failed Today", value: usage?.failedToday ?? 0, icon: XCircle, color: "text-red-600" },
        ].map(k => (
          <Card key={k.label} className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-4 text-center">
              <k.icon className={`h-6 w-6 ${k.color} mx-auto mb-2`} />
              <div className="text-2xl font-bold text-gray-900">{k.value}</div>
              <div className="text-xs text-gray-500">{k.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map(action => (
              <button
                key={action.href}
                onClick={() => navigate(action.href)}
                className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center"
              >
                <action.icon className={`h-6 w-6 ${action.color}`} />
                <span className="text-xs font-medium text-gray-700">{action.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Overage Warning */}
      {usage?.overagePolicy === "Block" && (usage?.remaining ?? 0) <= 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <div>
            <p className="text-red-800 font-medium text-sm">Quota Exhausted — Messages Blocked</p>
            <p className="text-red-700 text-xs mt-0.5">Your monthly quota is fully used. New messages are blocked. Contact admin to upgrade your plan.</p>
          </div>
        </div>
      )}
    </div>
  );
}
