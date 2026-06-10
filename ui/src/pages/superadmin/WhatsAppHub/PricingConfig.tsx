import { useEffect, useState } from "react";
import { Settings, Save, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import * as waApi from "@/services/api/whatsappApi";
import type { PricingConfig } from "@/services/api/whatsappApi";

const META_UTILITY_COST = 0.58; // INR per conversation

export default function WhatsAppPricingConfig() {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [form, setForm] = useState({ markupPct: 100, serviceChargeInr: 0, platformFeeInr: 0, gstPct: 18 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    waApi.getPricingConfig()
      .then((c) => {
        setConfig(c);
        setForm({ markupPct: c.markupPct, serviceChargeInr: c.serviceChargeInr, platformFeeInr: c.platformFeeInr, gstPct: c.gstPct });
      })
      .catch(() => toast.error("Failed to load pricing config"));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await waApi.updatePricingConfig({ ...form, updatedBy: 1 });
      setConfig(updated);
      toast.success("Pricing configuration saved");
    } catch {
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  // Live preview calculation
  const sellingPrice = META_UTILITY_COST * (1 + form.markupPct / 100) + form.platformFeeInr;
  const gstAmount = sellingPrice * (form.gstPct / 100);
  const totalBilled = sellingPrice + gstAmount + form.serviceChargeInr;
  const profit = sellingPrice - META_UTILITY_COST;
  const margin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-gray-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing Configuration</h1>
          <p className="text-gray-500 text-sm mt-1">Configure WhatsApp messaging markup and charges</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Pricing Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Markup Percentage (%)</Label>
              <Input
                type="number"
                value={form.markupPct}
                onChange={e => setForm(f => ({ ...f, markupPct: Number(e.target.value) }))}
                min={0}
                max={1000}
              />
              <p className="text-xs text-gray-400 mt-1">Applied on top of Meta provider cost</p>
            </div>
            <div>
              <Label>Platform Fee (₹ per conversation)</Label>
              <Input
                type="number"
                value={form.platformFeeInr}
                onChange={e => setForm(f => ({ ...f, platformFeeInr: Number(e.target.value) }))}
                min={0}
                step={0.01}
              />
            </div>
            <div>
              <Label>Service Charge (₹ per invoice)</Label>
              <Input
                type="number"
                value={form.serviceChargeInr}
                onChange={e => setForm(f => ({ ...f, serviceChargeInr: Number(e.target.value) }))}
                min={0}
              />
            </div>
            <div>
              <Label>GST Rate (%)</Label>
              <Input
                type="number"
                value={form.gstPct}
                onChange={e => setForm(f => ({ ...f, gstPct: Number(e.target.value) }))}
                min={0}
                max={100}
                step={0.5}
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Configuration"}
            </Button>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card className="shadow-sm border-2 border-green-100">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4 text-green-600" />
              Live Price Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-gray-500 bg-gray-50 rounded p-3">
              Based on: Meta Utility conversation = ₹{META_UTILITY_COST}/conv (India)
            </div>

            <div className="space-y-2">
              {[
                { label: "Meta Provider Cost", value: `₹${META_UTILITY_COST}`, color: "text-red-600" },
                { label: `Markup (${form.markupPct}%)`, value: `+ ₹${(META_UTILITY_COST * form.markupPct / 100).toFixed(3)}`, color: "text-blue-600" },
                { label: "Platform Fee", value: `+ ₹${form.platformFeeInr.toFixed(2)}`, color: "text-blue-600" },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-gray-600">{r.label}</span>
                  <span className={`font-medium ${r.color}`}>{r.value}</span>
                </div>
              ))}

              <Separator />

              <div className="flex justify-between text-sm font-semibold">
                <span>Selling Price</span>
                <span>₹{sellingPrice.toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">GST ({form.gstPct}%)</span>
                <span>₹{gstAmount.toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Service Charge</span>
                <span>₹{form.serviceChargeInr.toFixed(2)}</span>
              </div>

              <Separator />

              <div className="flex justify-between text-base font-bold">
                <span>Total Billed to School</span>
                <span className="text-emerald-700">₹{totalBilled.toFixed(3)}</span>
              </div>

              <Separator />

              <div className="flex justify-between text-sm font-semibold text-purple-700">
                <span>Gross Profit per Conversation</span>
                <span>₹{profit.toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-purple-700">
                <span>Gross Margin</span>
                <span>{margin.toFixed(1)}%</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
              <p className="text-xs text-emerald-700 font-medium">
                At 5,000 conversations/month per school, estimated profit = ₹{(profit * 5000).toLocaleString("en-IN", { maximumFractionDigits: 0 })} per school
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {config && (
        <p className="text-xs text-gray-400">
          Last updated: {new Date(config.effectiveFrom).toLocaleString("en-IN")}
        </p>
      )}
    </div>
  );
}
