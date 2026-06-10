import { useEffect, useState } from "react";
import { Send, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import * as waApi from "@/services/api/whatsappApi";
import type { WhatsAppTemplate } from "@/services/api/whatsappApi";

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const SAMPLE_PLACEHOLDERS: Record<string, Record<string, string>> = {
  attendance: {
    "{{ParentName}}": "Mr. Ramesh Sharma",
    "{{StudentName}}": "Aarav Sharma",
    "{{Class}}": "Class 5",
    "{{Section}}": "A",
    "{{AttendanceDate}}": "10 Jun 2026",
    "{{SchoolName}}": "Demo School",
  },
  fees: {
    "{{ParentName}}": "Mr. Ramesh Sharma",
    "{{StudentName}}": "Aarav Sharma",
    "{{Amount}}": "₹5,000",
    "{{DueDate}}": "30 Jun 2026",
    "{{AcademicYear}}": "2025-26",
    "{{SchoolName}}": "Demo School",
  },
  exams: {
    "{{StudentName}}": "Aarav Sharma",
    "{{ExamName}}": "Annual Exam 2025-26",
    "{{Class}}": "Class 5",
    "{{ResultSummary}}": "85.5% (Grade A)",
    "{{AcademicYear}}": "2025-26",
    "{{SchoolName}}": "Demo School",
  },
};

export default function WhatsAppTestingConsole() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("+91");
  const [placeholders, setPlaceholders] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [previewText, setPreviewText] = useState("");

  useEffect(() => {
    waApi.getTemplates("Approved").then(setTemplates).catch(() => toast.error("Failed to load templates"));
  }, []);

  const handleTemplateChange = (name: string) => {
    setSelectedTemplate(name);
    setResult(null);
    // Auto-fill sample data based on event category
    const template = templates.find(t => t.name === name);
    if (template?.eventCategory) {
      setPlaceholders(SAMPLE_PLACEHOLDERS[template.eventCategory] ?? {});
    }
  };

  const handleSend = async () => {
    if (!selectedTemplate || !recipientPhone || recipientPhone.length < 10) {
      toast.error("Select a template and enter a valid phone number");
      return;
    }
    try {
      setSending(true);
      setResult(null);
      const res = await waApi.sendTestMessage({
        templateName: selectedTemplate,
        recipientPhone,
        placeholders,
      });
      setResult({ success: true, messageId: res.messageId });
      toast.success("Test message sent successfully");
    } catch (e: unknown) {
      const msg = (e as Error).message ?? "Failed to send test message";
      setResult({ success: false, error: msg });
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const updatePreview = async () => {
    const template = templates.find(t => t.name === selectedTemplate);
    if (!template) return;
    try {
      const preview = await waApi.previewTemplate(template.id, placeholders);
      setPreviewText(preview);
    } catch {
      setPreviewText(template.bodyText);
    }
  };

  useEffect(() => {
    if (selectedTemplate) updatePreview();
  }, [selectedTemplate, placeholders]);

  const template = templates.find(t => t.name === selectedTemplate);
  const allPlaceholders = template
    ? [...template.bodyText.matchAll(/\{\{(\w+)\}\}/g)].map(m => `{{${m[1]}}}`)
    : [];

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Testing Console</h1>
        <p className="text-gray-500 text-sm mt-1">
          Send test messages to verify templates. Test messages are deducted from your quota.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Send Form */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Send Test Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Template</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select approved template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.length === 0 ? (
                    <SelectItem value="none" disabled>No approved templates</SelectItem>
                  ) : templates.map(t => (
                    <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templates.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No approved templates. Submit templates to Meta first.</p>
              )}
            </div>

            <div>
              <Label>Recipient Phone (E.164)</Label>
              <Input
                value={recipientPhone}
                onChange={e => setRecipientPhone(e.target.value)}
                placeholder="+919876543210"
              />
              <p className="text-xs text-gray-400 mt-1">Use your own number for testing</p>
            </div>

            {/* Placeholder Fields */}
            {allPlaceholders.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">Template Variables</Label>
                {allPlaceholders.map(ph => (
                  <div key={ph}>
                    <Label className="text-xs text-gray-500">{ph}</Label>
                    <Input
                      value={placeholders[ph] ?? ""}
                      onChange={e => setPlaceholders(p => ({ ...p, [ph]: e.target.value }))}
                      placeholder={`Value for ${ph}`}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={handleSend}
              disabled={sending || !selectedTemplate}
              className="w-full"
            >
              {sending ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Send Test Message</>
              )}
            </Button>

            {/* Result */}
            {result && (
              <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                result.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
              }`}>
                {result.success
                  ? <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  : <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                }
                <div>
                  {result.success
                    ? <><strong>Message sent!</strong> ID: {result.messageId}</>
                    : <><strong>Failed:</strong> {result.error}</>
                  }
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Message Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-[#e5ddd5] rounded-lg p-4 min-h-32">
                {previewText ? (
                  <div className="bg-[#dcf8c6] rounded-lg p-3 shadow-sm max-w-[85%] ml-auto">
                    {template?.headerType !== "None" && template?.headerValue && (
                      <p className="font-semibold text-sm mb-2 text-gray-800">{template.headerValue}</p>
                    )}
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{previewText}</p>
                    {template?.footerText && (
                      <p className="text-xs text-gray-400 mt-2 border-t border-green-200 pt-2">{template.footerText}</p>
                    )}
                    <p className="text-xs text-gray-400 text-right mt-1">Now ✓</p>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center pt-8">Select a template to preview</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Testing Guide */}
          <Card className="shadow-sm bg-blue-50 border-blue-100">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm font-medium text-blue-800 mb-2">Testing Tips</p>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li>Use your own WhatsApp number as recipient</li>
                <li>Test messages count against your monthly quota</li>
                <li>Check message status in Message History after sending</li>
                <li>Delivery receipts appear after the recipient receives</li>
                <li>Only approved templates can be sent</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
